import os
from dotenv import load_dotenv
import google.generativeai as genai
import time

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_question(grade, subject, topic=None, difficulty=1):
    # Map difficulty to text
    if difficulty == 1:
        diff_text = "easy"
    elif difficulty == 2:
        diff_text = "medium"
    else:
        diff_text = "hard"

    if topic:
        prompt = f"""You are a Math Learning Assistant. Generate a Class {grade} level {subject} question about {topic}.

        The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question.

        The question should be clearly mathematical in nature and suitable for educational practice."""
    else:
        prompt = f"""You are a Math Learning Assistant. Generate a Class {grade} level {subject} question.

        The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question.

        The question should be clearly mathematical in nature and suitable for educational practice."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

def evaluate_answer(question, user_answer):
    prompt = f"""Here is the question: "{question}"
    The student answered: "{user_answer}"

    Evaluate the answer using this format:
    - Start with "Correct!" or "Incorrect."
    - If incorrect, say "That's okay, let's work through it step by step."
    - Break your explanation into clear paragraphs with line breaks
    - Use step-by-step format with proper spacing
    - End with a clear summary using ✅ symbol
    - Be encouraging and supportive

    Format your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

def answer_direct_question(question, grade, subject, topic=None):
    # Quick check for obviously non-math inputs
    question_clean = question.strip().lower()
    if (len(question_clean) <= 3 or
        question_clean in ['hi', 'hello', 'hey', 'ui', 'aap', 'ok', 'yes', 'no'] or
        not any(char.isalpha() for char in question_clean)):
        return """Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?

Here's how we can proceed:
• I can generate practice questions for your grade level
• I can help solve math problems step-by-step
• I can explain math concepts and formulas
• I can evaluate your answers and provide feedback

What math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"""

    context = f"You are a Math Learning Assistant helping a Class {grade} student with {subject}"
    if topic:
        context += f" specifically about {topic}"

    prompt = f"""{context}.

    The student asks: "{question}"

    IMPORTANT: You are ONLY a Math Learning Assistant. Follow these rules STRICTLY:

    1. FIRST, check if the question is a proper mathematics question. A math question should:
       - Ask about mathematical concepts, formulas, or calculations
       - Contain mathematical terms or symbols
       - Be a complete, meaningful question about math
       - NOT be random letters, single words, or nonsensical text

    2. If the input is NOT a proper math question (including random text like "ui", "aap", "hello", single letters, incomplete sentences, non-math topics like history/science/literature, personal questions, general chat, etc.), respond EXACTLY like this:

    "Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?

    Here's how we can proceed:
    • I can generate practice questions for your grade level
    • I can help solve math problems step-by-step
    • I can explain math concepts and formulas
    • I can evaluate your answers and provide feedback

    What math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"

    3. If it IS a math question, provide a clear, step-by-step explanation using this format:
    - Break your response into clear paragraphs with line breaks
    - Use step-by-step approach with proper spacing between steps
    - If it's a calculation, show each step on a new line
    - Use clear headings or bullet points when helpful
    - End with a clear summary using ✅ symbol
    - Keep explanations appropriate for their grade level
    - Use examples when helpful

    Format your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

# Streaming versions of the functions
def generate_question_stream(grade, subject, topic=None, difficulty=1):
    # Map difficulty to text
    if difficulty == 1:
        diff_text = "easy"
    elif difficulty == 2:
        diff_text = "medium"
    else:
        diff_text = "hard"

    if topic:
        prompt = f"Ask a Class {grade} level {subject} question about {topic}. The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question."
    else:
        prompt = f"Ask a Class {grade} level {subject} question. The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question."

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text

def evaluate_answer_stream(question, user_answer):
    """Evaluate answer with streaming response"""
    prompt = f"""Here is the question: "{question}"
    The student answered: "{user_answer}"

    Evaluate the answer using this format:
    - Start with "Correct!" or "Incorrect."
    - If incorrect, say "That's okay, let's work through it step by step."
    - Break your explanation into clear paragraphs with line breaks
    - Use step-by-step format with proper spacing
    - End with a clear summary using ✅ symbol
    - Be encouraging and supportive

    Format your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text

def answer_direct_question_stream(question, grade, subject, topic=None):
    """Answer direct question with streaming response"""
    # Quick check for obviously non-math inputs
    question_clean = question.strip().lower()
    if (len(question_clean) <= 3 or
        question_clean in ['hi', 'hello', 'hey', 'ui', 'aap', 'ok', 'yes', 'no'] or
        not any(char.isalpha() for char in question_clean)):
        # Return the redirection message as a single chunk
        redirection_message = """Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?

Here's how we can proceed:
• I can generate practice questions for your grade level
• I can help solve math problems step-by-step
• I can explain math concepts and formulas
• I can evaluate your answers and provide feedback

What math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"""
        yield redirection_message
        return

    context = f"You are a Math Learning Assistant helping a Class {grade} student with {subject}"
    if topic:
        context += f" specifically about {topic}"

    prompt = f"""{context}.

    The student asks: "{question}"

    IMPORTANT: You are ONLY a Math Learning Assistant. Follow these rules STRICTLY:

    1. FIRST, check if the question is a proper mathematics question. A math question should:
       - Ask about mathematical concepts, formulas, or calculations
       - Contain mathematical terms or symbols
       - Be a complete, meaningful question about math
       - NOT be random letters, single words, or nonsensical text

    2. If the input is NOT a proper math question (including random text like "ui", "aap", "hello", single letters, incomplete sentences, non-math topics like history/science/literature, personal questions, general chat, etc.), respond EXACTLY like this:

    "Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?

    Here's how we can proceed:
    • I can generate practice questions for your grade level
    • I can help solve math problems step-by-step
    • I can explain math concepts and formulas
    • I can evaluate your answers and provide feedback

    What math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"

    3. If it IS a math question, provide a clear, step-by-step explanation using this format:
    - Break your response into clear paragraphs with line breaks
    - Use step-by-step approach with proper spacing between steps
    - If it's a calculation, show each step on a new line
    - Use clear headings or bullet points when helpful
    - End with a clear summary using ✅ symbol
    - Keep explanations appropriate for their grade level
    - Use examples when helpful

    Format your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)

    for chunk in response:
        if chunk.text:
            yield chunk.text
