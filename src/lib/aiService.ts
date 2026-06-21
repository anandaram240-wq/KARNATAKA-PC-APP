import { GoogleGenAI } from '@google/genai';

export function getGeminiKey(): string {
  return localStorage.getItem('ksp_custom_gemini_key') || process.env.GEMINI_API_KEY || '';
}

export function getGroqKey(): string {
  return localStorage.getItem('ksp_custom_groq_key') || process.env.GROQ_API_KEY || '';
}

export function getActiveModel(): 'gemini' | 'groq' {
  return (localStorage.getItem('ksp_active_ai_model') as 'gemini' | 'groq') || 'gemini';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Call Gemini API using @google/genai SDK
 */
export async function callGemini(prompt: string, systemInstruction?: string, base64Image?: { mimeType: string; data: string }): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add one in Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  let contents: any = prompt;

  if (base64Image) {
    contents = {
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: base64Image.data,
            mimeType: base64Image.mimeType
          }
        }
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: contents,
    config: systemInstruction ? { systemInstruction } : undefined
  });

  return response.text || '';
}

/**
 * Call Groq API via direct fetch (blazing fast Llama responses)
 */
export async function callGroq(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error('Groq API key is not configured. Please add one in Settings.');
  }

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Groq API Error: ${res.statusText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Helper to query active model dynamically
 */
export async function callActiveAI(prompt: string, systemInstruction?: string): Promise<string> {
  const model = getActiveModel();
  if (model === 'groq') {
    try {
      return await callGroq(prompt, systemInstruction);
    } catch (e) {
      console.warn('Groq failed, falling back to Gemini:', e);
      return await callGemini(prompt, systemInstruction);
    }
  }
  return await callGemini(prompt, systemInstruction);
}

/**
 * Generate a concise 2-sentence explanation for a question
 */
export async function generateQuickExplanation(
  question: string,
  options: string[],
  correctIndex: number,
  subject: string,
  topic: string
): Promise<string> {
  const optionsText = options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
  const correctOptionText = `${String.fromCharCode(65 + correctIndex)}) ${options[correctIndex]}`;

  const prompt = `Question: ${question}
Options:
${optionsText}
Correct Option: ${correctOptionText}
Subject: ${subject}
Topic: ${topic}

Write a concise, 2-sentence explanation of why the correct option is right.
Do not write formulas, equations, or code blocks — just write a direct explanation.
You must write it bilingually: sentence 1 in Kannada, sentence 2 in English.`;

  const sysInstruction = "You are a KSP Exam Trainer. Explain questions in exactly 2 sentences (1 Kannada, 1 English). Keep it simple, factual, and direct.";

  try {
    return await callActiveAI(prompt, sysInstruction);
  } catch (err) {
    console.error('Failed to generate AI explanation:', err);
    return `ಯಶಸ್ಸಿನ ಕೀಲಿ: ಸರಿಯಾದ ಉತ್ತರವು ${correctOptionText}. (Correct Answer is ${correctOptionText}. Practice daily to master this topic!)`;
  }
}
