import base64
import json
import logging
import random
import re
import time
from typing import Dict, Any, List, Optional
import httpx

from app.config import config

logger = logging.getLogger("knowlix.gemma_service")

class GemmaAPIError(Exception):
    """Raised when Gemma 4 through Gemini API returns an error or cannot be reached."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

def extract_json_from_response(text: str) -> Dict[str, Any]:
    """
    Robust JSON parser: handles raw JSON, markdown fences, and models that print
    reasoning/analysis text before (or after) the JSON object.
    """
    cleaned = (text or "").strip()
    candidates = []
    for m in re.finditer(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned):
        candidates.append(m.group(1).strip())
    candidates.append(cleaned)

    decoder = json.JSONDecoder()
    best = None
    for cand in candidates:
        try:
            val = json.loads(cand)
            if isinstance(val, (dict, list)):
                return val
        except json.JSONDecodeError:
            pass
        # Scan every '{' / '[' and keep the largest successfully decoded structure
        for i, ch in enumerate(cand):
            if ch in "{[":
                try:
                    val, end = decoder.raw_decode(cand[i:])
                except json.JSONDecodeError:
                    continue
                if isinstance(val, (dict, list)) and val and (best is None or end > best[1]):
                    best = (val, end)
    if best:
        return best[0]
    raise GemmaAPIError(
        f"Gemma 4 generated a response that could not be parsed as valid JSON. Response excerpt: {cleaned[:200]}...",
        status_code=502
    )

class GemmaService:
    """
    Centralized AI service connecting to Google Gemma 4 (default 'gemma-4-31b-it')
    served through the Gemini API.
    
    Powers:
    - Image-based study material analysis
    - PDF-derived content analysis
    - Summaries and key concepts
    - Quiz generation and evaluation support
    - Flashcard generation
    - "Teach Me What I Missed" targeted remediation
    - Spoken and typed AI Study Assistant conversations
    """
    def __init__(self):
        self.model_name = config.GEMMA_MODEL_NAME
        self.api_base_url = config.GEMMA_API_BASE_URL
        self.license = config.GEMMA_MODEL_LICENSE

    def is_configured(self) -> bool:
        """Returns True if the backend has a configured Gemini API key."""
        return bool(config.GEMINI_API_KEY and config.GEMINI_API_KEY.strip())

    async def _call_gemini_api(
        self,
        prompt: str,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        require_json: bool = True
    ) -> str:
        """Calls the primary Gemma model with retries, then each fallback Gemma model."""
        import asyncio
        models = [self.model_name] + [m.strip() for m in (config.GEMMA_FALLBACK_MODELS or "").split(",") if m.strip() and m.strip() != self.model_name]
        last_err = None
        for model in models:
            for attempt in range(2):
                t0 = time.time()
                try:
                    out = await self._call_model(model, prompt, image_bytes, mime_type, require_json)
                    logger.info(f"Gemma call OK: model={model} took {time.time()-t0:.1f}s")
                    return out
                except GemmaAPIError as e:
                    last_err = e
                    logger.warning(f"Gemma call failed: model={model} status={e.status_code} after {time.time()-t0:.1f}s")
                    # retry once on quick server errors; never re-wait after a timeout (504)
                    if e.status_code in (500, 502, 503, 429) and attempt < 1:
                        await asyncio.sleep(1.5)
                        continue
                    break  # non-retryable here -> try next model
            logger.warning(f"Model '{model}' failed ({last_err.message[:120]}); trying next model if any.")
            if last_err and last_err.status_code in (401, 403) :
                break
        raise last_err

    async def _call_model(
        self,
        model: str,
        prompt: str,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        require_json: bool = True
    ) -> str:
        """
        Executes an asynchronous call to the Gemini API endpoint serving the configured Gemma 4 model.
        Does NOT fall back to any proprietary Gemini model (e.g. Gemini 1.5/2.0).
        """
        if not self.is_configured():
            raise GemmaAPIError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend environment (.env) "
                f"to access the '{model}' open-weight study engine.",
                status_code=503
            )

        endpoint_url = f"{self.api_base_url}/models/{model}:generateContent?key={config.GEMINI_API_KEY}"

        parts: List[Dict[str, Any]] = [{"text": prompt}]
        if image_bytes:
            b64_data = base64.b64encode(image_bytes).decode("utf-8")
            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": b64_data
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.9,
                "maxOutputTokens": 8192,
                # Gemma 4 is a reasoning model; minimal thinking = much faster, and no reasoning text in the reply
                "thinkingConfig": {"thinkingLevel": "minimal"}
            }
        }
        if require_json:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        try:
            async with httpx.AsyncClient(timeout=75.0) as client:
                response = await client.post(endpoint_url, json=payload)
                # Gemma models served via the Gemini API may reject JSON mode
                # (responseMimeType). Retry once without it; the prompt already
                # demands strict JSON and extract_json_from_response() parses it.
                if response.status_code == 400 and "thinking" in response.text.lower():
                    payload["generationConfig"].pop("thinkingConfig", None)
                    response = await client.post(endpoint_url, json=payload)
                if response.status_code == 400 and require_json and "responseMimeType" in json.dumps(payload):
                    low = response.text.lower()
                    if "json" in low or "mime" in low:
                        payload["generationConfig"].pop("responseMimeType", None)
                        response = await client.post(endpoint_url, json=payload)
        except httpx.TimeoutException:
            raise GemmaAPIError(
                f"Request to Gemma 4 model '{model}' via Gemini API timed out after 60 seconds.",
                status_code=504
            )
        except httpx.RequestError as exc:
            raise GemmaAPIError(
                f"Failed to communicate with Gemma 4 Gemini API endpoint: {str(exc)}",
                status_code=503
            )

        if response.status_code == 429:
            raise GemmaAPIError(
                f"Gemma 4 model '{model}' rate limit exceeded on Gemini API. Please wait a moment and try again.",
                status_code=429
            )
        elif response.status_code == 404:
            raise GemmaAPIError(
                f"Gemma 4 model identifier '{model}' was not found at {self.api_base_url}. "
                "Verify GEMMA_MODEL_NAME in your configuration.",
                status_code=404
            )
        elif response.status_code == 403 or response.status_code == 400:
            error_msg = response.text
            try:
                err_json = response.json()
                error_msg = err_json.get("error", {}).get("message", error_msg)
            except Exception:
                pass
            raise GemmaAPIError(
                f"Gemini API returned HTTP {response.status_code} for Gemma 4 ({model}): {error_msg}",
                status_code=response.status_code
            )
        elif response.status_code != 200:
            raise GemmaAPIError(
                f"Gemma 4 inference failed with status {response.status_code}: {response.text[:300]}",
                status_code=response.status_code
            )

        resp_json = response.json()
        try:
            candidate = resp_json["candidates"][0]
            parts_out = candidate["content"]["parts"]
            # Skip "thought" parts (the model's reasoning); keep only the answer text
            answer = "".join(p_.get("text", "") for p_ in parts_out if not p_.get("thought")) 
            return answer or parts_out[-1].get("text", "")
        except (KeyError, IndexError) as err:
            raise GemmaAPIError(
                f"Unexpected response structure from Gemma 4 API: {str(err)}",
                status_code=502,
                details=resp_json
            )

    async def analyze_notes(
        self,
        image_bytes: bytes,
        filename: str = "notes.jpg",
        subject: Optional[str] = "",
        topic: Optional[str] = "",
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Analyzes uploaded photo/scan of study notes using Gemma 4 via Gemini API.
        """
        start_time = time.time()
        prompt = (
            "You are Knowlix AI, an elite educational tutor powered by Gemma 4. "
            "Analyze the attached photo of study notes, textbook page, or diagram.\n"
            "Identify the subject and specific academic topic. "
            "Transcribe legible text and equations verbatim. "
            "Formulate a concise 2-4 sentence conceptual summary. "
            "Extract 3-5 core concepts. "
            "Provide 3-5 key definitions with importance rating (Critical, High, Medium). "
            "Extract 3 main takeaways. "
            "Explicitly list any unclear, faint, smudged, or ambiguous sections rather than hallucinating.\n\n"
            f"User Subject Hint: '{subject or ''}'. User Topic Hint: '{topic or ''}'.\n"
            "Return strictly valid JSON matching this schema:\n"
            "{\n"
            '  "subject": "string",\n'
            '  "topic": "string",\n'
            '  "extracted_text": "string",\n'
            '  "summary": "string",\n'
            '  "key_concepts": ["string"],\n'
            '  "definitions": [{"term": "string", "definition": "string", "importance": "string"}],\n'
            '  "takeaways": ["string"],\n'
            '  "unclear_sections": ["string"]\n'
            "}"
        )

        raw_response = await self._call_gemini_api(
            prompt=prompt,
            image_bytes=image_bytes,
            mime_type=mime_type,
            require_json=True
        )
        parsed = extract_json_from_response(raw_response)
        latency = int((time.time() - start_time) * 1000)

        parsed["model_meta"] = {
            "provider": "Google Gemini API (Gemma 4 Engine)",
            "model_name": self.model_name,
            "license": self.license,
            "is_open_weight": True,
            "latency_ms": latency,
            "mode": "live-gemma4-gemini-api"
        }
        return parsed

    async def analyze_document_text(
        self,
        extracted_text: str,
        filename: str,
        subject: Optional[str] = "",
        topic: Optional[str] = "",
        document_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes extracted PDF text using Gemma 4 via Gemini API.
        """
        start_time = time.time()
        prompt = (
            "You are Knowlix AI, an elite academic tutor powered by Gemma 4. "
            "Analyze ONLY the following study material extracted from a student's PDF document. Do not substitute any other topic and do not use outside examples that are not in the text.\n"
            "Do NOT repeat the document text in your answer. Be concise. Synthesize a clear conceptual summary, extract core concepts, definitions, "
            "and main takeaways. Flag any unclear or low-confidence sections.\n\n"
            f"Filename: {filename}\n"
            f"User Subject Hint: '{subject or ''}'\n"
            f"User Topic Hint: '{topic or ''}'\n\n"
            f"Document Text Content:\n{extracted_text[:14000]}\n\n"
            "Return strictly valid JSON matching this schema:\n"
            "{\n"
            '  "subject": "string",\n'
            '  "topic": "string",\n'
            '  "summary": "string",\n'
            '  "key_concepts": ["string"],\n'
            '  "definitions": [{"term": "string", "definition": "string", "importance": "string"}],\n'
            '  "takeaways": ["string"],\n'
            '  "unclear_sections": ["string"]\n'
            "}"
        )

        raw_response = await self._call_gemini_api(prompt=prompt, require_json=True)
        parsed = extract_json_from_response(raw_response)
        latency = int((time.time() - start_time) * 1000)

        # Always keep the genuine extracted PDF text (the model may shorten/omit it);
        # quiz, flashcards and the study assistant are grounded on this field.
        parsed["extracted_text"] = extracted_text
        unclear = parsed.get("unclear_sections", [])
        if document_meta and document_meta.get("scanned_pages_count", 0) > 0:
            unclear.append(f"{document_meta['scanned_pages_count']} scanned page(s) were preprocessed via OCR.")

        parsed["unclear_sections"] = unclear
        parsed["model_meta"] = {
            "provider": "Google Gemini API (Gemma 4 Engine)",
            "model_name": self.model_name,
            "license": self.license,
            "is_open_weight": True,
            "latency_ms": latency,
            "mode": "live-gemma4-gemini-api"
        }
        return parsed

    async def generate_quiz(
        self,
        study_data: Dict[str, Any],
        difficulty: str = "medium",
        quiz_length: int = 5,
        previous_questions: Optional[List[str]] = None,
        question_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Dynamically generates high-quality quiz questions strictly grounded in the study material using Gemma 4.
        Varies question wording, concepts, scenarios, difficulty, and answer-option order.
        Strictly minimizes repeating previously served questions across consecutive attempts.
        """
        quiz_len = max(3, min(15, quiz_length or 5))
        diff_str = difficulty.lower() if difficulty in ["easy", "medium", "hard"] else "medium"
        q_types = question_types or ["mcq"]

        # Build difficulty guidance for Gemma 4
        if diff_str == "easy":
            diff_instructions = (
                "Difficulty Level: FOUNDATIONAL / EASY.\n"
                "Focus on direct conceptual definitions, foundational terminology, clear distinctions, and straightforward recognition of core facts."
            )
        elif diff_str == "hard":
            diff_instructions = (
                "Difficulty Level: ADVANCED / CHALLENGING.\n"
                "Focus on complex multi-step reasoning, experimental scenarios, boundary conditions, subtle distinctions between plausible distractors, and cross-concept synthesis."
            )
        else:
            diff_instructions = (
                "Difficulty Level: STANDARD / INTERMEDIATE.\n"
                "Focus on core mechanisms, cause-and-effect relationships, process sequences, and application of principles."
            )

        # Build format guidance
        type_instructions = []
        if "true_false" in q_types:
            type_instructions.append("Include True/False conceptual verification questions (2 options: 'True', 'False').")
        if "scenario" in q_types:
            type_instructions.append("Include applied real-world problem scenarios or case study questions with 4 options.")
        if "mcq" in q_types or not type_instructions:
            type_instructions.append("Include standard 4-option conceptual multiple-choice questions.")
        type_str = " ".join(type_instructions)

        # Build exclusion instructions for previously answered questions
        exclusion_prompt = ""
        if previous_questions and len(previous_questions) > 0:
            cleaned_previous = [q.strip() for q in previous_questions[:25] if q and q.strip()]
            if cleaned_previous:
                exclusion_prompt = (
                    "\n\nCRITICAL DIVERSITY REQUIREMENT (AVOID DUPLICATES):\n"
                    "The student has ALREADY been tested on the following questions in previous attempts. "
                    "You MUST NOT repeat or trivially rephrase any of these questions:\n"
                    + "\n".join(f"- {pq}" for pq in cleaned_previous[:15])
                    + "\nCreate entirely new questions exploring different angles, untested details, alternative definitions, or specific applications."
                )

        prompt = (
            f"You are Knowlix AI Dynamic Quiz Generator powered by Gemma 4.\n"
            f"Generate exactly {quiz_len} high-quality, scientifically accurate questions grounded STRICTLY in the provided study material.\n"
            f"{diff_instructions}\n"
            f"Question Formats: {type_str}\n"
            f"{exclusion_prompt}\n\n"
            f"Subject: {study_data.get('subject', 'General')}\n"
            f"Topic: {study_data.get('topic', 'Topic')}\n"
            f"Summary: {study_data.get('summary', '')}\n"
            f"Key Concepts: {json.dumps(study_data.get('key_concepts', []))}\n"
            f"Definitions: {json.dumps(study_data.get('definitions', []))}\n"
            f"Extracted Text Excerpt: {study_data.get('extracted_text', '')[:4500]}\n\n"
            "Requirements for Each Question:\n"
            "1. Must have unambiguous, factually true answers verifiable directly against the notes.\n"
            "2. Options must be plausible distractors that test common student misconceptions.\n"
            "3. The 'correct_answer' MUST EXACTLY match one of the items inside the 'options' list.\n"
            "4. Provide a thorough, encouraging explanation explaining why the correct answer is right and why others are wrong.\n"
            "5. Explicitly specify the tested 'concept' and exact 'source_evidence' quotation.\n"
            "6. Set 'question_type' to 'mcq', 'true_false', or 'scenario'. Set 'difficulty' to '" + diff_str + "'.\n\n"
            "Return strictly valid JSON matching this schema:\n"
            "{\n"
            '  "questions": [\n'
            "    {\n"
            '      "id": 1,\n'
            '      "question": "string",\n'
            '      "options": ["string", "string", "string", "string"],\n'
            '      "correct_answer": "string",\n'
            '      "explanation": "string",\n'
            '      "concept": "string",\n'
            '      "source_evidence": "string",\n'
            '      "question_type": "string",\n'
            '      "difficulty": "string"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        raw = await self._call_gemini_api(prompt=prompt, require_json=True)
        parsed = extract_json_from_response(raw)
        questions = parsed.get("questions", [])
        if not questions and isinstance(parsed, list):
            questions = parsed

        # Validate, normalize, and shuffle options
        validated_questions = []
        for idx, q in enumerate(questions):
            q_text = q.get("question", "").strip()
            raw_options = q.get("options", [])
            corr_ans = q.get("correct_answer", "").strip()

            if not q_text or not raw_options:
                continue

            # Ensure clean strings in options
            options = [str(opt).strip() for opt in raw_options if str(opt).strip()]
            # Deduplicate options while preserving order
            seen_opts = set()
            unique_opts = []
            for opt in options:
                if opt.lower() not in seen_opts:
                    seen_opts.add(opt.lower())
                    unique_opts.append(opt)
            options = unique_opts

            # If correct answer is not in options, fix it
            if corr_ans not in options:
                # Check for loose match (e.g. "A) text" vs "text")
                matched = next((opt for opt in options if opt.lower() in corr_ans.lower() or corr_ans.lower() in opt.lower()), None)
                if matched:
                    corr_ans = matched
                else:
                    options.append(corr_ans)

            # Shuffle options to eliminate positional bias, while preserving exact correct answer string
            if len(options) > 1 and q.get("question_type") != "true_false":
                random.shuffle(options)

            validated_questions.append({
                "id": idx + 1,
                "question": q_text,
                "options": options,
                "correct_answer": corr_ans,
                "explanation": q.get("explanation", f"Grounded in notes on {q.get('concept', 'the topic')}."),
                "concept": q.get("concept", study_data.get("topic", "Core Concept")),
                "source_evidence": q.get("source_evidence", study_data.get("summary", "")[:120]),
                "question_type": q.get("question_type", "mcq" if len(options) > 2 else "true_false"),
                "difficulty": q.get("difficulty", diff_str)
            })

        return validated_questions

    async def generate_flashcards(self, study_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generates 5 spaced repetition flashcards using Gemma 4.
        """
        prompt = (
            "You are Knowlix AI Flashcard Generator powered by Gemma 4. "
            "Create 5 spaced-repetition flashcards covering the core principles, definitions, and mechanisms from the material.\n\n"
            f"Topic: {study_data.get('topic')}\n"
            f"Summary: {study_data.get('summary')}\n"
            f"Definitions: {json.dumps(study_data.get('definitions', []))}\n\n"
            "Return strictly valid JSON matching this schema:\n"
            "{\n"
            '  "flashcards": [\n'
            "    {\n"
            '      "id": 1,\n'
            '      "question": "string",\n'
            '      "answer": "string",\n'
            '      "concept": "string",\n'
            '      "mastery_hint": "string"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        raw = await self._call_gemini_api(prompt=prompt, require_json=True)
        parsed = extract_json_from_response(raw)
        cards = parsed.get("flashcards", [])
        if not cards and isinstance(parsed, list):
            cards = parsed
        return cards

    async def generate_teach_missed(
        self,
        concept: str,
        original_question: str,
        student_answer: str,
        correct_answer: str,
        simplification_level: str = "beginner"
    ) -> Dict[str, Any]:
        """
        Signature feature: 'Teach Me What I Missed' coaching via Gemma 4.
        """
        prompt = (
            "You are Knowlix AI's personalized revision coach powered by Gemma 4. "
            "A student answered a quiz question incorrectly.\n"
            f"Tested Concept: {concept}\n"
            f"Original Question: {original_question}\n"
            f"Student's Incorrect Selection: {student_answer}\n"
            f"Correct Answer: {correct_answer}\n"
            f"Requested Simplification Level: {simplification_level} (options: 'beginner', 'eli5', 'analogy')\n\n"
            "Generate:\n"
            "1. A simplified explanation suited to the requested level (use vivid everyday analogies if ELI5/analogy).\n"
            "2. A concrete real-world example.\n"
            "3. A key breakthrough insight explaining why the student's answer was tricky and what the difference is.\n"
            "4. A new targeted follow-up question testing the concept from a fresh angle with 4 options and an expected answer.\n\n"
            "Return strictly valid JSON matching this schema:\n"
            "{\n"
            '  "concept": "' + concept + '",\n'
            '  "simpler_explanation": "string",\n'
            '  "real_world_example": "string",\n'
            '  "key_breakthrough_insight": "string",\n'
            '  "practice_question": {\n'
            '    "id": "retry-1",\n'
            '    "question": "string",\n'
            '    "options": ["string", "string", "string", "string"],\n'
            '    "expected_answer": "string",\n'
            '    "concept": "' + concept + '"\n'
            "  },\n"
            '  "current_mastery": "Needs Practice"\n'
            "}"
        )

        raw = await self._call_gemini_api(prompt=prompt, require_json=True)
        return extract_json_from_response(raw)

    async def answer_study_question(
        self,
        question: str,
        study_context: Dict[str, Any],
        is_voice: bool = False,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Conversational AI Study Assistant answering spoken or typed questions grounded in notes.
        """
        topic = study_context.get("topic", "Study Notes")
        subject = study_context.get("subject", "Academic Material")
        summary = study_context.get("summary", "")
        extracted_text = study_context.get("extracted_text", "")

        prompt = (
            "You are Knowlix AI Study Assistant, an expert, encouraging academic tutor powered by Gemma 4.\n"
            f"Subject: {subject}. Topic: {topic}.\n"
            f"Student Question ({'Voice input' if is_voice else 'Typed input'}): {question}\n\n"
            f"Reference Study Summary:\n{summary}\n\n"
            f"Reference Notes Source:\n{extracted_text[:4000]}\n\n"
            "Provide a clear, engaging, conversational response grounded in the reference material. "
            "Cite key definitions or sections from the notes. "
            "Suggest a helpful follow-up question to solidify understanding."
        )

        raw_answer = await self._call_gemini_api(prompt=prompt, require_json=False)
        return {
            "answer": raw_answer.strip(),
            "source_citations": [f"{topic} (Gemma 4 grounded context)"],
            "related_concepts": study_context.get("key_concepts", [])[:3],
            "is_voice": is_voice,
            "language": language,
            "model_used": f"{self.model_name} (Gemini API)"
        }

gemma_service = GemmaService()
