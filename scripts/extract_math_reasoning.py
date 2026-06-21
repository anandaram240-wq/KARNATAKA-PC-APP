#!/usr/bin/env python3
import json
import os

dest_dir = "/Users/ananda/Desktop/KARNATKA PC/src/data"

with open(os.path.join(dest_dir, "pyqs.json"), "r", encoding="utf-8") as f:
    pyqs = json.load(f)

with open(os.path.join(dest_dir, "pyqs_kn.json"), "r", encoding="utf-8") as f:
    pyqs_kn = json.load(f)

math_reasoning = []

for q, q_kn in zip(pyqs, pyqs_kn):
    if q["subject"] in ["Arithmetic", "Reasoning"]:
        math_reasoning.append({
            "id": q["id"],
            "subject": q["subject"],
            "topic": q["topic"],
            "question_en": q["question"],
            "question_kn": q_kn["question"],
            "options_en": q["options"],
            "options_kn": q_kn["options"],
            "correctAnswer": q["correctAnswer"]
        })

print(f"Total Arithmetic/Reasoning questions found: {len(math_reasoning)}")

with open(os.path.join(dest_dir, "math_reasoning_raw.json"), "w", encoding="utf-8") as f:
    json.dump(math_reasoning, f, indent=2, ensure_ascii=False)

print("Saved raw questions to math_reasoning_raw.json")
