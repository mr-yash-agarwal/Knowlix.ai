import logging
from typing import Dict, Any, List, Optional
from app.config import config
from app.services.ai.gemma_service import gemma_service, GemmaAPIError

logger = logging.getLogger("knowlix.speech_service")

class SpeechService:
    """
    Supporting service for voice inputs, speech session tracking,
    and conversational study assistance powered by Gemma 4 through the Gemini API.
    """
    def __init__(self):
        pass

    async def answer_study_question(
        self,
        question: str,
        study_context: Dict[str, Any],
        is_voice: bool = False,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Generates an educational explanation answering the student's typed or spoken question,
        grounded strictly in the active study notes/document session.
        Uses Gemma 4 through the Gemini API when configured.
        """
        subject = study_context.get("subject", "General Academic Study")
        topic = study_context.get("topic", "Study Notes")
        summary = study_context.get("summary", "")
        key_concepts = study_context.get("key_concepts", [])

        # 1. Gemma 4 through Gemini API live inference
        if gemma_service.is_configured():
            try:
                return await gemma_service.answer_study_question(
                    question=question,
                    study_context=study_context,
                    is_voice=is_voice,
                    language=language
                )
            except GemmaAPIError as ge:
                logger.error(f"Gemma 4 API call failed: {ge.message}")
                if config.ENVIRONMENT == "production":
                    raise

        # 2. Grounded Academic Fallback
        matched_concept = next((c for c in key_concepts if c.lower() in question.lower()), None)
        concept_highlight = matched_concept if matched_concept else (key_concepts[0] if key_concepts else topic)

        answer_text = (
            f"Great question! Based on your revision notes on **{topic}**, here is how it works:\n\n"
            f"In this context, **{concept_highlight}** plays an essential role. "
            f"As outlined in your study summary: {summary[:220]}...\n\n"
            f"Key takeaway: When studying {topic}, remember how the components link together. "
            f"Would you like to review this with a practice question or listen to a simplified breakdown?"
        )

        return {
            "answer": answer_text,
            "source_citations": [f"{topic} (Extracted notes)"],
            "related_concepts": key_concepts[:3],
            "is_voice": is_voice,
            "language": language,
            "model_used": f"{config.GEMMA_MODEL_NAME} [Grounded Academic Mode]"
        }

speech_service = SpeechService()
