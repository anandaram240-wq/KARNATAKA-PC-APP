#!/usr/bin/env python3
import json
import os

source_dir = "/Users/ananda/Desktop/CIVIL CONSTABLE/CONSTABLE JSON"
dest_dir = "/Users/ananda/Desktop/KARNATKA PC/src/data"

files = ["1.json", "2.json", "3.json", "4.json", "5.json"]

all_questions = []

print("📂 Merging JSON files...")
for file_name in files:
    file_path = os.path.join(source_dir, file_name)
    if not os.path.exists(file_path):
        print(f"⚠️ Warning: {file_path} does not exist. Skipping.")
        continue
    
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            qs = data.get("questions", [])
            print(f"✅ Loaded {len(qs)} questions from {file_name}")
            all_questions.extend(qs)
        except Exception as e:
            print(f"❌ Error loading {file_name}: {e}")

print(f"📊 Total merged questions: {len(all_questions)}")

# De-duplicate questions by number
seen_numbers = set()
unique_questions = []
for q in all_questions:
    num = q.get("number")
    if num not in seen_numbers:
        seen_numbers.add(num)
        unique_questions.append(q)

unique_questions.sort(key=lambda x: x.get("number", 0))
print(f"📊 Total unique questions: {len(unique_questions)}")

# We will create the final pyqs.json and pyqs_kn.json structure
pyqs_en = []
pyqs_kn = []

def map_option_letter(letter):
    return {"a": 0, "b": 1, "c": 2, "d": 3}.get(letter.lower(), 0)

def map_subject_and_topic(orig_sub, orig_topic):
    orig_sub = orig_sub.strip()
    orig_topic = orig_topic.strip() if orig_topic else "General"
    
    if orig_sub == "Arithmetic":
        return "Mathematics", orig_topic, orig_topic
    elif orig_sub == "Reasoning":
        return "Reasoning", orig_topic, orig_topic
    elif orig_sub == "General Science":
        # For General Science, keep topic as the sub-branch (like Physics, Chemistry, Biology)
        return "General Science", orig_topic, orig_topic
    else:
        # For GK subjects, map subject to General Awareness, and topic to the original subject
        return "General Awareness", orig_sub, orig_topic

for idx, q in enumerate(unique_questions):
    number = q.get("number", idx + 1)
    orig_subject = q.get("subject", "General Awareness")
    orig_topic = q.get("topic", "General")
    
    subject, topic, sub_topic = map_subject_and_topic(orig_subject, orig_topic)
    
    text_en = q.get("text", {}).get("en", "")
    text_kn = q.get("text", {}).get("kn", "")
    
    options_dict = q.get("options", {})
    
    # Options list mapping
    opts_en = [
        options_dict.get("a", {}).get("en", ""),
        options_dict.get("b", {}).get("en", ""),
        options_dict.get("c", {}).get("en", ""),
        options_dict.get("d", {}).get("en", "")
    ]
    opts_kn = [
        options_dict.get("a", {}).get("kn", ""),
        options_dict.get("b", {}).get("kn", ""),
        options_dict.get("c", {}).get("kn", ""),
        options_dict.get("d", {}).get("kn", "")
    ]
    
    correct_ans_letter = q.get("correct_answer", "a")
    correct_idx = map_option_letter(correct_ans_letter)
    
    exam_year = str(q.get("year", "2014"))
    exam_name = q.get("exam_name", "Karnataka Police Exam")
    exam_name_kn = q.get("exam_name_kn", "ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಪರೀಕ್ಷೆ")
    
    # Construct base schemas
    q_en = {
        "id": number,
        "subject": subject,
        "topic": topic,
        "sub_topic": sub_topic,
        "question": text_en,
        "options": opts_en,
        "correctAnswer": correct_idx,
        "solution": "",
        "difficulty": "medium",
        "exam_year": exam_year,
        "shift": exam_name,
        "tags": [subject, topic]
    }
    
    q_kn = {
        "id": number,
        "subject": subject,
        "topic": topic,
        "sub_topic": sub_topic,
        "question": text_kn,
        "options": opts_kn,
        "correctAnswer": correct_idx,
        "solution": "",
        "difficulty": "medium",
        "exam_year": exam_year,
        "shift": exam_name_kn,
        "tags": [subject, topic],
        "lang": "kn",
        "lang_name": "Kannada"
    }
    
    pyqs_en.append(q_en)
    pyqs_kn.append(q_kn)

# Output files
os.makedirs(dest_dir, exist_ok=True)
with open(os.path.join(dest_dir, "pyqs.json"), "w", encoding="utf-8") as f:
    json.dump(pyqs_en, f, indent=2, ensure_ascii=False)

with open(os.path.join(dest_dir, "pyqs_kn.json"), "w", encoding="utf-8") as f:
    json.dump(pyqs_kn, f, indent=2, ensure_ascii=False)

print("\n🎉 Files generated successfully!")
print(f" - pyqs.json: {len(pyqs_en)} questions")
print(f" - pyqs_kn.json: {len(pyqs_kn)} questions")
