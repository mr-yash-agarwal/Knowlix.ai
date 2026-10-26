import logging
from typing import List, Dict, Any, Optional
from app.models import (
    QuizQuestion, StudentAnswerSubmission, SubmitQuizResponse,
    MissedConceptReport, FollowupQuestion, ConceptMasteryOverview
)
from app.services.model_service import model_service
from app.database import (
    update_quiz_result, record_concept_mastery, get_session,
    update_quiz_attempt_result, get_quiz_attempts
)

logger = logging.getLogger("knowlix.quiz_evaluator")

class QuizEvaluator:
    async def evaluate_submission(
        self,
        session_id: str,
        student_answers: List[StudentAnswerSubmission],
        quiz_items: Optional[List[QuizQuestion]] = None,
        attempt_id: Optional[str] = None,
        difficulty: Optional[str] = "medium"
    ) -> SubmitQuizResponse:
        """
        Evaluates student submissions against trusted server answer key.
        Maps incorrect answers to concepts, and generates Teach Me What I Missed packs.
        """
        # 1. Retrieve trusted quiz questions from database or provided validated items
        trusted_questions: List[QuizQuestion] = []
        if quiz_items and len(quiz_items) > 0:
            trusted_questions = quiz_items
        else:
            db_session = get_session(session_id)
            if db_session and db_session.get("quiz"):
                trusted_questions = [QuizQuestion(**q) for q in db_session["quiz"]]
        
        if not trusted_questions:
            raise ValueError(f"No trusted quiz questions found for session ID: {session_id}")

        # Index trusted questions by question ID
        q_map: Dict[int, QuizQuestion] = {q.id: q for q in trusted_questions}
        
        correct_count = 0
        total_questions = len(trusted_questions)
        missed_reports: List[MissedConceptReport] = []
        concept_stats: Dict[str, Dict[str, int]] = {}

        # Evaluate each question
        for submission in student_answers:
            q = q_map.get(submission.question_id)
            if not q:
                continue

            concept = q.concept
            if concept not in concept_stats:
                concept_stats[concept] = {"total": 0, "correct": 0}
            concept_stats[concept]["total"] += 1

            is_correct = submission.selected_option.strip().lower() == q.correct_answer.strip().lower()

            if is_correct:
                correct_count += 1
                concept_stats[concept]["correct"] += 1
                record_concept_mastery(session_id, concept, "Mastered", is_correct_attempt=True)
            else:
                # Student missed this question -> generate Teach Me What I Missed payload
                record_concept_mastery(session_id, concept, "Needs Practice", is_correct_attempt=False)
                
                teach_data = await model_service.generate_teach_missed(
                    concept=concept,
                    original_question=q.question,
                    student_answer=submission.selected_option,
                    correct_answer=q.correct_answer,
                    simplification_level="beginner"
                )
                
                practice_q = FollowupQuestion(**teach_data["practice_question"])
                
                missed_reports.append(MissedConceptReport(
                    concept=concept,
                    original_question_id=q.id,
                    original_question=q.question,
                    student_answer=submission.selected_option,
                    correct_answer=q.correct_answer,
                    why_incorrect=teach_data["why_incorrect"],
                    simple_explanation=teach_data["simpler_explanation"],
                    real_world_example=teach_data["real_world_example"],
                    practice_question=practice_q,
                    mastery_status="Needs Practice",
                    attempts_count=1
                ))

        score_percentage = int(round((correct_count / total_questions) * 100)) if total_questions > 0 else 0
        is_perfect = (correct_count == total_questions)

        # Build concept mastery breakdown
        breakdown: List[ConceptMasteryOverview] = []
        for c_name, stats in concept_stats.items():
            acc = int(round((stats["correct"] / stats["total"]) * 100)) if stats["total"] > 0 else 0
            status = "Mastered" if acc == 100 else ("Improving" if acc >= 50 else "Needs Practice")
            breakdown.append(ConceptMasteryOverview(
                concept=c_name,
                status=status,
                accuracy_percentage=acc
            ))

        # Encouragement note
        if is_perfect:
            encouragement = "Outstanding mastery! You got every question right on the first try. Ready to test yourself with a challenge round?"
        elif score_percentage >= 70:
            encouragement = f"Great work! You scored {score_percentage}%. You have a strong foundation—let's master the couple of concepts you missed below!"
        else:
            encouragement = f"You scored {score_percentage}%. Mistakes are where the deepest learning happens! Explore 'Teach Me What I Missed' below to turn every weak spot into a strength."

        # Persist score in database session record
        try:
            update_quiz_result(session_id, correct_count, total_questions)
        except Exception as e:
            logger.error(f"Failed to update quiz result in DB: {e}")

        # Persist detailed attempt record in quiz_attempts table
        effective_attempt_id = attempt_id
        attempt_number = 1
        try:
            if not effective_attempt_id:
                recent_attempts = get_quiz_attempts(session_id)
                if recent_attempts:
                    effective_attempt_id = recent_attempts[0]["id"]
                    attempt_number = recent_attempts[0]["attempt_number"]
            if effective_attempt_id:
                ans_dict = {str(a.question_id): a.selected_option for a in student_answers}
                review_dict = {
                    "score_percentage": score_percentage,
                    "is_perfect": is_perfect,
                    "correct_count": correct_count,
                    "total_questions": total_questions,
                    "concept_breakdown": [c.model_dump() for c in breakdown],
                    "missed_concepts": [m.model_dump() for m in missed_reports],
                    "encouragement_note": encouragement
                }
                update_quiz_attempt_result(
                    attempt_id=effective_attempt_id,
                    score=correct_count,
                    total_questions=total_questions,
                    score_percentage=score_percentage,
                    is_perfect=is_perfect,
                    student_answers=[a.model_dump() for a in student_answers],
                    review_data=review_dict
                )
        except Exception as e:
            logger.error(f"Failed to update detailed quiz attempt in DB: {e}")

        return SubmitQuizResponse(
            session_id=session_id,
            attempt_id=effective_attempt_id,
            attempt_number=attempt_number,
            difficulty=difficulty or "medium",
            is_fresh=True,
            total_questions=total_questions,
            correct_count=correct_count,
            score_percentage=score_percentage,
            is_perfect=is_perfect,
            concept_breakdown=breakdown,
            missed_concepts=missed_reports,
            encouragement_note=encouragement
        )

quiz_evaluator = QuizEvaluator()
