#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.request
import urllib.error

dest_dir = "/Users/ananda/Desktop/KARNATKA PC/src/data"

def letter(idx):
    return chr(65 + idx)

def clean_text(text):
    return text.strip()

def call_gemini_api(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048
        }
    }
    
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req) as response:
                res = json.loads(response.read().decode("utf-8"))
                text = res["candidates"][0]["content"]["parts"][0]["text"]
                return text
        except urllib.error.HTTPError as e:
            print(f"⚠️ API Error (attempt {attempt+1}): {e.read().decode('utf-8')}")
            time.sleep(2)
        except Exception as e:
            print(f"⚠️ Error (attempt {attempt+1}): {e}")
            time.sleep(2)
    return None

def generate_english_solution(q, api_key):
    correct_letter = letter(q["correctAnswer"])
    correct_option = q["options_en"][q["correctAnswer"]]
    
    options_str = "\n".join(f"({letter(i)}) {opt}" for i, opt in enumerate(q["options_en"]))
    
    prompt = f"""You are an expert tutor for the Karnataka Police Constable exam. Write a structured step-by-step math or reasoning solution in English.

Question: {q["question_en"]}
Options:
{options_str}
Correct Answer: ({correct_letter}) {correct_option}
Subject: {q["subject"]} | Topic: {q["topic"]}

Write the solution in this EXACT format (include the exact separator lines ━━━━):

━━━━ SOLUTION ━━━━━
STEP 1 | Given
[Explain the given values and what needs to be found]

STEP 2 | Step-by-Step Solution
[Show the calculation steps or logical reasoning clearly, step by step]

∴ ANSWER = ({correct_letter}) {correct_option}

━━━━ CONCEPT & FORMULA ━━━━━
FORMULA: [Core mathematical formula or logical principle used, write None if not applicable]
RULE: [Direct shortcut rule or logical tip]
EXAM TIP: [Short advice on how to solve this type of question quickly under exam pressure]
"""
    return call_gemini_api(prompt, api_key)

def generate_kannada_solution(q, api_key):
    correct_letter = letter(q["correctAnswer"])
    correct_option = q["options_kn"][q["correctAnswer"]]
    
    options_str = "\n".join(f"({letter(i)}) {opt}" for i, opt in enumerate(q["options_kn"]))
    
    prompt = f"""You are an expert tutor for the Karnataka Police Constable exam. Write a structured step-by-step math or reasoning solution in KANNADA language. Keep the terminology simple so students can understand.

Question: {q["question_kn"]}
Options:
{options_str}
Correct Answer: ({correct_letter}) {correct_option}
Subject: {q["subject"]} | Topic: {q["topic"]}

Write the solution in this EXACT format (include the exact separator lines ━━━━):

━━━━ SOLUTION ━━━━━
STEP 1 | Given (ದತ್ತ ಮಾಹಿತಿ)
[Explain the given values and what needs to be found in Kannada]

STEP 2 | Step-by-Step Solution (ಹಂತ-ಹಂತದ ಪರಿಹಾರ)
[Show the calculation steps or logical reasoning clearly, step by step in Kannada]

∴ ANSWER = ({correct_letter}) {correct_option}

━━━━ CONCEPT & FORMULA ━━━━━
FORMULA (ಸೂತ್ರ): [Core mathematical formula or logical principle used in Kannada, write None if not applicable]
RULE (ನಿಯಮ): [Direct shortcut rule or logical tip in Kannada]
EXAM TIP (ಪರೀಕ್ಷಾ ಸಲಹೆ): [Short advice on how to solve this type of question quickly under exam pressure in Kannada]
"""
    return call_gemini_api(prompt, api_key)

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Gemini API key is missing.")
        print("Usage: python3 scripts/generate_solutions.py <GEMINI_API_KEY>")
        sys.exit(1)
        
    api_key = sys.argv[1]
    
    raw_file = os.path.join(dest_dir, "math_reasoning_raw.json")
    if not os.path.exists(raw_file):
        print(f"❌ Error: {raw_file} not found. Run extract_math_reasoning.py first.")
        sys.exit(1)
        
    with open(raw_file, "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    print(f"📂 Loaded {len(questions)} math & reasoning questions to generate solutions for...")
    
    # Load existing pyqs
    pyqs_en_path = os.path.join(dest_dir, "pyqs.json")
    pyqs_kn_path = os.path.join(dest_dir, "pyqs_kn.json")
    
    with open(pyqs_en_path, "r", encoding="utf-8") as f:
        pyqs_en = json.load(f)
        
    with open(pyqs_kn_path, "r", encoding="utf-8") as f:
        pyqs_kn = json.load(f)
        
    # Create lookup dictionaries
    en_lookup = {q["id"]: idx for idx, q in enumerate(pyqs_en)}
    kn_lookup = {q["id"]: idx for idx, q in enumerate(pyqs_kn)}
    
    completed_count = 0
    
    for i, q in enumerate(questions):
        q_id = q["id"]
        print(f"🔄 [{i+1}/{len(questions)}] Generating solutions for Question ID: {q_id} ({q['subject']})...")
        
        # English solution
        sol_en = generate_english_solution(q, api_key)
        if sol_en:
            pyqs_en[en_lookup[q_id]]["solution"] = sol_en
        else:
            print(f"⚠️ Failed to generate English solution for question ID {q_id}")
            
        time.sleep(1) # Rate limiting delay
        
        # Kannada solution
        sol_kn = generate_kannada_solution(q, api_key)
        if sol_kn:
            pyqs_kn[kn_lookup[q_id]]["solution"] = sol_kn
        else:
            print(f"⚠️ Failed to generate Kannada solution for question ID {q_id}")
            
        time.sleep(1)
        
        if sol_en and sol_kn:
            completed_count += 1
            
        # Periodically save progress
        if (i + 1) % 5 == 0 or (i + 1) == len(questions):
            print("💾 Saving progress to JSON files...")
            with open(pyqs_en_path, "w", encoding="utf-8") as f:
                json.dump(pyqs_en, f, indent=2, ensure_ascii=False)
            with open(pyqs_kn_path, "w", encoding="utf-8") as f:
                json.dump(pyqs_kn, f, indent=2, ensure_ascii=False)
                
    print(f"\n🎉 Finished! Solutions generated for {completed_count}/{len(questions)} questions.")

if __name__ == "__main__":
    main()
