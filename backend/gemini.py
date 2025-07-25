import os
from dotenv import load_dotenv
import google.generativeai as genai
import time
import re

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def extract_number(user_input):
    """Extract the first number (integer or decimal) from the input string."""
    match = re.search(r'[-+]?[0-9]*\.?[0-9]+', str(user_input))
    if match:
        return float(match.group())
    return None

def is_correct_answer(user_input, correct_answer):
    user_value = extract_number(user_input)
    if user_value is None:
        return False
    try:
        correct_value = float(correct_answer)
    except Exception:
        return False
    return abs(user_value - correct_value) < 1e-6

def generate_question(grade, subject, topic=None, difficulty=1, language="English"):
    # Map difficulty to text
    if difficulty == 1:
        diff_text = "easy"
    elif difficulty == 2:
        diff_text = "medium"
    else:
        diff_text = "hard"

    lang_instruction = "Ask the question in English." if language == "English" else "सवाल हिंदी में पूछें।"

    if topic:
        prompt = f"""You are a Math Learning Assistant. Generate a Class {grade} level {subject} question about {topic}.\n\nThe question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question.\n\n{lang_instruction}\n\nThe question should be clearly mathematical in nature and suitable for educational practice."""
    else:
        prompt = f"""You are a Math Learning Assistant. Generate a Class {grade} level {subject} question.\n\nThe question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question.\n\n{lang_instruction}\n\nThe question should be clearly mathematical in nature and suitable for educational practice."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

def evaluate_answer(question, user_answer, language="English"):
    lang_instruction = "Respond in English." if language == "English" else "उत्तर हिंदी में दें।"
    prompt = f"""Here is the question: \"{question}\"\nThe student answered: \"{user_answer}\"\n\nEvaluate the answer using this format:\n- Start with \"Correct!\" or \"Incorrect.\"\n- If incorrect, say \"That's okay, let's work through it step by step.\"\n- Break your explanation into clear paragraphs with line breaks\n- Use step-by-step format with proper spacing\n- End with a clear summary using ✅ symbol\n- Be encouraging and supportive\n\n{lang_instruction}\n\nFormat your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

def answer_direct_question(question, grade, subject, topic=None, language="English"):
    # Quick check for obviously non-math inputs
    question_clean = question.strip().lower()
    if (len(question_clean) <= 3 or
        question_clean in ['hi', 'hello', 'hey', 'ui', 'aap', 'ok', 'yes', 'no'] or
        not any(char.isalpha() for char in question_clean)):
        return """Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?\n\nHere's how we can proceed:\n• I can generate practice questions for your grade level\n• I can help solve math problems step-by-step\n• I can explain math concepts and formulas\n• I can evaluate your answers and provide feedback\n\nWhat math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"""

    context = f"You are a Math Learning Assistant helping a Class {grade} student with {subject}"
    if topic:
        context += f" specifically about {topic}"

    lang_instruction = "Respond in English." if language == "English" else "उत्तर हिंदी में दें।"

    prompt = f"""{context}.\n\nThe student asks: \"{question}\"\n\nIMPORTANT: You are ONLY a Math Learning Assistant. Follow these rules STRICTLY:\n\n1. FIRST, check if the question is a proper mathematics question. A math question should:\n   - Ask about mathematical concepts, formulas, or calculations\n   - Contain mathematical terms or symbols\n   - Be a complete, meaningful question about math\n   - NOT be random letters, single words, or nonsensical text\n\n2. If the input is NOT a proper math question (including random text like \"ui\", \"aap\", \"hello\", single letters, incomplete sentences, non-math topics like history/science/literature, personal questions, general chat, etc.), respond EXACTLY like this:\n\n\"Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?\n\nHere's how we can proceed:\n• I can generate practice questions for your grade level\n• I can help solve math problems step-by-step\n• I can explain math concepts and formulas\n• I can evaluate your answers and provide feedback\n\nWhat math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)\"\n\n3. If it IS a math question, provide a clear, step-by-step explanation using this format:\n- Break your response into clear paragraphs with line breaks\n- Use step-by-step approach with proper spacing between steps\n- If it's a calculation, show each step on a new line\n- Use clear headings or bullet points when helpful\n- End with a clear summary using ✅ symbol\n- Keep explanations appropriate for their grade level\n- Use examples when helpful\n\n{lang_instruction}\n\nFormat your response with proper line breaks between paragraphs, not as one long block of text."""

    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text

# Streaming versions of the functions

def generate_question_stream(grade, subject, topic=None, difficulty=1, language="English"):
    if difficulty == 1:
        diff_text = "easy"
    elif difficulty == 2:
        diff_text = "medium"
    else:
        diff_text = "hard"
    lang_instruction = "Ask the question in English." if language == "English" else "सवाल हिंदी में पूछें।"
    if topic:
        prompt = f"Ask a Class {grade} level {subject} question about {topic}. The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question. {lang_instruction}"
    else:
        prompt = f"Ask a Class {grade} level {subject} question. The question should be {diff_text} difficulty for this grade. Don't give the answer yet, just the question. {lang_instruction}"
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text

def evaluate_answer_stream(question, user_answer, language="English"):
    lang_instruction = "Respond in English." if language == "English" else "उत्तर हिंदी में दें।"
    prompt = f"""Here is the question: \"{question}\"\nThe student answered: \"{user_answer}\"\n\nEvaluate the answer using this format:\n- Start with \"Correct!\" or \"Incorrect.\"\n- If incorrect, say \"That's okay, let's work through it step by step.\"\n- Break your explanation into clear paragraphs with line breaks\n- Use step-by-step format with proper spacing\n- End with a clear summary using ✅ symbol\n- Be encouraging and supportive\n\n{lang_instruction}\n\nFormat your response with proper line breaks between paragraphs, not as one long block of text."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text

def answer_direct_question_stream(question, grade, subject, topic=None, language="English"):
    question_clean = question.strip().lower()
    if (len(question_clean) <= 3 or
        question_clean in ['hi', 'hello', 'hey', 'ui', 'aap', 'ok', 'yes', 'no'] or
        not any(char.isalpha() for char in question_clean)):
        redirection_message = """Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?\n\nHere's how we can proceed:\n• I can generate practice questions for your grade level\n• I can help solve math problems step-by-step\n• I can explain math concepts and formulas\n• I can evaluate your answers and provide feedback\n\nWhat math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)"""
        yield redirection_message
        return
    context = f"You are a Math Learning Assistant helping a Class {grade} student with {subject}"
    if topic:
        context += f" specifically about {topic}"
    lang_instruction = "Respond in English." if language == "English" else "उत्तर हिंदी में दें।"
    prompt = f"""{context}.\n\nThe student asks: \"{question}\"\n\nIMPORTANT: You are ONLY a Math Learning Assistant. Follow these rules STRICTLY:\n\n1. FIRST, check if the question is a proper mathematics question. A math question should:\n   - Ask about mathematical concepts, formulas, or calculations\n   - Contain mathematical terms or symbols\n   - Be a complete, meaningful question about math\n   - NOT be random letters, single words, or nonsensical text\n\n2. If the input is NOT a proper math question (including random text like \"ui\", \"aap\", \"hello\", single letters, incomplete sentences, non-math topics like history/science/literature, personal questions, general chat, etc.), respond EXACTLY like this:\n\n\"Sorry Sir, this is not a math question. I am available here to provide math evaluation. Would you like to ask a math question?\n\nHere's how we can proceed:\n• I can generate practice questions for your grade level\n• I can help solve math problems step-by-step\n• I can explain math concepts and formulas\n• I can evaluate your answers and provide feedback\n\nWhat math topic would you like to explore? (Algebra, Geometry, Calculus, Statistics, Arithmetic)\"\n\n3. If it IS a math question, provide a clear, step-by-step explanation using this format:\n- Break your response into clear paragraphs with line breaks\n- Use step-by-step approach with proper spacing between steps\n- If it's a calculation, show each step on a new line\n- Use clear headings or bullet points when helpful\n- End with a clear summary using ✅ symbol\n- Keep explanations appropriate for their grade level\n- Use examples when helpful\n\n{lang_instruction}\n\nFormat your response with proper line breaks between paragraphs, not as one long block of text."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text
