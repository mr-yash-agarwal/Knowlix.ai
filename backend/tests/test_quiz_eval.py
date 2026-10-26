import asyncio
from app.models import QuizQuestion, StudentAnswerSubmission
from app.services.quiz_evaluator import QuizEvaluator

def test_quiz_scoring_exact_evaluation():
    async def _test():
        evaluator = QuizEvaluator()
        questions = [
            QuizQuestion(
                id=1,
                question="What is 2+2?",
                options=["3", "4", "5", "6"],
                correct_answer="4",
                explanation="Basic arithmetic",
                concept="Addition",
                source_evidence="Math book page 1"
            ),
            QuizQuestion(
                id=2,
                question="What is the capital of France?",
                options=["London", "Berlin", "Paris", "Madrid"],
                correct_answer="Paris",
                explanation="Paris is France's capital",
                concept="Geography",
                source_evidence="Geography notes"
            )
        ]

        # Student answers 1 correctly, 1 incorrectly
        submissions = [
            StudentAnswerSubmission(question_id=1, selected_option="4"),       # Correct
            StudentAnswerSubmission(question_id=2, selected_option="London"),  # Incorrect
        ]

        result = await evaluator.evaluate_submission(
            session_id="test-session-123",
            student_answers=submissions,
            quiz_items=questions
        )

        assert result.total_questions == 2
        assert result.correct_count == 1
        assert result.score_percentage == 50
        assert not result.is_perfect
        assert len(result.missed_concepts) == 1
        
        missed = result.missed_concepts[0]
        assert missed.concept == "Geography"
        assert missed.student_answer == "London"
        assert missed.correct_answer == "Paris"
        assert "London" in missed.why_incorrect
        assert missed.mastery_status == "Needs Practice"
        assert missed.practice_question is not None

    asyncio.run(_test())

def test_perfect_quiz_score():
    async def _test():
        evaluator = QuizEvaluator()
        questions = [
            QuizQuestion(
                id=1,
                question="Which organelle conducts photosynthesis?",
                options=["Chloroplast", "Mitochondria", "Ribosome", "Nucleus"],
                correct_answer="Chloroplast",
                explanation="Chloroplasts contain chlorophyll",
                concept="Cell Biology",
                source_evidence="Biology notes"
            )
        ]
        submissions = [
            StudentAnswerSubmission(question_id=1, selected_option="Chloroplast")
        ]
        result = await evaluator.evaluate_submission(
            session_id="perfect-test-session",
            student_answers=submissions,
            quiz_items=questions
        )

        assert result.score_percentage == 100
        assert result.is_perfect
        assert len(result.missed_concepts) == 0
        assert "Outstanding mastery" in result.encouragement_note

    asyncio.run(_test())
