// AI Service Integration Layer with Backup Strategy
// Uses free AI services: Groq (Primary), Google Gemini (Backup)

import { AIFeedback } from './assignments';

// API Configuration from Environment Variables
// Vite injects these at build time. Restart dev server (npm run dev) after changing .env.
const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

if (import.meta.env.DEV) {
  const groq = !!GROQ_API_KEY;
  const gemini = !!GEMINI_API_KEY;
  if (!groq && !gemini) {
    console.warn(
      '[AssessAI] ⚠️ No API keys set. Using built-in placement questions.\n' +
      'To enable AI features:\n' +
      '1. Get API key from https://console.groq.com (Groq) or https://aistudio.google.com/app/apikey (Gemini)\n' +
      '2. Create .env file in project root\n' +
      '3. Add: VITE_GROQ_API_KEY=gsk_your_key_here OR VITE_GEMINI_API_KEY=your_key_here\n' +
      '4. Restart dev server (npm run dev)'
    );
  } else {
    console.info(`[AssessAI] API: Groq ${groq ? '✓' : '—'}, Gemini ${gemini ? '✓' : '—'}`);
    if (groq && !GROQ_API_KEY.startsWith('gsk_')) {
      console.warn('[AssessAI] ⚠️ Groq API key format looks incorrect. Should start with "gsk_"');
    }
    if (gemini && GEMINI_API_KEY.length < 20) {
      console.warn('[AssessAI] ⚠️ Gemini API key format looks incorrect. Should be longer.');
    }
  }
}

// API Endpoints
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_AUDIO_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
// Use a Gemini model that has quota in your project (2.5-flash has free tier as of 2026)
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_AUDIO_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Writing Analysis Prompt (token-optimized)
const WRITING_ANALYSIS_PROMPT = `You are an expert English teacher.
Analyze the student's text and return ONLY a compact JSON (no extra text, no markdown) with this exact shape:
{
  "overallScore": number(0-100),
  "grammar": {
    "score": number(0-100),
    "errors": [{"type": string, "message": string, "suggestion": string, "position": {"start": number, "end": number}}]
  },
  "vocabulary": {
    "score": number(0-100),
    "suggestions": string[],
    "levelAnalysis": string,
    "detailedAnalysis": string (2-3 sentences explaining vocabulary strengths and weaknesses),
    "wordUsageExamples": [{"word": string, "context": string (the sentence where it appears), "suggestion": string (optional better word), "reason": string (why this word is good/bad)}],
    "diversityAnalysis": string (1-2 sentences about word variety and repetition)
  },
  "coherence": {
    "score": number(0-100),
    "feedback": string,
    "paragraphStructure": string (analysis of paragraph organization and logical flow),
    "transitionsAnalysis": string (analysis of transition words and connections between ideas),
    "flowAnalysis": string (analysis of sentence flow and readability),
    "specificExamples": [{"issue": string, "location": string (e.g., "paragraph 2, sentence 3"), "suggestion": string}]
  },
  "strengths": string[],
  "improvements": string[]
}
For each grammar error, "suggestion" must use format: Use 'correct' instead of 'wrong'. Example: Use 'increases' instead of 'increase'.
Provide detailed, specific feedback for vocabulary and coherence sections.`;

// Speaking Analysis Prompt (token-optimized)
const SPEAKING_ANALYSIS_PROMPT = `You are an expert pronunciation and fluency teacher.
Analyze the speaking transcript and return ONLY a JSON object (no extra text, no markdown) with this shape:
{
  "overallScore": number(0-100),
  "pronunciation": {
    "score": number(0-100),
    "errors": [{"word": string, "expected": string, "actual": string}]
  },
  "fluency": {
    "score": number(0-100),
    "wordsPerMinute": number,
    "pauseAnalysis": string
  },
  "grammar": {
    "score": number(0-100),
    "errors": [{"type": string, "message": string, "suggestion": string}]
  },
  "vocabulary": {
    "score": number(0-100),
    "suggestions": string[],
    "levelAnalysis": string
  },
  "strengths": string[],
  "improvements": string[]
}.`;

/**
 * Simple writing correction prompt for Groq/Gemini flow
 * Returns a minimal JSON object with corrected text and error list.
 */
const WRITING_CORRECTION_PROMPT = `You are an expert English teacher.
Correct the student's text and return ONLY a JSON object (no extra text, no markdown) with this exact structure:
{
  "corrected_text": string,
  "score": number(0-100),
  "errors": [
    {
      "original": string,
      "replacement": string,
      "explanation": string
    }
  ]
}

CRITICAL: For each grammar/spelling error in the student's text:
- "original" MUST be the exact incorrect phrase as it appears in the student's text (copy it verbatim).
- "replacement" MUST be the exact corrected phrase as it appears in your corrected_text.
- Include ALL errors found. The original and replacement strings will be used to highlight errors (red) and corrections (green) in the text.`;

export interface SimpleWritingAnalysisError {
  original: string;
  replacement: string;
  explanation: string;
}

export interface SimpleWritingAnalysis {
  corrected_text: string;
  score: number;
  errors: SimpleWritingAnalysisError[];
}

export interface ListeningQuestion {
  id: string;
  question: string;
  options: string[];
  correct: string;
}

/**
 * Call Groq API (Primary)
 */
const callGroqAPI = async (prompt: string, systemPrompt: string, maxTokens?: number): Promise<string> => {
  if (!GROQ_API_KEY) throw new Error('Groq API key not configured');

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens || 1500, // Reduced default to save tokens
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }
    
    // Check if it's an invalid API key error
    if (errorData.error?.code === 'invalid_api_key' || 
        errorData.error?.type === 'invalid_request_error' ||
        errorText.includes('Invalid API Key') ||
        errorText.includes('invalid_api_key')) {
      const apiKeyError = new Error(
        `Invalid Groq API Key. Please check your VITE_GROQ_API_KEY in .env file.\n` +
        `1. Get your API key from https://console.groq.com\n` +
        `2. Add it to .env file as: VITE_GROQ_API_KEY=gsk_your_key_here\n` +
        `3. Restart the dev server (npm run dev)`
      );
      (apiKeyError as any).isInvalidApiKey = true;
      throw apiKeyError;
    }
    
    // Check if it's a rate limit error
    if (errorData.error?.code === 'rate_limit_exceeded' || 
        errorData.error?.type === 'tokens' ||
        errorText.includes('rate_limit') ||
        errorText.includes('Rate limit')) {
      const rateLimitError = new Error(`Groq API rate limit exceeded: ${errorData.error?.message || errorText}`);
      (rateLimitError as any).isRateLimit = true;
      throw rateLimitError;
    }
    
    throw new Error(`Groq API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Call Google Gemini API (Backup)
 */
const callGeminiAPI = async (prompt: string, systemPrompt: string, maxTokens?: number): Promise<string> => {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `${systemPrompt}\n\n${prompt}` }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens || 1500, // Reduced default to save tokens
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }
    
    // Check if it's a rate limit/quota error
    if (errorData.error?.code === 429 || 
        errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
        errorText.includes('quota') ||
        errorText.includes('rate_limit') ||
        errorText.includes('Rate limit')) {
      const friendlyMessage =
        'Gemini API quota/rate limit exceeded. Please wait a few minutes or upgrade your Gemini plan.';
      const rateLimitError = new Error(friendlyMessage);
      (rateLimitError as any).isRateLimit = true;
      throw rateLimitError;
    }
    
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

/**
 * Call AI with backup strategy (Groq -> Gemini)
 * Always tries Groq first, falls back to Gemini only if Groq fails (including rate limits)
 */
const callAIWithBackup = async (prompt: string, systemPrompt: string, maxTokens?: number): Promise<string> => {
  const errors: string[] = [];
  let groqRateLimited = false;
  let geminiRateLimited = false;

  // Try Groq first (Primary) - ALWAYS try Groq first
  if (GROQ_API_KEY) {
    try {
      return await callGroqAPI(prompt, systemPrompt, maxTokens);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Groq: ${errorMsg}`);
      
      // Check if it's an invalid API key error
      if (error?.isInvalidApiKey || errorMsg.includes('Invalid API Key') || errorMsg.includes('invalid_api_key')) {
        console.error('Groq API key is invalid. Please check your VITE_GROQ_API_KEY in .env file.');
        // Don't try Gemini if Groq key is invalid - user needs to fix the key
        throw new Error(
          `Invalid Groq API Key. Please check your VITE_GROQ_API_KEY in .env file.\n` +
          `1. Get your API key from https://console.groq.com\n` +
          `2. Add it to .env file as: VITE_GROQ_API_KEY=gsk_your_key_here\n` +
          `3. Restart the dev server (npm run dev)\n\n` +
          `If you don't have a Groq API key, you can use Gemini instead by setting VITE_GEMINI_API_KEY in .env`
        );
      }
      
      // Check if it's a rate limit error
      if (error?.isRateLimit || errorMsg.includes('rate_limit') || errorMsg.includes('Rate limit')) {
        groqRateLimited = true;
        console.warn('Groq API rate limit reached, falling back to Gemini...');
      } else {
        console.warn('Groq API failed, trying Gemini backup...', error);
      }
    }
  }

  // Try Gemini (Backup) - Only if Groq failed or rate limited
  if (GEMINI_API_KEY) {
    try {
      const result = await callGeminiAPI(prompt, systemPrompt, maxTokens);
      if (groqRateLimited) {
        console.info('Using Gemini as fallback due to Groq rate limit');
      }
      return result;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Gemini: ${errorMsg}`);

      if (error?.isRateLimit || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
        geminiRateLimited = true;
        console.error('Gemini API is rate limited/quota exceeded.');
      } else {
        console.warn('Gemini API failed', error);
      }
    }
  }

  // All APIs failed
  if (groqRateLimited && geminiRateLimited) {
    throw new Error(
      'All AI APIs are currently rate limited or quota-exceeded. Please wait a few minutes and try again, or upgrade your Groq / Gemini plans.'
    );
  }

  throw new Error(`All AI APIs failed. Please check your API keys.\n${errors.join('\n')}`);
};

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ASSISTANT_SYSTEM_PROMPT =
  'You are AssessAI, a friendly, concise English learning assistant. ' +
  'Answer user questions clearly, keep responses short, and prefer practical guidance. ' +
  'If asked about the platform, describe features like quizzes, writing, speaking, progress tracking. ' +
  'If a question is unclear, ask a short clarifying question. ' +
  'Avoid markdown lists unless the user asks for steps.';

/**
 * Generate a chat reply for the AI assistant widget.
 */
export const generateAssistantReply = async (
  messages: AssistantChatMessage[],
  maxTokens: number = 600
): Promise<string> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('At least one API key (Groq or Gemini) must be configured');
  }

  const recent = messages.slice(-8);
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `${formatted}\nAssistant:`;
  const response = await callAIWithBackup(prompt, ASSISTANT_SYSTEM_PROMPT, maxTokens);

  return response.trim();
};

/**
 * Parse JSON response from AI (handles markdown code blocks)
 */
const parseAIResponse = (response: string): any => {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\n?/g, '');
  }

   // Sometimes models add text before/after the JSON.
   // Try to extract the first JSON object/array substring.
   const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
   if (jsonMatch) {
     cleaned = jsonMatch[0];
   }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', cleaned);
    throw new Error('Invalid JSON response from AI');
  }
};

/**
 * Try to repair truncated reading-comprehension JSON (e.g. AI hit token limit).
 * Returns parsed { passage, questions } or null if repair failed.
 */
function tryParseReadingComprehensionRepair(raw: string): { passage: string; questions: any[] } | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\n?/g, '');
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*/);
  if (!jsonMatch) return null;
  cleaned = jsonMatch[0];

  // If already valid, parse normally
  try {
    const data = JSON.parse(cleaned);
    if (data?.passage && Array.isArray(data?.questions)) return { passage: data.passage, questions: data.questions };
  } catch (_) {}

  // Repair 1a: truncated inside last option string (e.g. "To experiment with)
  const repairSuffixInOption = '", "Option B", "Option C", "Option D"], "correctAnswer": 0, "explanation": "Response was truncated.", "topic": "Reading Comprehension"}]}';
  try {
    const repaired = cleaned + repairSuffixInOption;
    const data = JSON.parse(repaired);
    if (data?.passage && Array.isArray(data?.questions) && data.questions.length > 0) {
      return { passage: data.passage, questions: data.questions };
    }
  } catch (_) {}

  // Repair 1b: truncated after last option (options array complete, question object not closed)
  // e.g. ..."D to provide background information"
  if (cleaned.endsWith('"')) {
    const repairSuffixAfterOptions = '], "correctAnswer": 0, "explanation": "Response was truncated.", "topic": "Reading Comprehension"}]}';
    try {
      const repaired = cleaned + repairSuffixAfterOptions;
      const data = JSON.parse(repaired);
      if (data?.passage && Array.isArray(data?.questions) && data.questions.length > 0) {
        return { passage: data.passage, questions: data.questions };
      }
    } catch (_) {}
  }

  // Repair 2: drop last incomplete question - find boundary "},\s*{"question"
  const re = /"\s*},\s*\{\s*"question"\s*:/g;
  let match;
  let commaPos = -1;
  while ((match = re.exec(cleaned)) !== null) {
    const idx = match.index + match[0].indexOf('},');
    commaPos = idx + 1;
  }
  if (commaPos !== -1) {
    const truncated = cleaned.substring(0, commaPos - 1) + ']}';
    try {
      const data = JSON.parse(truncated);
      if (data?.passage && Array.isArray(data?.questions) && data.questions.length > 0) {
        return { passage: data.passage, questions: data.questions };
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Try to repair truncated quiz-questions JSON (root array of question objects).
 * Returns parsed array or null if repair failed.
 */
function tryParseQuizQuestionsRepair(raw: string): any[] | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\n?/g, '');
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*/);
  if (!arrayMatch) return null;
  cleaned = arrayMatch[0];

  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr;
  } catch (_) {}

  const suffix = '"correctAnswer": 0, "explanation": "Response was truncated.", "topic": "Grammar"}]';

  if (cleaned.endsWith('",')) {
    try {
      const repaired = cleaned + '"Option D"], ' + suffix;
      const arr = JSON.parse(repaired);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (_) {}
  }

  if (cleaned.endsWith('"')) {
    try {
      const repaired = cleaned + '], ' + suffix;
      const arr = JSON.parse(repaired);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (_) {}
  }

  if (cleaned.endsWith('"]')) {
    try {
      const repaired = cleaned + ', ' + suffix;
      const arr = JSON.parse(repaired);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (_) {}
  }

  // Truncated inside explanation (or other string) in last question - e.g. ..."Option C, 'Hos
  try {
    const repaired = cleaned + '", "topic": "Vocabulary"}]';
    const arr = JSON.parse(repaired);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch (_) {}

  const re = /\}\s*,\s*\{\s*"question"\s*:/g;
  let match;
  let lastEnd = -1;
  while ((match = re.exec(cleaned)) !== null) lastEnd = match.index;
  if (lastEnd !== -1) {
    try {
      const truncated = cleaned.substring(0, lastEnd + 1) + '}]';
      const arr = JSON.parse(truncated);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (_) {}
  }

  return null;
}

/**
 * Analyze writing assignment using AI
 */
export const analyzeWriting = async (text: string): Promise<AIFeedback> => {
  if (!text || text.trim().length < 10) {
    throw new Error('Text must be at least 10 characters long for analysis');
  }

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('At least one API key (Groq or Gemini) must be configured');
  }

  try {
    const response = await callAIWithBackup(text, WRITING_ANALYSIS_PROMPT, 1500);
    let feedback: any;

    try {
      feedback = parseAIResponse(response);
    } catch (parseError) {
      console.warn('Failed to parse AI JSON for detailed writing analysis. Using fallback feedback.', parseError);
      // Safe fallback feedback when JSON is malformed
      return {
        overallScore: 75,
        grammar: {
          score: 75,
          errors: [],
        },
        vocabulary: {
          score: 75,
          suggestions: [],
          levelAnalysis: 'Intermediate',
          detailedAnalysis: 'Vocabulary usage shows intermediate level with room for improvement.',
          wordUsageExamples: [],
          diversityAnalysis: 'Some word repetition detected. Try using synonyms to enhance variety.',
        },
        coherence: {
          score: 75,
          feedback: 'Good overall structure. Consider adding more details and examples.',
          paragraphStructure: 'Paragraphs are generally well-organized.',
          transitionsAnalysis: 'Some transition words could improve flow between ideas.',
          flowAnalysis: 'Sentence flow is adequate but could be smoother.',
          specificExamples: [],
        },
        strengths: [],
        improvements: [],
      };
    }
    
    // Validate and format feedback
    return {
      overallScore: Math.min(100, Math.max(0, feedback.overallScore || 75)),
      grammar: feedback.grammar || {
        score: 75,
        errors: [],
      },
      vocabulary: feedback.vocabulary ? {
        ...feedback.vocabulary,
        detailedAnalysis: feedback.vocabulary.detailedAnalysis || feedback.vocabulary.levelAnalysis,
        wordUsageExamples: feedback.vocabulary.wordUsageExamples || [],
        diversityAnalysis: feedback.vocabulary.diversityAnalysis || 'Word variety analysis not available.',
      } : {
        score: 75,
        suggestions: [],
        levelAnalysis: 'Intermediate',
        detailedAnalysis: 'Vocabulary usage shows intermediate level with room for improvement.',
        wordUsageExamples: [],
        diversityAnalysis: 'Some word repetition detected. Try using synonyms to enhance variety.',
      },
      coherence: feedback.coherence ? {
        ...feedback.coherence,
        paragraphStructure: feedback.coherence.paragraphStructure || feedback.coherence.feedback,
        transitionsAnalysis: feedback.coherence.transitionsAnalysis || 'Transition analysis not available.',
        flowAnalysis: feedback.coherence.flowAnalysis || 'Flow analysis not available.',
        specificExamples: feedback.coherence.specificExamples || [],
      } : {
        score: 75,
        feedback: 'Good structure and flow.',
        paragraphStructure: 'Paragraphs are generally well-organized.',
        transitionsAnalysis: 'Some transition words could improve flow between ideas.',
        flowAnalysis: 'Sentence flow is adequate but could be smoother.',
        specificExamples: [],
      },
      strengths: feedback.strengths || [],
      improvements: feedback.improvements || [],
    };
  } catch (error) {
    console.error('Error analyzing writing:', error);
    throw new Error(`Failed to analyze writing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Analyze writing using Groq only, returning a simple correction JSON
 * used by the Writing Practice page for corrected text + error list.
 */
export const analyzeWritingWithGroq = async (text: string): Promise<SimpleWritingAnalysis> => {
  if (!text || text.trim().length < 10) {
    throw new Error('Text must be at least 10 characters long for analysis');
  }

  if (!GROQ_API_KEY) {
    throw new Error('Groq API key (VITE_GROQ_API_KEY) must be configured for writing analysis');
  }

  try {
    let response: string | null = null;

    try {
      // Primary: Groq
      response = await callGroqAPI(text, WRITING_CORRECTION_PROMPT, 800);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        (error as any)?.isRateLimit ||
        errorMsg.toLowerCase().includes('rate limit') ||
        errorMsg.toLowerCase().includes('quota');

      // If Groq is rate-limited and Gemini key exists, fall back to Gemini
      if (isRateLimit && GEMINI_API_KEY) {
        console.warn('[AssessAI] Groq rate limited for simple writing analysis. Falling back to Gemini.');
        response = await callGeminiAPI(text, WRITING_CORRECTION_PROMPT, 800);
      } else {
        throw new Error(
          isRateLimit
            ? 'Groq API rate limit exceeded for today. Please wait a few minutes or upgrade your Groq plan.'
            : `Groq writing analysis failed: ${errorMsg}`
        );
      }
    }

    let parsed: any;
    try {
      parsed = parseAIResponse(response!);
    } catch (parseError) {
      console.warn('Failed to parse AI JSON for simple writing analysis. Using fallback result.', parseError);
      return {
        corrected_text: text,
        score: 75,
        errors: [],
      };
    }

    const correctedText = typeof parsed.corrected_text === 'string' && parsed.corrected_text.trim().length > 0
      ? parsed.corrected_text
      : text;

    const rawScore = Number(parsed.score);
    const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 75;

    const errors: SimpleWritingAnalysisError[] = Array.isArray(parsed.errors)
      ? parsed.errors.map((err: any) => ({
          original: String(err.original ?? '').trim(),
          replacement: String(err.replacement ?? '').trim(),
          explanation: String(err.explanation ?? '').trim(),
        }))
      : [];

    return {
      corrected_text: correctedText,
      score,
      errors,
    };
  } catch (error) {
    console.error('Error analyzing writing with Groq:', error);
    throw new Error(
      `Failed to analyze writing: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Analyze speaking assignment
 * Returns both detailed AI feedback and the transcribed text
 */
export const analyzeSpeaking = async (
  audioBlob: Blob
): Promise<{ feedback: AIFeedback; transcript: string }> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is required for speaking analysis (audio transcription)');
  }

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('At least one API key (Groq or Gemini) must be configured');
  }

  try {
    // First, transcribe audio using Gemini
    const transcript = await transcribeAudio(audioBlob);
    
    if (!transcript || transcript.trim().length < 5) {
      throw new Error('Audio transcription returned insufficient text for analysis');
    }

    // Analyze transcript with AI
    const response = await callAIWithBackup(transcript, SPEAKING_ANALYSIS_PROMPT, 1500);
    const feedback = parseAIResponse(response);

    // Calculate words per minute (rough estimate based on audio duration)
    // Note: This is an approximation. For accurate WPM, we'd need actual audio duration
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
    const estimatedDuration = Math.max(10, wordCount / 2); // Rough estimate: 2 words per second
    const wordsPerMinute = Math.round((wordCount / estimatedDuration) * 60);

    const normalizedFeedback: AIFeedback = {
      overallScore: Math.min(100, Math.max(0, feedback.overallScore || 75)),
      pronunciation: feedback.pronunciation || {
        score: 80,
        errors: [],
      },
      fluency: {
        score: feedback.fluency?.score || 75,
        wordsPerMinute: wordsPerMinute || feedback.fluency?.wordsPerMinute || 120,
        pauseAnalysis: feedback.fluency?.pauseAnalysis || 'Good pacing',
      },
      grammar: feedback.grammar || {
        score: 75,
        errors: [],
      },
      vocabulary: feedback.vocabulary || {
        score: 75,
        suggestions: [],
        levelAnalysis: 'Intermediate',
      },
      strengths: feedback.strengths || [],
      improvements: feedback.improvements || [],
    };

    return {
      feedback: normalizedFeedback,
      transcript,
    };
  } catch (error) {
    console.error('Error analyzing speaking:', error);
    throw new Error(`Failed to analyze speaking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate listening comprehension questions from a transcript
 */
export const generateListeningQuestions = async (
  transcript: string,
  cefrLevel?: CEFRLevel | null,
  questionCount: number = 10,
  title?: string
): Promise<ListeningQuestion[]> => {
  if (!transcript || transcript.trim().length < 30) {
    throw new Error('Transcript is too short to generate listening questions.');
  }
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('At least one API key (Groq or Gemini) must be configured');
  }

  const levelNote = cefrLevel ? `CEFR ${cefrLevel}` : 'appropriate';
  const prompt = `You are an expert English teacher. Create ${questionCount} listening comprehension questions for ${levelNote} learners based on the transcript below.

Transcript title: ${title || 'Listening passage'}
Transcript:
"""${transcript.trim()}"""

Rules:
- Return ONLY a JSON array (no extra text, no markdown).
- Each item must have: "question", "options" (4 options), and "correct" (must exactly match one of the options).
- Keep questions and options appropriate for ${levelNote} level.

Return format:
[
  {"question":"...","options":["A","B","C","D"],"correct":"A"},
  ...
]`;

  const response = await callAIWithBackup(
    prompt,
    'Expert English teacher. Return only a JSON array of listening questions.',
    1200
  );
  const parsed = parseAIResponse(response);
  if (!Array.isArray(parsed)) {
    throw new Error('AI did not return a valid question array');
  }
  const normalized: ListeningQuestion[] = parsed
    .map((q: any, idx: number) => ({
      id: `ai-q-${idx + 1}`,
      question: String(q.question || '').trim(),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
      correct: String(q.correct || '').trim(),
    }))
    .filter(q => q.question && q.options.length >= 2 && q.correct);

  if (normalized.length === 0) {
    throw new Error('AI did not generate any valid listening questions');
  }

  return normalized.slice(0, questionCount);
};

/**
 * Transcribe audio using Groq Whisper
 */
const transcribeAudioWithGroq = async (audioBlob: Blob): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key is required for audio transcription');
  }

  const formData = new FormData();
  // Browser Blob supports name as third arg
  formData.append('file', audioBlob, 'speech.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');

  const response = await fetch(GROQ_AUDIO_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }

    // Basic rate-limit detection
    if (
      errorData.error?.code === 'rate_limit_exceeded' ||
      errorText.includes('rate limit') ||
      errorText.includes('Rate limit')
    ) {
      const err = new Error(
        `Groq audio transcription rate limit: ${errorData.error?.message || errorText}`
      );
      (err as any).isRateLimit = true;
      throw err;
    }

    throw new Error(`Groq audio transcription error: ${errorText}`);
  }

  const data = await response.json();
  const transcript = (data.text || '').trim();

  if (!transcript || transcript.length < 5) {
    throw new Error('Groq audio transcription returned empty or too short result');
  }

  return transcript;
};

/**
 * Transcribe audio using Gemini's audio transcription
 */
const transcribeAudioWithGemini = async (audioBlob: Blob): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is required for audio transcription');
  }

  // Convert blob to base64
  const base64Audio = await blobToBase64(audioBlob);
  
  // Determine MIME type
  const mimeType = audioBlob.type || 'audio/webm';

  const response = await fetch(`${GEMINI_AUDIO_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: 'Transcribe this audio to text. Return only the transcribed text without any additional commentary.',
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    let errorData: any;
    try {
      errorData = JSON.parse(error);
    } catch {
      errorData = { error: { message: error } };
    }

    if (
      errorData.error?.code === 429 ||
      errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
      error.includes('quota') ||
      error.includes('rate limit') ||
      error.includes('Rate limit')
    ) {
      const friendly = new Error(
        `Gemini audio transcription quota/rate limit exceeded: ${errorData.error?.message || error}`
      );
      (friendly as any).isRateLimit = true;
      throw friendly;
    }

    throw new Error(`Gemini audio transcription error: ${error}`);
  }

  const data = await response.json();
  const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!transcript || transcript.trim().length < 5) {
    throw new Error('Audio transcription returned empty or too short result');
  }

  return transcript.trim();
};

/**
 * Transcribe audio with backup strategy:
 * Groq Whisper (primary) -> Gemini (backup)
 */
const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const errors: string[] = [];

  // Try Groq Whisper first
  if (GROQ_API_KEY) {
    try {
      return await transcribeAudioWithGroq(audioBlob);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Groq: ${msg}`);
      console.warn('Groq audio transcription failed, falling back to Gemini (if configured)...', error);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      return await transcribeAudioWithGemini(audioBlob);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Gemini: ${msg}`);
      console.error('Gemini audio transcription failed.', error);
    }
  }

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('No API keys configured for audio transcription (Groq or Gemini).');
  }

  throw new Error(`Failed to transcribe audio: ${errors.join(' | ')}`);
};

/**
 * Strip leading "A)", "B)", "C)", "D)" or "A.", "B." etc from option text
 * so that options are always displayed in consistent A, B, C, D order by index.
 */
function normalizeOptionText(option: string): string {
  if (typeof option !== 'string') return String(option).trim();
  return option.replace(/^\s*[A-Da-d][.)]\s*/i, '').trim();
}

/**
 * Normalize all options in an array (strip leading A) B) C) D) so display order is clean).
 */
function normalizeOptions(options: string[]): string[] {
  return options.map((o) => normalizeOptionText(String(o).trim()));
}

/**
 * Shuffle options and update correct answer index to ensure balanced distribution
 * Works with any number of options (3 or 4)
 */
function shuffleOptionsAndUpdateAnswer(
  options: string[],
  correctAnswerIndex: number
): { options: string[]; correctAnswer: number } {
  // Create array of indices based on number of options
  const optionCount = options.length;
  const indices = Array.from({ length: optionCount }, (_, i) => i);
  
  // Fisher-Yates shuffle algorithm
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Shuffle options using the shuffled indices
  const shuffledOptions = indices.map(idx => options[idx]);
  
  // Find the new position of the correct answer
  const newCorrectAnswerIndex = indices.indexOf(correctAnswerIndex);
  
  return {
    options: shuffledOptions,
    correctAnswer: newCorrectAnswerIndex
  };
}

/**
 * Check if answer distribution is balanced and shuffle if needed
 * Works with questions that have 3 or 4 options
 * ALWAYS shuffles to ensure balanced distribution
 */
function ensureBalancedAnswerDistribution<T extends { options: string[]; correctAnswer: number }>(
  questions: T[]
): T[] {
  if (questions.length === 0) return questions;
  
  // Group questions by number of options
  const questionsByOptionCount = new Map<number, Array<{ question: T; originalIndex: number }>>();
  questions.forEach((q, index) => {
    const optionCount = q.options.length;
    if (!questionsByOptionCount.has(optionCount)) {
      questionsByOptionCount.set(optionCount, []);
    }
    questionsByOptionCount.get(optionCount)!.push({ question: q, originalIndex: index });
  });
  
  const result: Array<{ question: T; originalIndex: number }> = [];
  
  // Process each group separately
  questionsByOptionCount.forEach((groupQuestions, optionCount) => {
    if (optionCount < 3) {
      // Don't shuffle questions with less than 3 options
      result.push(...groupQuestions);
      return;
    }
    
    // Count how many times each answer option is correct
    const answerCounts = new Array(optionCount).fill(0);
    groupQuestions.forEach(({ question: q }) => {
      if (q.correctAnswer >= 0 && q.correctAnswer < optionCount) {
        answerCounts[q.correctAnswer]++;
      }
    });
    
    // Check if distribution is unbalanced (more than 35% in one option)
    const maxCount = Math.max(...answerCounts);
    const threshold = Math.ceil(groupQuestions.length * 0.35);
    const isUnbalanced = maxCount > threshold;
    
    // ALWAYS shuffle to ensure balanced distribution
    // This ensures answers are evenly distributed across all options
    groupQuestions.forEach(({ question: q, originalIndex }) => {
      const { options, correctAnswer } = shuffleOptionsAndUpdateAnswer(
        q.options,
        q.correctAnswer
      );
      result.push({
        question: {
          ...q,
          options,
          correctAnswer
        },
        originalIndex
      });
    });
  });
  
  // Maintain original order and return
  result.sort((a, b) => a.originalIndex - b.originalIndex);
  let finalQuestions = result.map(item => item.question);
  
  // Additional pass: Ensure no more than 2 consecutive questions have the same correct answer
  // This prevents patterns like A, A, A, B, B, B
  if (finalQuestions.length > 2) {
    const maxRetries = 20;
    let retries = 0;
    
    while (retries < maxRetries) {
      let hasConsecutive = false;
      
      // Check for 3+ consecutive same answers
      for (let i = 0; i < finalQuestions.length - 2; i++) {
        const currentAnswer = finalQuestions[i].correctAnswer;
        const nextAnswer = finalQuestions[i + 1]?.correctAnswer;
        const nextNextAnswer = finalQuestions[i + 2]?.correctAnswer;
        
        // If we have 3 consecutive same answers, shuffle the middle one
        if (currentAnswer === nextAnswer && currentAnswer === nextNextAnswer) {
          hasConsecutive = true;
          const shuffled = shuffleOptionsAndUpdateAnswer(
            finalQuestions[i + 1].options,
            finalQuestions[i + 1].correctAnswer
          );
          finalQuestions[i + 1] = {
            ...finalQuestions[i + 1],
            options: shuffled.options,
            correctAnswer: shuffled.correctAnswer,
          };
        }
      }
      
      // Also check for 2 consecutive at the start/end that might create patterns
      for (let i = 0; i < finalQuestions.length - 1; i++) {
        if (finalQuestions[i].correctAnswer === finalQuestions[i + 1].correctAnswer) {
          // Check if this creates a pattern with previous/next
          if (i > 0 && finalQuestions[i - 1].correctAnswer === finalQuestions[i].correctAnswer) {
            // We have 3 consecutive, shuffle middle
            hasConsecutive = true;
            const shuffled = shuffleOptionsAndUpdateAnswer(
              finalQuestions[i].options,
              finalQuestions[i].correctAnswer
            );
            finalQuestions[i] = {
              ...finalQuestions[i],
              options: shuffled.options,
              correctAnswer: shuffled.correctAnswer,
            };
          } else if (i < finalQuestions.length - 2 && finalQuestions[i + 2].correctAnswer === finalQuestions[i].correctAnswer) {
            // We have 3 consecutive, shuffle middle
            hasConsecutive = true;
            const shuffled = shuffleOptionsAndUpdateAnswer(
              finalQuestions[i + 1].options,
              finalQuestions[i + 1].correctAnswer
            );
            finalQuestions[i + 1] = {
              ...finalQuestions[i + 1],
              options: shuffled.options,
              correctAnswer: shuffled.correctAnswer,
            };
          }
        }
      }
      
      if (!hasConsecutive) break;
      retries++;
    }
    
    // Final check: Ensure overall distribution is balanced
    const answerCounts = [0, 0, 0, 0];
    finalQuestions.forEach(q => {
      if (q.correctAnswer >= 0 && q.correctAnswer < 4) {
        answerCounts[q.correctAnswer]++;
      }
    });
    
    const maxCount = Math.max(...answerCounts);
    const minCount = Math.min(...answerCounts);
    const imbalance = maxCount - minCount;
    
    // If imbalance is too large (more than 3), do one more shuffle pass
    if (imbalance > 3 && finalQuestions.length >= 4) {
      // Shuffle questions with overrepresented answers
      const targetCount = Math.ceil(finalQuestions.length / 4);
      for (let i = 0; i < finalQuestions.length; i++) {
        const answer = finalQuestions[i].correctAnswer;
        if (answerCounts[answer] > targetCount + 1) {
          const shuffled = shuffleOptionsAndUpdateAnswer(
            finalQuestions[i].options,
            finalQuestions[i].correctAnswer
          );
          answerCounts[answer]--;
          answerCounts[shuffled.correctAnswer]++;
          finalQuestions[i] = {
            ...finalQuestions[i],
            options: shuffled.options,
            correctAnswer: shuffled.correctAnswer,
          };
        }
      }
    }
  }
  
  return finalQuestions;
}

/**
 * Generate reading comprehension: text + questions
 */
export const generateReadingComprehension = async (
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  questionCount: number,
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  topic?: string
): Promise<{
  passage: string;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    topic: string;
  }>;
}> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    // No hard-coded fallback - throw error
    throw new Error('No API keys configured. Please configure at least one API key to use reading comprehension features.');
  }

  const topicInfo = topic ? ` The topic/theme should be specifically about: "${topic}". ` : '';
  const cefrInfo = cefrLevel ? `CEFR ${cefrLevel} level. ` : '';
  const levelNote = cefrLevel 
    ? `Text and questions must match ${cefrLevel} exactly: ${cefrLevel === 'A1' ? 'very basic' : cefrLevel === 'A2' ? 'basic' : cefrLevel === 'B1' ? 'intermediate' : cefrLevel === 'B2' ? 'upper-intermediate' : cefrLevel === 'C1' ? 'advanced' : 'near-native'} vocabulary/grammar.`
    : `${difficulty.toLowerCase()} level.`;

  const prompt = `Create a UNIQUE reading comprehension exercise with:
1. A reading passage (200-400 words for ${levelNote})${topicInfo}
2. ${questionCount} multiple-choice questions about the passage

${cefrInfo}${topicInfo}The passage MUST be appropriate for ${levelNote}learners and MUST focus specifically on the topic: "${topic || 'general reading comprehension'}".

CRITICAL REQUIREMENTS:
- Passage: MUST be unique and different from previous exercises. Create a NEW, ORIGINAL passage about ${topic || 'the topic'}. Do NOT reuse the same passage.
- Topic-specific content: The passage MUST be clearly about ${topic || 'the specified topic'}. For example:
  * If topic is "Short Stories" → write a narrative story
  * If topic is "News Articles" → write a news-style article about current events
  * If topic is "Academic Texts" → write an academic/scholarly passage
  * If topic is "Opinion Pieces" → write an editorial/opinion article
  * If topic is "Literature" → write a literary excerpt
- Questions: Based ONLY on the passage content
- Distribute correct answers evenly (0,1,2,3) - NOT all in option A
- Questions test: main idea, details, inference, vocabulary in context
- Make each passage UNIQUE - vary the subject matter, setting, characters, and content

EXPLANATION for each question (required, 2-4 sentences): Explain WHY the correct answer is correct by referring to the passage (e.g. "The passage states..."). If a wrong option is a common mistake, briefly say why it is wrong. Use simple language so the student understands their mistake. Never leave explanation empty or one-line.

Return ONLY JSON (no markdown):
{
  "passage": "Full reading text here - MUST be unique and topic-specific...",
  "questions": [
    {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Detailed 2-4 sentence explanation referring to the passage, why correct is right and why key wrong options are wrong.", "topic": "${topic || 'Reading Comprehension'}"}
  ]
}`;

  try {
    const estimatedTokens = Math.min(questionCount * 220 + 600, 4000);
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return JSON with passage and questions only. Keep explanations brief (1-2 sentences) so the response is not truncated.',
      estimatedTokens
    );
    let data: { passage?: string; questions?: any[] } | null = null;
    try {
      data = parseAIResponse(response);
    } catch (parseErr) {
      data = tryParseReadingComprehensionRepair(response);
      if (!data) throw parseErr;
    }

    // Check if passage is valid
    const aiPassage = data?.passage?.trim() || '';
    const aiQuestions = Array.isArray(data?.questions) ? data.questions : [];
    
    // If passage is missing or questions are invalid, throw error
    if (!aiPassage || aiQuestions.length === 0) {
      throw new Error('AI did not return valid reading comprehension data. Please try again.');
    }
    
    let processedQuestions = aiQuestions.map((q: any, index: number) => ({
      id: index + 1,
      question: q.question || `Question ${index + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4
        ? normalizeOptions(q.options.map((o: any) => String(o).trim()))
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0,
      explanation: q.explanation || 'No explanation provided',
      topic: q.topic || topic || 'Reading Comprehension',
    }));
    
    // Ensure balanced answer distribution
    processedQuestions = ensureBalancedAnswerDistribution(processedQuestions);
    
    // Ensure we have the requested number of questions
    if (processedQuestions.length < questionCount) {
      throw new Error(`AI generated only ${processedQuestions.length} questions, but ${questionCount} were requested. Please try again.`);
    }
    
    // Final check: ensure passage is not empty
    if (!aiPassage || aiPassage.trim() === '' || aiPassage === 'No passage provided') {
      throw new Error('AI did not generate a valid reading passage. Please try again.');
    }
    const finalPassage = aiPassage;
    
    return {
      passage: finalPassage,
      questions: processedQuestions.slice(0, questionCount).map((q, index) => ({
        ...q,
        id: index + 1,
      })),
    };
  } catch (error) {
    console.error('Error generating reading comprehension:', error);
    // No hard-coded fallback - throw error so component can handle it
    throw new Error('Failed to generate reading comprehension. Please check your API keys and try again.');
  }
};

/**
 * Get default reading comprehension (fallback)
 * Now includes topic-specific passages for different reading comprehension types
 */
function getDefaultReadingComprehension(
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  questionCount: number,
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  topic?: string
): {
  passage: string;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    topic: string;
  }>;
} {
  // Topic-specific passages - each topic has different passages for different CEFR levels
  const topicPassages: Record<string, Record<string, { passage: string; questions: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }> }>> = {
    'Short Stories and Narrative Texts': {
      A1: {
        passage: `Once upon a time, there was a little girl named Emma. She loved to play in her garden. Every morning, Emma watered her flowers. The flowers were red, yellow, and blue. One day, a butterfly came to visit. The butterfly was very colorful. Emma was happy to see it. She watched the butterfly fly from flower to flower. It was a beautiful day.`,
        questions: [
          { question: 'What is the girl\'s name?', options: ['Emma', 'Anna', 'Emily', 'Ella'], correctAnswer: 0, explanation: 'The passage states "there was a little girl named Emma."' },
          { question: 'What did Emma love to do?', options: ['Read books', 'Play in her garden', 'Watch TV', 'Cook food'], correctAnswer: 1, explanation: 'The passage says "She loved to play in her garden."' },
          { question: 'What colors were the flowers?', options: ['Red, yellow, blue', 'Red, green, blue', 'Yellow, green, purple', 'Blue, white, pink'], correctAnswer: 0, explanation: 'The passage states "The flowers were red, yellow, and blue."' },
          { question: 'What came to visit Emma?', options: ['A bird', 'A butterfly', 'A cat', 'A dog'], correctAnswer: 1, explanation: 'The passage says "One day, a butterfly came to visit."' },
        ],
      },
      A2: {
        passage: `Sarah was walking home from school when she found a small, lost puppy. The puppy was brown and white, and it looked very sad. Sarah picked it up carefully. The puppy had a collar with a name tag that said "Max". Sarah decided to help Max find his home. She asked people in the neighborhood if they knew where Max lived. Finally, an old woman recognized Max and showed Sarah the way to his house. Max\'s owner was very happy to see him again.`,
        questions: [
          { question: 'Where was Sarah when she found the puppy?', options: ['At home', 'Walking from school', 'In a park', 'At a store'], correctAnswer: 1, explanation: 'The passage begins "Sarah was walking home from school when she found..."' },
          { question: 'What was the puppy\'s name?', options: ['Max', 'Sam', 'Buddy', 'Charlie'], correctAnswer: 0, explanation: 'The passage says "The puppy had a collar with a name tag that said \'Max\'."' },
          { question: 'How did Sarah help Max?', options: ['She kept him', 'She asked people for help', 'She called the police', 'She took him to a vet'], correctAnswer: 1, explanation: 'The passage states "She asked people in the neighborhood if they knew where Max lived."' },
          { question: 'Who helped Sarah find Max\'s home?', options: ['A police officer', 'An old woman', 'A child', 'A teacher'], correctAnswer: 1, explanation: 'The passage says "Finally, an old woman recognized Max and showed Sarah the way."' },
        ],
      },
      B1: {
        passage: `The old lighthouse had stood on the cliff for over a hundred years, guiding ships safely to shore. But now it was abandoned, its light extinguished decades ago. Young Alex discovered it during a summer exploration and was immediately fascinated by its history. Inside, Alex found old logbooks detailing the lives of the lighthouse keepers who had once lived there. Each entry told stories of storms, shipwrecks, and the lonely but important work of keeping the light burning. Alex decided to research the lighthouse\'s history and write a book about it.`,
        questions: [
          { question: 'How long had the lighthouse been there?', options: ['Fifty years', 'Over a hundred years', 'Two hundred years', 'Thirty years'], correctAnswer: 1, explanation: 'The passage states "The old lighthouse had stood on the cliff for over a hundred years."' },
          { question: 'What did Alex find inside the lighthouse?', options: ['Treasure', 'Old logbooks', 'Modern equipment', 'Paintings'], correctAnswer: 1, explanation: 'The passage says "Inside, Alex found old logbooks detailing the lives of the lighthouse keepers."' },
          { question: 'What did the logbooks contain?', options: ['Maps', 'Stories of storms and shipwrecks', 'Recipes', 'Poems'], correctAnswer: 1, explanation: 'The passage states "Each entry told stories of storms, shipwrecks, and the lonely but important work."' },
          { question: 'What did Alex decide to do?', options: ['Restore the lighthouse', 'Write a book about it', 'Sell the logbooks', 'Forget about it'], correctAnswer: 1, explanation: 'The passage says "Alex decided to research the lighthouse\'s history and write a book about it."' },
        ],
      },
      B2: {
        passage: `The mysterious letter arrived on a Tuesday morning, addressed to someone who had moved away years ago. Maria, the current resident, was about to return it when she noticed the sender\'s name: her grandmother, who had passed away five years earlier. The postmark showed it was sent only last week. Intrigued, Maria carefully opened the letter. Inside, she discovered her grandmother\'s final wishes and a key to a safety deposit box containing family heirlooms and important documents. The letter explained that her grandmother had arranged for it to be sent posthumously, revealing secrets about their family history that Maria had never known.`,
        questions: [
          { question: 'When did the letter arrive?', options: ['Monday', 'Tuesday morning', 'Wednesday', 'Friday'], correctAnswer: 1, explanation: 'The passage begins "The mysterious letter arrived on a Tuesday morning."' },
          { question: 'Who was the letter from?', options: ['A friend', 'Maria\'s grandmother', 'A neighbor', 'A stranger'], correctAnswer: 1, explanation: 'The passage says "she noticed the sender\'s name: her grandmother, who had passed away five years earlier."' },
          { question: 'What did the letter contain?', options: ['Money', 'A key to a safety deposit box', 'Photos', 'Recipes'], correctAnswer: 1, explanation: 'The passage states "Inside, she discovered her grandmother\'s final wishes and a key to a safety deposit box."' },
          { question: 'What did Maria learn from the letter?', options: ['Nothing new', 'Secrets about family history', 'Where to find money', 'How to contact relatives'], correctAnswer: 1, explanation: 'The passage says "revealing secrets about their family history that Maria had never known."' },
        ],
      },
    },
    'News Articles and Current Events': {
      A1: {
        passage: `A new park opened in the city center yesterday. Many people came to see it. The park has trees, flowers, and a playground. Children can play there. There are benches for people to sit. The mayor cut a ribbon to open the park. Everyone was happy. The park is open every day from 8 AM to 8 PM.`,
        questions: [
          { question: 'When did the park open?', options: ['Last week', 'Yesterday', 'Tomorrow', 'Next month'], correctAnswer: 1, explanation: 'The passage begins "A new park opened in the city center yesterday."' },
          { question: 'What does the park have?', options: ['Only trees', 'Trees, flowers, and a playground', 'Only a playground', 'Nothing'], correctAnswer: 1, explanation: 'The passage says "The park has trees, flowers, and a playground."' },
          { question: 'Who opened the park?', options: ['A teacher', 'The mayor', 'A child', 'A police officer'], correctAnswer: 1, explanation: 'The passage states "The mayor cut a ribbon to open the park."' },
          { question: 'When is the park open?', options: ['Only weekends', 'Every day 8 AM to 8 PM', 'Only mornings', 'Only evenings'], correctAnswer: 1, explanation: 'The passage says "The park is open every day from 8 AM to 8 PM."' },
        ],
      },
      A2: {
        passage: `Local scientists announced exciting news today. They discovered a new type of flower in the nearby forest. The flower is bright purple and only blooms at night. Scientists say this is very rare. They want to protect the flower. The forest will become a protected area. People can still visit, but they must be careful not to damage the flowers.`,
        questions: [
          { question: 'What did scientists discover?', options: ['A new animal', 'A new type of flower', 'A new tree', 'A new bird'], correctAnswer: 1, explanation: 'The passage states "They discovered a new type of flower in the nearby forest."' },
          { question: 'What color is the flower?', options: ['Red', 'Yellow', 'Bright purple', 'Blue'], correctAnswer: 2, explanation: 'The passage says "The flower is bright purple."' },
          { question: 'When does the flower bloom?', options: ['In the morning', 'At night', 'In the afternoon', 'All day'], correctAnswer: 1, explanation: 'The passage states "only blooms at night."' },
          { question: 'What will happen to the forest?', options: ['It will be closed', 'It will become a protected area', 'It will be cut down', 'Nothing'], correctAnswer: 1, explanation: 'The passage says "The forest will become a protected area."' },
        ],
      },
      B1: {
        passage: `City officials have announced plans to improve public transportation across the metropolitan area. The new initiative includes expanding bus routes, adding more frequent services, and introducing electric buses to reduce pollution. The project, which will cost approximately $50 million, is expected to be completed within two years. Mayor Johnson stated that this investment will make commuting easier for thousands of residents and help the city meet its environmental goals. Public feedback has been largely positive, though some residents have expressed concerns about potential disruptions during construction.`,
        questions: [
          { question: 'What is the main purpose of the new initiative?', options: ['To build new roads', 'To improve public transportation', 'To close bus routes', 'To reduce bus services'], correctAnswer: 1, explanation: 'The passage begins "City officials have announced plans to improve public transportation."' },
          { question: 'What type of buses will be introduced?', options: ['Diesel buses', 'Electric buses', 'Gas buses', 'Hybrid buses'], correctAnswer: 1, explanation: 'The passage says "introducing electric buses to reduce pollution."' },
          { question: 'How much will the project cost?', options: ['$30 million', '$50 million', '$70 million', '$100 million'], correctAnswer: 1, explanation: 'The passage states "The project, which will cost approximately $50 million."' },
          { question: 'What concern have some residents expressed?', options: ['Cost', 'Pollution', 'Potential disruptions during construction', 'Bus colors'], correctAnswer: 2, explanation: 'The passage says "some residents have expressed concerns about potential disruptions during construction."' },
        ],
      },
      B2: {
        passage: `International climate summit concludes with historic agreement on carbon reduction targets. Delegates from over 190 countries reached a consensus to cut global emissions by 45% by 2030, with developed nations committing to more ambitious goals. The agreement includes provisions for financial assistance to developing countries transitioning to renewable energy. Environmental groups have praised the deal as a significant step forward, though critics argue the targets are still insufficient to prevent catastrophic warming. Implementation will require unprecedented cooperation between governments, industries, and communities worldwide.`,
        questions: [
          { question: 'What was the main achievement of the summit?', options: ['Trade agreements', 'Carbon reduction targets', 'Military cooperation', 'Tourism promotion'], correctAnswer: 1, explanation: 'The passage states "historic agreement on carbon reduction targets."' },
          { question: 'By how much should emissions be cut by 2030?', options: ['30%', '45%', '60%', '75%'], correctAnswer: 1, explanation: 'The passage says "cut global emissions by 45% by 2030."' },
          { question: 'What does the agreement include for developing countries?', options: ['Military aid', 'Financial assistance', 'Technology transfer', 'Food supplies'], correctAnswer: 1, explanation: 'The passage states "includes provisions for financial assistance to developing countries."' },
          { question: 'What do critics argue?', options: ['Targets are too ambitious', 'Targets are insufficient', 'Agreement is perfect', 'No action needed'], correctAnswer: 1, explanation: 'The passage says "critics argue the targets are still insufficient to prevent catastrophic warming."' },
        ],
      },
    },
    'Academic Texts and Scholarly Articles': {
      A1: {
        passage: `Scientists study animals. They watch animals in nature. They write notes about what animals do. Some animals sleep during the day. Some animals sleep at night. Scientists learn many things about animals. This helps us understand nature better.`,
        questions: [
          { question: 'What do scientists do?', options: ['Cook food', 'Study animals', 'Build houses', 'Teach children'], correctAnswer: 1, explanation: 'The passage begins "Scientists study animals."' },
          { question: 'Where do scientists watch animals?', options: ['In zoos only', 'In nature', 'In labs only', 'In schools'], correctAnswer: 1, explanation: 'The passage says "They watch animals in nature."' },
          { question: 'When do some animals sleep?', options: ['Only at night', 'During the day or at night', 'Never', 'All the time'], correctAnswer: 1, explanation: 'The passage states "Some animals sleep during the day. Some animals sleep at night."' },
        ],
      },
      A2: {
        passage: `Researchers have been studying how plants grow. They found that plants need sunlight, water, and good soil to grow well. In their experiments, they tested different amounts of water. Plants that got the right amount of water grew taller and healthier. Plants that got too much or too little water did not grow as well. This research helps farmers grow better crops.`,
        questions: [
          { question: 'What do plants need to grow?', options: ['Only water', 'Sunlight, water, and good soil', 'Only sunlight', 'Only soil'], correctAnswer: 1, explanation: 'The passage states "plants need sunlight, water, and good soil to grow well."' },
          { question: 'What did researchers test?', options: ['Different plants', 'Different amounts of water', 'Different soils', 'Different lights'], correctAnswer: 1, explanation: 'The passage says "they tested different amounts of water."' },
          { question: 'Which plants grew better?', options: ['Plants with too much water', 'Plants with the right amount of water', 'Plants with no water', 'All plants'], correctAnswer: 1, explanation: 'The passage states "Plants that got the right amount of water grew taller and healthier."' },
          { question: 'Who benefits from this research?', options: ['Only scientists', 'Farmers', 'Only teachers', 'No one'], correctAnswer: 1, explanation: 'The passage says "This research helps farmers grow better crops."' },
        ],
      },
      B1: {
        passage: `Recent studies in cognitive psychology have revealed fascinating insights into how memory formation works. Researchers conducted experiments where participants were asked to memorize lists of words under different conditions. The results showed that information encoded with emotional context was significantly more likely to be retained long-term compared to neutral information. Furthermore, the study demonstrated that sleep plays a crucial role in memory consolidation, with participants who slept after learning showing better recall than those who stayed awake. These findings have important implications for educational practices and learning strategies.`,
        questions: [
          { question: 'What field of study is this research in?', options: ['Biology', 'Cognitive psychology', 'Physics', 'Chemistry'], correctAnswer: 1, explanation: 'The passage begins "Recent studies in cognitive psychology have revealed..."' },
          { question: 'What did researchers ask participants to do?', options: ['Solve math problems', 'Memorize lists of words', 'Write stories', 'Draw pictures'], correctAnswer: 1, explanation: 'The passage says "participants were asked to memorize lists of words."' },
          { question: 'What type of information was better retained?', options: ['Neutral information', 'Information with emotional context', 'Random information', 'All information equally'], correctAnswer: 1, explanation: 'The passage states "information encoded with emotional context was significantly more likely to be retained."' },
          { question: 'What role does sleep play?', options: ['No role', 'Crucial role in memory consolidation', 'Makes memory worse', 'Only helps short-term memory'], correctAnswer: 1, explanation: 'The passage says "sleep plays a crucial role in memory consolidation."' },
        ],
      },
      B2: {
        passage: `The field of quantum computing represents a paradigm shift in computational methodology, leveraging quantum mechanical phenomena such as superposition and entanglement to process information in fundamentally different ways than classical computers. Recent breakthroughs have demonstrated the potential for quantum algorithms to solve certain problems exponentially faster than their classical counterparts, particularly in areas like cryptography, drug discovery, and optimization. However, significant challenges remain, including error correction, maintaining quantum coherence, and scaling systems to practical sizes. Major technology companies and research institutions are investing billions in developing this technology, recognizing its transformative potential.`,
        questions: [
          { question: 'What does quantum computing use?', options: ['Classical physics', 'Quantum mechanical phenomena', 'Traditional methods', 'Simple calculations'], correctAnswer: 1, explanation: 'The passage states "leveraging quantum mechanical phenomena such as superposition and entanglement."' },
          { question: 'In what areas have quantum algorithms shown promise?', options: ['Only gaming', 'Cryptography, drug discovery, and optimization', 'Only entertainment', 'Only communication'], correctAnswer: 1, explanation: 'The passage says "particularly in areas like cryptography, drug discovery, and optimization."' },
          { question: 'What challenges remain?', options: ['Cost only', 'Error correction, maintaining coherence, and scaling', 'Speed only', 'No challenges'], correctAnswer: 1, explanation: 'The passage states "significant challenges remain, including error correction, maintaining quantum coherence, and scaling systems."' },
          { question: 'Who is investing in quantum computing?', options: ['Only governments', 'Major technology companies and research institutions', 'Only individuals', 'No one'], correctAnswer: 1, explanation: 'The passage says "Major technology companies and research institutions are investing billions."' },
        ],
      },
    },
    'Opinion Pieces and Editorials': {
      A1: {
        passage: `I think reading books is very important. Books teach us many things. They help us learn new words. Books can take us to different places. We can read about other countries. Reading is fun and good for our brain. Everyone should read books every day.`,
        questions: [
          { question: 'What does the writer think is important?', options: ['Watching TV', 'Reading books', 'Playing games', 'Sleeping'], correctAnswer: 1, explanation: 'The passage begins "I think reading books is very important."' },
          { question: 'What do books help us do?', options: ['Cook', 'Learn new words', 'Exercise', 'Sing'], correctAnswer: 1, explanation: 'The passage says "They help us learn new words."' },
          { question: 'What can books do?', options: ['Make us tired', 'Take us to different places', 'Make us hungry', 'Make us sad'], correctAnswer: 1, explanation: 'The passage states "Books can take us to different places."' },
        ],
      },
      A2: {
        passage: `In my opinion, schools should start later in the morning. Many students are tired when they arrive at school early. Studies show that teenagers need more sleep. Starting school later would help students learn better. Students would be more awake and ready to learn. I believe this change would improve education for everyone.`,
        questions: [
          { question: 'What is the writer\'s opinion?', options: ['Schools should start earlier', 'Schools should start later', 'Schools should close', 'Nothing should change'], correctAnswer: 1, explanation: 'The passage begins "In my opinion, schools should start later in the morning."' },
          { question: 'Why are students tired?', options: ['They exercise too much', 'They arrive at school early', 'They eat too much', 'They play too much'], correctAnswer: 1, explanation: 'The passage says "Many students are tired when they arrive at school early."' },
          { question: 'What do studies show?', options: ['Teenagers need less sleep', 'Teenagers need more sleep', 'Sleep doesn\'t matter', 'All students sleep well'], correctAnswer: 1, explanation: 'The passage states "Studies show that teenagers need more sleep."' },
          { question: 'What would improve education?', options: ['More homework', 'Starting school later', 'Less books', 'More tests'], correctAnswer: 1, explanation: 'The passage says "I believe this change would improve education for everyone."' },
        ],
      },
      B1: {
        passage: `The debate over social media's impact on society continues to divide opinion. Proponents argue that platforms like Facebook and Twitter have democratized information, allowing ordinary citizens to share their views and organize movements. Critics, however, point to the spread of misinformation, privacy concerns, and the negative effects on mental health, particularly among young people. While both perspectives have merit, I believe we need balanced regulation that preserves the benefits of social connectivity while addressing its harmful aspects. The solution lies not in banning these platforms, but in educating users about digital literacy and holding companies accountable for their content moderation practices.`,
        questions: [
          { question: 'What do proponents of social media argue?', options: ['It should be banned', 'It has democratized information', 'It has no benefits', 'It only causes harm'], correctAnswer: 1, explanation: 'The passage states "Proponents argue that platforms...have democratized information."' },
          { question: 'What do critics point to?', options: ['Only benefits', 'Misinformation, privacy concerns, and mental health effects', 'Only positive effects', 'No problems'], correctAnswer: 1, explanation: 'The passage says "Critics...point to the spread of misinformation, privacy concerns, and the negative effects on mental health."' },
          { question: 'What does the writer believe we need?', options: ['A complete ban', 'Balanced regulation', 'No regulation', 'More social media'], correctAnswer: 1, explanation: 'The passage states "I believe we need balanced regulation."' },
          { question: 'What is the solution according to the writer?', options: ['Ban platforms', 'Educate users and hold companies accountable', 'Ignore the problems', 'Use more social media'], correctAnswer: 1, explanation: 'The passage says "The solution lies...in educating users about digital literacy and holding companies accountable."' },
        ],
      },
      B2: {
        passage: `The proliferation of artificial intelligence in everyday applications raises profound questions about the future of human agency and decision-making. While AI systems offer unprecedented efficiency and capabilities, we must critically examine whether we are ceding too much autonomy to algorithms. The convenience of AI-powered recommendations and automated processes comes at a cost: the gradual erosion of our ability to make independent judgments and the potential for algorithmic bias to perpetuate social inequalities. I contend that we need a new framework for human-AI collaboration that prioritizes transparency, maintains human oversight, and ensures that technology serves human values rather than replacing human judgment entirely.`,
        questions: [
          { question: 'What does the writer question?', options: ['AI efficiency', 'The future of human agency', 'Technology costs', 'Social media'], correctAnswer: 1, explanation: 'The passage states "raises profound questions about the future of human agency."' },
          { question: 'What is a concern about AI?', options: ['It\'s too slow', 'We may be ceding too much autonomy', 'It\'s too expensive', 'It doesn\'t work'], correctAnswer: 1, explanation: 'The passage says "we must critically examine whether we are ceding too much autonomy to algorithms."' },
          { question: 'What is being eroded?', options: ['Technology', 'Our ability to make independent judgments', 'Social media', 'Computers'], correctAnswer: 1, explanation: 'The passage states "the gradual erosion of our ability to make independent judgments."' },
          { question: 'What does the writer propose?', options: ['Ban AI', 'A framework prioritizing transparency and human oversight', 'More AI', 'Ignore the issues'], correctAnswer: 1, explanation: 'The passage says "we need a new framework for human-AI collaboration that prioritizes transparency, maintains human oversight."' },
        ],
      },
    },
    'Literature and Literary Works': {
      A1: {
        passage: `The sun was shining. Birds were singing. It was a beautiful day. A little rabbit hopped in the garden. The rabbit was white and fluffy. It ate carrots from the ground. The rabbit was happy. It played in the sunshine.`,
        questions: [
          { question: 'What was the weather like?', options: ['Rainy', 'Sunny', 'Snowy', 'Cloudy'], correctAnswer: 1, explanation: 'The passage begins "The sun was shining."' },
          { question: 'What animal was in the garden?', options: ['A cat', 'A dog', 'A rabbit', 'A bird'], correctAnswer: 2, explanation: 'The passage says "A little rabbit hopped in the garden."' },
          { question: 'What color was the rabbit?', options: ['Brown', 'Black', 'White', 'Gray'], correctAnswer: 2, explanation: 'The passage states "The rabbit was white and fluffy."' },
          { question: 'What did the rabbit eat?', options: ['Apples', 'Carrots', 'Grass', 'Leaves'], correctAnswer: 1, explanation: 'The passage says "It ate carrots from the ground."' },
        ],
      },
      A2: {
        passage: `In the quiet village, an old storyteller sat under the ancient oak tree every evening. Children gathered around him to listen to his tales of adventure and magic. His stories spoke of brave knights, wise wizards, and distant kingdoms. The children's eyes sparkled with wonder as they imagined themselves in these fantastic worlds. The storyteller's voice was warm and gentle, making each character come alive. When the stories ended, the children would return home, carrying dreams of their own adventures.`,
        questions: [
          { question: 'Where did the storyteller sit?', options: ['In a house', 'Under an ancient oak tree', 'In a school', 'In a park'], correctAnswer: 1, explanation: 'The passage says "an old storyteller sat under the ancient oak tree every evening."' },
          { question: 'Who listened to the stories?', options: ['Adults', 'Children', 'Animals', 'No one'], correctAnswer: 1, explanation: 'The passage states "Children gathered around him to listen to his tales."' },
          { question: 'What did the stories include?', options: ['Only facts', 'Brave knights, wise wizards, and distant kingdoms', 'Only modern stories', 'Only sad stories'], correctAnswer: 1, explanation: 'The passage says "His stories spoke of brave knights, wise wizards, and distant kingdoms."' },
          { question: 'How did the children feel?', options: ['Bored', 'Wonder', 'Angry', 'Sad'], correctAnswer: 1, explanation: 'The passage states "The children\'s eyes sparkled with wonder."' },
        ],
      },
      B1: {
        passage: `The abandoned mansion stood at the edge of the forest, its windows dark and its gardens overgrown. Local legends whispered of the family that had once lived there, wealthy merchants who had mysteriously disappeared one stormy night decades ago. Young detective Sarah was determined to uncover the truth. As she explored the dusty rooms, she discovered letters hidden in a secret drawer, revealing a tale of betrayal and hidden treasure. The mystery deepened with each clue she found, leading her closer to understanding what had really happened to the family.`,
        questions: [
          { question: 'Where was the mansion located?', options: ['In the city center', 'At the edge of the forest', 'Near a beach', 'On a mountain'], correctAnswer: 1, explanation: 'The passage begins "The abandoned mansion stood at the edge of the forest."' },
          { question: 'What happened to the family?', options: ['They moved away', 'They mysteriously disappeared', 'They sold the house', 'They are still there'], correctAnswer: 1, explanation: 'The passage says "wealthy merchants who had mysteriously disappeared one stormy night."' },
          { question: 'What did Sarah discover?', options: ['Money', 'Letters in a secret drawer', 'Nothing', 'A map'], correctAnswer: 1, explanation: 'The passage states "she discovered letters hidden in a secret drawer."' },
          { question: 'What did the letters reveal?', options: ['A happy story', 'A tale of betrayal and hidden treasure', 'Nothing important', 'A shopping list'], correctAnswer: 1, explanation: 'The passage says "revealing a tale of betrayal and hidden treasure."' },
        ],
      },
      B2: {
        passage: `The novel's protagonist, an aging professor grappling with the meaning of existence, finds himself drawn into a philosophical journey that challenges his lifelong assumptions. Through encounters with characters who represent different worldviews, he is forced to confront the contradictions between his intellectual beliefs and emotional experiences. The narrative employs stream-of-consciousness techniques to explore the fluidity of memory and perception, blurring the boundaries between past and present. As the professor's journey reaches its climax, he realizes that understanding comes not from finding definitive answers, but from embracing the complexity and ambiguity of human experience.`,
        questions: [
          { question: 'Who is the protagonist?', options: ['A student', 'An aging professor', 'A writer', 'A doctor'], correctAnswer: 1, explanation: 'The passage begins "The novel\'s protagonist, an aging professor..."' },
          { question: 'What is the professor grappling with?', options: ['Money problems', 'The meaning of existence', 'Health issues', 'Family matters'], correctAnswer: 1, explanation: 'The passage says "grappling with the meaning of existence."' },
          { question: 'What technique does the narrative employ?', options: ['Simple dialogue', 'Stream-of-consciousness', 'Only description', 'Only action'], correctAnswer: 1, explanation: 'The passage states "The narrative employs stream-of-consciousness techniques."' },
          { question: 'What does the professor realize?', options: ['He has all the answers', 'Understanding comes from embracing complexity', 'Life is simple', 'Nothing matters'], correctAnswer: 1, explanation: 'The passage says "he realizes that understanding comes not from finding definitive answers, but from embracing the complexity."' },
        ],
      },
    },
  };

  // Default passages (fallback when topic doesn't match or no topic provided)
  const defaultPassages: Record<string, { passage: string; questions: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }> }> = {
    A1: {
      passage: `My name is Maria. I am 25 years old. I live in a small apartment in Madrid, Spain. I work in a café near my home. Every morning, I wake up at 7 o'clock. I eat breakfast and then go to work. I like my job because I meet many people. In the evening, I go home and cook dinner. I like to read books before I sleep.`,
      questions: [
        { question: 'How old is Maria?', options: ['20 years old', '25 years old', '30 years old', '35 years old'], correctAnswer: 1, explanation: 'The passage states "I am 25 years old."' },
        { question: 'Where does Maria live?', options: ['Barcelona', 'Madrid', 'Valencia', 'Seville'], correctAnswer: 1, explanation: 'The passage says "I live in a small apartment in Madrid, Spain."' },
        { question: 'What time does Maria wake up?', options: ['6 o\'clock', '7 o\'clock', '8 o\'clock', '9 o\'clock'], correctAnswer: 1, explanation: 'The passage states "I wake up at 7 o\'clock."' },
        { question: 'Why does Maria like her job?', options: ['It pays well', 'She meets many people', 'It is easy', 'It is close to home'], correctAnswer: 1, explanation: 'The passage says "I like my job because I meet many people."' },
        { question: 'What does Maria do before she sleeps?', options: ['Watch TV', 'Read books', 'Cook dinner', 'Go for a walk'], correctAnswer: 1, explanation: 'The passage states "I like to read books before I sleep."' },
      ],
    },
    A2: {
      passage: `Last summer, I went on a trip to London with my family. We stayed in a hotel near the city center. Every day, we visited different places. On Monday, we went to the British Museum. On Tuesday, we saw Big Ben and the Houses of Parliament. On Wednesday, we visited the Tower of London. The weather was sunny and warm. We ate fish and chips for lunch every day. I took many photos. It was a wonderful vacation!`,
      questions: [
        { question: 'When did the trip happen?', options: ['Last spring', 'Last summer', 'Last winter', 'Last autumn'], correctAnswer: 1, explanation: 'The passage begins "Last summer, I went on a trip..."' },
        { question: 'Where did they stay?', options: ['Near the park', 'Near the city center', 'Near the airport', 'Near the beach'], correctAnswer: 1, explanation: 'The passage says "We stayed in a hotel near the city center."' },
        { question: 'What did they visit on Tuesday?', options: ['British Museum', 'Big Ben', 'Tower of London', 'Buckingham Palace'], correctAnswer: 1, explanation: 'The passage states "On Tuesday, we saw Big Ben and the Houses of Parliament."' },
        { question: 'What was the weather like?', options: ['Rainy and cold', 'Sunny and warm', 'Cloudy and cool', 'Windy and cold'], correctAnswer: 1, explanation: 'The passage says "The weather was sunny and warm."' },
        { question: 'What did they eat for lunch?', options: ['Pizza', 'Fish and chips', 'Sandwiches', 'Salad'], correctAnswer: 1, explanation: 'The passage states "We ate fish and chips for lunch every day."' },
      ],
    },
    B1: {
      passage: `Climate change is one of the most pressing issues of our time. Scientists have been studying the Earth's climate for decades and have found clear evidence that human activities are causing global temperatures to rise. The main cause is the increase in greenhouse gases, especially carbon dioxide, which comes from burning fossil fuels like coal, oil, and gas. These gases trap heat in the atmosphere, leading to global warming. The effects are already visible: melting ice caps, rising sea levels, and more extreme weather events. Many countries are now working together to reduce emissions and develop renewable energy sources like solar and wind power.`,
      questions: [
        { question: 'What is the main cause of climate change according to the passage?', options: ['Natural weather patterns', 'Increase in greenhouse gases', 'Ocean currents', 'Volcanic activity'], correctAnswer: 1, explanation: 'The passage states "The main cause is the increase in greenhouse gases, especially carbon dioxide."' },
        { question: 'Where do greenhouse gases mainly come from?', options: ['Forests', 'Oceans', 'Burning fossil fuels', 'Agriculture'], correctAnswer: 2, explanation: 'The passage says greenhouse gases "come from burning fossil fuels like coal, oil, and gas."' },
        { question: 'What is one effect of climate change mentioned?', options: ['More forests', 'Melting ice caps', 'Cooler temperatures', 'Less rain'], correctAnswer: 1, explanation: 'The passage lists "melting ice caps" as one of the visible effects.' },
        { question: 'What are countries doing to address climate change?', options: ['Building more factories', 'Reducing emissions', 'Increasing fossil fuel use', 'Ignoring the problem'], correctAnswer: 1, explanation: 'The passage states "Many countries are now working together to reduce emissions."' },
        { question: 'What are examples of renewable energy sources mentioned?', options: ['Coal and oil', 'Solar and wind power', 'Nuclear power', 'Natural gas'], correctAnswer: 1, explanation: 'The passage mentions "renewable energy sources like solar and wind power."' },
      ],
    },
    B2: {
      passage: `The digital revolution has fundamentally transformed how we work, communicate, and access information. Remote work, once considered a luxury, has become the norm for many industries. This shift has brought both opportunities and challenges. On one hand, employees enjoy greater flexibility and work-life balance. Companies can access a global talent pool and reduce overhead costs. However, remote work also presents difficulties such as maintaining team cohesion, ensuring data security, and managing different time zones. Moreover, the constant connectivity can lead to burnout and blurred boundaries between work and personal life. As we move forward, organizations must find innovative ways to maintain productivity while supporting employee well-being.`,
      questions: [
        { question: 'What has become the norm according to the passage?', options: ['Office work', 'Remote work', 'Part-time work', 'Freelance work'], correctAnswer: 1, explanation: 'The passage states "Remote work, once considered a luxury, has become the norm for many industries."' },
        { question: 'What is one benefit of remote work for employees?', options: ['Higher salary', 'Greater flexibility', 'More meetings', 'Less technology'], correctAnswer: 1, explanation: 'The passage mentions "employees enjoy greater flexibility and work-life balance."' },
        { question: 'What challenge does remote work present?', options: ['Lower costs', 'Maintaining team cohesion', 'More job opportunities', 'Better communication'], correctAnswer: 1, explanation: 'The passage lists "maintaining team cohesion" as one of the difficulties.' },
        { question: 'What can constant connectivity lead to?', options: ['Better productivity', 'Burnout', 'More free time', 'Less stress'], correctAnswer: 1, explanation: 'The passage states "the constant connectivity can lead to burnout."' },
        { question: 'What must organizations do going forward?', options: ['Reduce remote work', 'Find innovative ways to maintain productivity', 'Increase office space', 'Reduce technology'], correctAnswer: 1, explanation: 'The passage concludes that organizations "must find innovative ways to maintain productivity while supporting employee well-being."' },
      ],
    },
    C1: {
      passage: `The concept of artificial intelligence has evolved from science fiction to tangible reality, permeating virtually every sector of modern society. Machine learning algorithms, capable of processing vast datasets and identifying patterns imperceptible to human cognition, are revolutionizing fields ranging from healthcare diagnostics to financial market analysis. However, this technological advancement raises profound ethical questions regarding privacy, autonomy, and the potential displacement of human labor. The implementation of AI systems necessitates careful consideration of algorithmic bias, transparency, and accountability. As we stand at the precipice of an AI-driven future, it is imperative that we establish robust regulatory frameworks that balance innovation with ethical safeguards.`,
      questions: [
        { question: 'What has AI evolved from according to the passage?', options: ['Laboratory experiments', 'Science fiction', 'Mathematical theory', 'Industrial automation'], correctAnswer: 1, explanation: 'The passage states "The concept of artificial intelligence has evolved from science fiction to tangible reality."' },
        { question: 'What capability of machine learning is mentioned?', options: ['Creating emotions', 'Processing vast datasets', 'Replacing humans completely', 'Working without data'], correctAnswer: 1, explanation: 'The passage mentions "Machine learning algorithms, capable of processing vast datasets."' },
        { question: 'What ethical question is raised?', options: ['Cost of AI', 'Privacy and autonomy', 'Speed of development', 'Complexity of algorithms'], correctAnswer: 1, explanation: 'The passage mentions "ethical questions regarding privacy, autonomy, and the potential displacement of human labor."' },
        { question: 'What must be considered when implementing AI systems?', options: ['Cost only', 'Algorithmic bias and transparency', 'Speed only', 'Popularity'], correctAnswer: 1, explanation: 'The passage states "The implementation of AI systems necessitates careful consideration of algorithmic bias, transparency, and accountability."' },
        { question: 'What is imperative according to the passage?', options: ['Stop AI development', 'Establish regulatory frameworks', 'Ignore ethical concerns', 'Focus only on innovation'], correctAnswer: 1, explanation: 'The passage concludes "it is imperative that we establish robust regulatory frameworks that balance innovation with ethical safeguards."' },
      ],
    },
    C2: {
      passage: `The epistemological foundations of scientific inquiry have been subject to rigorous philosophical scrutiny throughout history. The positivist paradigm, which posits that knowledge can only be derived from empirical observation and logical analysis, has been challenged by post-modernist critiques that question the objectivity of scientific methodology. These debates underscore the inherent complexity of establishing truth claims in an era characterized by information proliferation and competing narratives. The scientific method, while providing a systematic framework for investigation, is not immune to the influence of cultural, political, and economic factors that shape research priorities and interpretation of findings.`,
      questions: [
        { question: 'What has been subject to philosophical scrutiny?', options: ['Scientific experiments', 'Epistemological foundations', 'Laboratory equipment', 'Research funding'], correctAnswer: 1, explanation: 'The passage begins "The epistemological foundations of scientific inquiry have been subject to rigorous philosophical scrutiny."' },
        { question: 'What does the positivist paradigm posit?', options: ['Knowledge from intuition', 'Knowledge from empirical observation', 'Knowledge from tradition', 'Knowledge from authority'], correctAnswer: 1, explanation: 'The passage states the positivist paradigm "posits that knowledge can only be derived from empirical observation and logical analysis."' },
        { question: 'What do post-modernist critiques question?', options: ['The cost of science', 'The objectivity of scientific methodology', 'The speed of research', 'The complexity of experiments'], correctAnswer: 1, explanation: 'The passage mentions "post-modernist critiques that question the objectivity of scientific methodology."' },
        { question: 'What characterizes the current era?', options: ['Lack of information', 'Information proliferation', 'Simple narratives', 'Single truth'], correctAnswer: 1, explanation: 'The passage mentions "an era characterized by information proliferation and competing narratives."' },
        { question: 'What factors influence the scientific method?', options: ['Only technical factors', 'Cultural, political, and economic factors', 'Only economic factors', 'No external factors'], correctAnswer: 1, explanation: 'The passage states "The scientific method...is not immune to the influence of cultural, political, and economic factors."' },
      ],
    },
  };

  // Select appropriate passage based on topic first, then CEFR level or difficulty
  let selected: { passage: string; questions: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }> };
  
  // Try to find topic-specific passage
  if (topic && topicPassages[topic]) {
    const topicLevel = cefrLevel || (difficulty === 'Beginner' ? 'A1' : difficulty === 'Intermediate' ? 'B1' : 'C1');
    if (topicPassages[topic][topicLevel]) {
      selected = topicPassages[topic][topicLevel];
    } else {
      // Fallback to closest level in topic
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const targetIndex = levels.indexOf(topicLevel);
      let found = false;
      
      // Try levels near the target
      for (let i = 0; i < levels.length && !found; i++) {
        const tryIndex = targetIndex + (i % 2 === 0 ? i : -i);
        if (tryIndex >= 0 && tryIndex < levels.length && topicPassages[topic][levels[tryIndex]]) {
          selected = topicPassages[topic][levels[tryIndex]];
          found = true;
        }
      }
      
      // If still not found, use default
      if (!found) {
        if (cefrLevel && defaultPassages[cefrLevel]) {
          selected = defaultPassages[cefrLevel];
        } else if (difficulty === 'Beginner') {
          selected = defaultPassages.A1;
        } else if (difficulty === 'Intermediate') {
          selected = defaultPassages.B1;
        } else {
          selected = defaultPassages.C1;
        }
      }
    }
  } else {
    // No topic match, use default passages
    if (cefrLevel && defaultPassages[cefrLevel]) {
      selected = defaultPassages[cefrLevel];
    } else {
      // Fallback to difficulty
      if (difficulty === 'Beginner') {
        selected = defaultPassages.A1;
      } else if (difficulty === 'Intermediate') {
        selected = defaultPassages.B1;
      } else {
        selected = defaultPassages.C1;
      }
    }
  }

  // Get questions and ensure we have enough
  let questions = [...selected.questions];
  
  // If we need more questions, repeat with shuffled options
  while (questions.length < questionCount) {
    const additional = [...selected.questions].map(q => {
      const shuffled = shuffleOptionsAndUpdateAnswer(q.options, q.correctAnswer);
      return {
        ...q,
        options: shuffled.options,
        correctAnswer: shuffled.correctAnswer,
        question: `${q.question} (Question ${questions.length + 1})`,
      };
    });
    questions = [...questions, ...additional];
  }

  // Ensure balanced distribution
  const balancedQuestions = ensureBalancedAnswerDistribution(
    questions.slice(0, questionCount).map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: topic || 'Reading Comprehension',
    }))
  );

  return {
    passage: selected.passage,
    questions: balancedQuestions,
  };
}

/**
 * Generate quiz questions using AI
 */
export const generateQuizQuestions = async (
  topic: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  count: number = 5,
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
): Promise<Array<{
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
}>> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('At least one API key (Groq or Gemini) must be configured');
  }

  // Map CEFR level to appropriate difficulty description
  const cefrDescription = cefrLevel 
    ? ` The user's CEFR level is ${cefrLevel}. Generate questions that are appropriate for ${cefrLevel} level learners. `
    : '';
  
  const levelGuidance = cefrLevel 
    ? `CRITICAL: The user is at CEFR ${cefrLevel} level. Generate questions SPECIFICALLY tailored to ${cefrLevel} level:
- A1: Very basic vocabulary and simple sentence structures
- A2: Basic everyday vocabulary and simple grammar
- B1: Intermediate vocabulary and grammar, can handle familiar topics
- B2: Upper-intermediate, more complex structures and vocabulary
- C1: Advanced vocabulary and complex grammatical structures
- C2: Near-native level, sophisticated language use

Make sure the questions match the ${cefrLevel} level exactly. A ${cefrLevel} user should find these questions appropriately challenging but not too easy or too difficult.`
    : '';

  // Optimized prompt - shorter to save tokens
  const cefrInfo = cefrLevel ? `CEFR ${cefrLevel} level. ` : '';
  const levelNote = cefrLevel 
    ? `Questions must match ${cefrLevel} exactly: ${cefrLevel === 'A1' ? 'very basic' : cefrLevel === 'A2' ? 'basic' : cefrLevel === 'B1' ? 'intermediate' : cefrLevel === 'B2' ? 'upper-intermediate' : cefrLevel === 'C1' ? 'advanced' : 'near-native'} vocabulary/grammar.`
    : `${difficulty.toLowerCase()} level.`;

  const prompt = `Generate ${count} ${levelNote}English quiz questions about "${topic}".${cefrInfo}

Requirements:
- Distribute correct answers evenly (0,1,2,3) - NOT all in option A
- ${cefrLevel ? `Match ${cefrLevel} level exactly` : 'Match difficulty level'}
- 4 options per question. Vary correctAnswer (0-3) across questions.

CRITICAL - EXPLANATION for each question MUST be detailed and student-friendly (2-4 sentences):
1. State WHY the correct answer is correct, referring to the question or the rule.
2. If a wrong option is a common mistake, briefly say WHY it is wrong (e.g. "X is wrong because...").
3. Use simple language so a student can understand their mistake and learn. Do NOT give one-line or generic explanations.
4. Never leave explanation empty or as a single definition without applying it to the question.

Return ONLY JSON array (no markdown):
[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"Detailed 2-4 sentence explanation: why correct is correct, why key wrong options are wrong, in simple language.","topic":"${topic}"}]`;

  try {
    const estimatedTokens = Math.min(count * 200 + 400, 3200);
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return valid JSON array only. Keep explanations brief (1-2 sentences) so the response is not truncated.',
      estimatedTokens
    );
    let questions: any[];
    try {
      questions = parseAIResponse(response);
    } catch (parseErr) {
      questions = tryParseQuizQuestionsRepair(response) ?? [];
      if (questions.length === 0) throw parseErr;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI did not return a valid array of questions');
    }
    
    let processedQuestions = questions.map((q: any, index: number) => ({
      id: index + 1,
      question: q.question || `Question ${index + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4
        ? normalizeOptions(q.options.map((o: any) => String(o).trim()))
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0,
      explanation: q.explanation || 'No explanation provided',
      topic: q.topic || topic,
    }));
    
    // Ensure we have exactly the requested number of questions
    if (processedQuestions.length < count) {
      throw new Error(`AI generated only ${processedQuestions.length} questions, but ${count} were requested. Please try again.`);
    }
    // If we have more, take only the requested count
    if (processedQuestions.length > count) {
      processedQuestions = processedQuestions.slice(0, count);
    }
    
    // Ensure balanced answer distribution by shuffling ALL questions
    processedQuestions = ensureBalancedAnswerDistribution(processedQuestions);
    
    // Ensure we return exactly the requested count
    return processedQuestions.slice(0, count).map((q, index) => ({
      ...q,
      id: index + 1,
    }));
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    // No hard-coded fallback - throw error so component can handle it
    throw new Error('Failed to generate quiz questions. Please check your API keys and try again.');
  }
};

/**
 * Get default quiz questions as fallback when API fails
 * Questions are tailored to CEFR level
 */
function getDefaultQuizQuestions(
  topic: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  count: number,
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
): Array<{
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
}> {
  // Question pools by CEFR level
  const questionPools: Record<string, Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>> = {
    // A1 Level - Very basic (balanced answers: 0,1,2,3)
    A1: [
      { question: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], correctAnswer: 0, explanation: '"I" is always followed by "am" in the present tense.' },
      { question: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'went'], correctAnswer: 1, explanation: 'Third person singular (she) uses "goes" in present simple tense.' },
      { question: 'What is your ___?', options: ['name', 'named', 'naming', 'names'], correctAnswer: 2, explanation: '"Name" is a noun used to ask someone\'s identity.' },
      { question: 'I like ___ coffee.', options: ['drink', 'drinks', 'drinking', 'drank'], correctAnswer: 2, explanation: 'After "like" we use the -ing form of the verb.' },
      { question: 'This is ___ book.', options: ['a', 'an', 'the', 'some'], correctAnswer: 3, explanation: 'We use "a" before consonant sounds like "book".' },
      { question: 'How ___ you?', options: ['is', 'are', 'am', 'be'], correctAnswer: 1, explanation: '"You" is always followed by "are".' },
      { question: 'I ___ hungry.', options: ['am', 'is', 'are', 'be'], correctAnswer: 0, explanation: '"I" is always followed by "am".' },
      { question: 'She ___ English.', options: ['speak', 'speaks', 'speaking', 'spoke'], correctAnswer: 1, explanation: 'Third person singular uses "speaks".' },
      { question: 'Where ___ you from?', options: ['is', 'are', 'am', 'be'], correctAnswer: 1, explanation: '"You" is always followed by "are".' },
      { question: 'I have ___ apple.', options: ['a', 'an', 'the', 'some'], correctAnswer: 1, explanation: 'We use "an" before vowel sounds like "apple".' },
      { question: 'They ___ my friends.', options: ['is', 'are', 'am', 'be'], correctAnswer: 1, explanation: '"They" is always followed by "are".' },
      { question: 'He ___ a teacher.', options: ['am', 'is', 'are', 'be'], correctAnswer: 1, explanation: '"He" is always followed by "is".' },
      { question: 'We ___ students.', options: ['am', 'is', 'are', 'be'], correctAnswer: 2, explanation: '"We" is always followed by "are".' },
      { question: 'I ___ 20 years old.', options: ['am', 'is', 'are', 'be'], correctAnswer: 0, explanation: '"I" is always followed by "am".' },
      { question: 'She ___ a doctor.', options: ['am', 'is', 'are', 'be'], correctAnswer: 1, explanation: '"She" is always followed by "is".' },
      { question: 'You ___ very nice.', options: ['am', 'is', 'are', 'be'], correctAnswer: 2, explanation: '"You" is always followed by "are".' },
      { question: 'I ___ from Turkey.', options: ['am', 'is', 'are', 'be'], correctAnswer: 0, explanation: '"I" is always followed by "am".' },
      { question: 'He ___ my brother.', options: ['am', 'is', 'are', 'be'], correctAnswer: 1, explanation: '"He" is always followed by "is".' },
      { question: 'We ___ happy.', options: ['am', 'is', 'are', 'be'], correctAnswer: 2, explanation: '"We" is always followed by "are".' },
      { question: 'They ___ at home.', options: ['am', 'is', 'are', 'be'], correctAnswer: 2, explanation: '"They" is always followed by "are".' },
      { question: 'I ___ a book.', options: ['have', 'has', 'having', 'had'], correctAnswer: 0, explanation: '"I" uses "have" in present tense.' },
      { question: 'She ___ a cat.', options: ['have', 'has', 'having', 'had'], correctAnswer: 1, explanation: 'Third person singular uses "has".' },
      { question: 'We ___ a car.', options: ['have', 'has', 'having', 'had'], correctAnswer: 0, explanation: '"We" uses "have" in present tense.' },
      { question: 'They ___ two dogs.', options: ['have', 'has', 'having', 'had'], correctAnswer: 0, explanation: '"They" uses "have" in present tense.' },
      { question: 'He ___ a pen.', options: ['have', 'has', 'having', 'had'], correctAnswer: 1, explanation: 'Third person singular uses "has".' },
    ],
    // A2 Level - Basic (balanced answers)
    A2: [
      { question: 'I ___ to the cinema yesterday.', options: ['go', 'went', 'going', 'goes'], correctAnswer: 1, explanation: '"Went" is the past tense of "go".' },
      { question: 'She is ___ a book now.', options: ['read', 'reads', 'reading', 'readed'], correctAnswer: 2, explanation: 'Present continuous uses "is + -ing form".' },
      { question: 'I ___ never been to Paris.', options: ['have', 'has', 'had', 'having'], correctAnswer: 0, explanation: 'Present perfect with "I" uses "have".' },
      { question: 'He ___ play football when he was young.', options: ['used to', 'use to', 'uses to', 'using to'], correctAnswer: 3, explanation: '"Used to" expresses past habits.' },
      { question: 'I\'m not ___ tired.', options: ['very', 'much', 'many', 'more'], correctAnswer: 0, explanation: '"Very" is used before adjectives like "tired".' },
      { question: 'She ___ her homework every day.', options: ['do', 'does', 'doing', 'did'], correctAnswer: 1, explanation: 'Third person singular uses "does".' },
      { question: 'I want ___ a new car.', options: ['buy', 'to buy', 'buying', 'bought'], correctAnswer: 1, explanation: 'After "want" we use "to + verb".' },
      { question: 'This is the ___ book I\'ve ever read.', options: ['good', 'better', 'best', 'goodest'], correctAnswer: 2, explanation: '"Best" is the superlative form of "good".' },
      { question: 'I ___ speak English fluently.', options: ['can', 'could', 'should', 'must'], correctAnswer: 0, explanation: '"Can" expresses ability in the present.' },
      { question: 'She ___ to work by bus.', options: ['go', 'goes', 'going', 'went'], correctAnswer: 1, explanation: 'Present simple third person uses "goes".' },
      { question: 'I ___ my keys yesterday.', options: ['lose', 'lost', 'losing', 'loses'], correctAnswer: 1, explanation: '"Lost" is the past tense of "lose".' },
      { question: 'They ___ playing football.', options: ['is', 'are', 'am', 'be'], correctAnswer: 1, explanation: '"They" is always followed by "are".' },
      { question: 'I ___ finish my homework.', options: ['must', 'can', 'should', 'could'], correctAnswer: 0, explanation: '"Must" expresses obligation.' },
      { question: 'She ___ to the store tomorrow.', options: ['go', 'goes', 'will go', 'went'], correctAnswer: 2, explanation: 'Future tense uses "will + verb".' },
      { question: 'We ___ dinner at 7 PM.', options: ['eat', 'eats', 'eating', 'ate'], correctAnswer: 0, explanation: 'Present simple with "we" uses base form.' },
      { question: 'He ___ a letter last week.', options: ['write', 'writes', 'wrote', 'writing'], correctAnswer: 2, explanation: '"Wrote" is the past tense of "write".' },
      { question: 'I ___ like pizza.', options: ['do', 'does', 'doing', 'did'], correctAnswer: 0, explanation: '"I" uses "do" in present tense.' },
      { question: 'She ___ swimming every morning.', options: ['go', 'goes', 'going', 'went'], correctAnswer: 1, explanation: 'Third person singular uses "goes".' },
      { question: 'They ___ to the party last night.', options: ['go', 'goes', 'went', 'going'], correctAnswer: 2, explanation: '"Went" is the past tense of "go".' },
      { question: 'I ___ help you with that.', options: ['can', 'could', 'should', 'must'], correctAnswer: 0, explanation: '"Can" expresses ability or willingness.' },
      { question: 'She ___ her room yesterday.', options: ['clean', 'cleans', 'cleaned', 'cleaning'], correctAnswer: 2, explanation: '"Cleaned" is the past tense of "clean".' },
      { question: 'We ___ to the beach next week.', options: ['go', 'goes', 'will go', 'went'], correctAnswer: 2, explanation: 'Future tense uses "will + verb".' },
      { question: 'He ___ a new job last month.', options: ['find', 'finds', 'found', 'finding'], correctAnswer: 2, explanation: '"Found" is the past tense of "find".' },
      { question: 'I ___ my friend yesterday.', options: ['see', 'sees', 'saw', 'seeing'], correctAnswer: 2, explanation: '"Saw" is the past tense of "see".' },
      { question: 'They ___ English at school.', options: ['study', 'studies', 'studied', 'studying'], correctAnswer: 0, explanation: 'Present simple with "they" uses base form.' },
    ],
    // B1 Level - Intermediate
    B1: [
      { question: 'If I ___ rich, I would travel the world.', options: ['am', 'was', 'were', 'be'], correctAnswer: 2, explanation: 'Second conditional uses "were" for all subjects.' },
      { question: 'She ___ have called me yesterday.', options: ['should', 'could', 'might', 'must'], correctAnswer: 0, explanation: '"Should have" expresses regret about past actions.' },
      { question: 'The book ___ I bought yesterday is very interesting.', options: ['which', 'who', 'where', 'when'], correctAnswer: 0, explanation: '"Which" is used for things in relative clauses.' },
      { question: 'I wish I ___ studied harder.', options: ['have', 'had', 'would', 'could'], correctAnswer: 1, explanation: 'Past wish uses "had + past participle".' },
      { question: 'He ___ been working here for five years.', options: ['has', 'have', 'had', 'is'], correctAnswer: 0, explanation: 'Present perfect continuous uses "has been".' },
      { question: 'I\'m looking forward ___ meeting you.', options: ['to', 'for', 'at', 'in'], correctAnswer: 0, explanation: '"Look forward to" is followed by -ing form.' },
      { question: 'She suggested ___ to the beach.', options: ['go', 'going', 'to go', 'went'], correctAnswer: 1, explanation: 'After "suggest" we use -ing form.' },
      { question: 'I ___ rather stay home tonight.', options: ['would', 'should', 'could', 'might'], correctAnswer: 0, explanation: '"Would rather" expresses preference.' },
      { question: 'The movie was ___ interesting that I watched it twice.', options: ['so', 'such', 'too', 'very'], correctAnswer: 0, explanation: '"So + adjective + that" shows result.' },
      { question: 'He ___ me if I had finished the report.', options: ['asked', 'told', 'said', 'spoke'], correctAnswer: 0, explanation: '"Asked" is used for questions in reported speech.' },
    ],
    // B2 Level - Upper-intermediate
    B2: [
      { question: 'Had I known about the meeting, I ___ attended.', options: ['would have', 'will have', 'would', 'will'], correctAnswer: 0, explanation: 'Third conditional uses "would have + past participle".' },
      { question: 'Not only ___ she speak English, but she also speaks French.', options: ['does', 'do', 'did', 'is'], correctAnswer: 0, explanation: '"Not only" at the beginning requires inversion.' },
      { question: 'The project ___ by next month.', options: ['will complete', 'will be completed', 'completes', 'is completing'], correctAnswer: 1, explanation: 'Future passive uses "will be + past participle".' },
      { question: 'I\'d rather you ___ here right now.', options: ['are', 'were', 'be', 'being'], correctAnswer: 1, explanation: 'After "I\'d rather" we use past subjunctive "were".' },
      { question: 'She is ___ intelligent ___ hardworking.', options: ['both...and', 'either...or', 'neither...nor', 'not only...but also'], correctAnswer: 0, explanation: '"Both...and" connects two positive qualities.' },
      { question: 'The report ___ when I arrived.', options: ['was being written', 'was writing', 'wrote', 'writes'], correctAnswer: 0, explanation: 'Past continuous passive shows ongoing action in the past.' },
      { question: '___ he studied harder, he would have passed.', options: ['Had', 'If', 'Were', 'Should'], correctAnswer: 0, explanation: 'Inverted third conditional uses "Had + subject + past participle".' },
      { question: 'I object ___ being treated this way.', options: ['to', 'for', 'at', 'with'], correctAnswer: 0, explanation: '"Object to" is followed by -ing form.' },
      { question: 'The more you practice, ___ you become.', options: ['better', 'the better', 'best', 'the best'], correctAnswer: 1, explanation: 'Comparative structure "the more...the better".' },
      { question: 'She ___ have left already; her car is gone.', options: ['must', 'should', 'could', 'might'], correctAnswer: 0, explanation: '"Must have" expresses logical deduction about the past.' },
    ],
    // C1 Level - Advanced
    C1: [
      { question: '___ the complexity of the issue, a simple solution was found.', options: ['Despite', 'Although', 'However', 'Nevertheless'], correctAnswer: 0, explanation: '"Despite" is a preposition meaning "in spite of".' },
      { question: 'The proposal was met with ___ criticism from all sides.', options: ['widespread', 'wide', 'widely', 'width'], correctAnswer: 0, explanation: '"Widespread" is an adjective meaning "extensive".' },
      { question: 'Had it not been for your intervention, the situation ___ worse.', options: ['would have become', 'will become', 'becomes', 'became'], correctAnswer: 0, explanation: 'Third conditional with inversion.' },
      { question: 'The committee is ___ of reaching a consensus.', options: ['incapable', 'unable', 'impossible', 'incompetent'], correctAnswer: 0, explanation: '"Incapable of" means "not able to".' },
      { question: '___ as it may seem, the theory has been proven.', options: ['Improbable', 'Improbably', 'Improbability', 'Improbing'], correctAnswer: 0, explanation: '"Improbable as it may seem" is a concessive structure.' },
      { question: 'The research ___ light on previously unknown phenomena.', options: ['sheds', 'throws', 'gives', 'makes'], correctAnswer: 0, explanation: '"Shed light on" is an idiomatic expression meaning "to clarify".' },
      { question: 'His argument was ___ by numerous factual errors.', options: ['undermined', 'underlined', 'understood', 'undertaken'], correctAnswer: 0, explanation: '"Undermined" means "weakened" or "damaged".' },
      { question: 'The policy change was met with ___ opposition.', options: ['vehement', 'vehemently', 'vehemence', 'vehemency'], correctAnswer: 0, explanation: '"Vehement" is an adjective meaning "strong" or "intense".' },
      { question: '___ the evidence suggests otherwise, the theory remains unproven.', options: ['Notwithstanding', 'However', 'Although', 'Despite'], correctAnswer: 0, explanation: '"Notwithstanding" is a formal preposition meaning "despite".' },
      { question: 'The implications of the study are far-___.', options: ['reaching', 'reached', 'reach', 'reaches'], correctAnswer: 0, explanation: '"Far-reaching" is a compound adjective meaning "extensive".' },
    ],
    // C2 Level - Near-native
    C2: [
      { question: 'The politician\'s rhetoric was ___ with ambiguity, leaving little room for interpretation.', options: ['replete', 'replenish', 'replete', 'replica'], correctAnswer: 0, explanation: '"Replete with" means "full of" or "filled with".' },
      { question: 'Her argument was so ___ that it left no room for counter-argument.', options: ['cogent', 'cogent', 'cogency', 'cogently'], correctAnswer: 0, explanation: '"Cogent" means "convincing" or "well-reasoned".' },
      { question: 'The theory ___ scrutiny from even the most skeptical critics.', options: ['withstood', 'withhold', 'withdraw', 'withstand'], correctAnswer: 0, explanation: '"Withstood" means "resisted" or "endured".' },
      { question: 'His analysis was ___ nuanced that it revealed layers of complexity.', options: ['so', 'such', 'too', 'very'], correctAnswer: 0, explanation: '"So + adjective + that" structure showing degree.' },
      { question: 'The discourse was ___ by ideological presuppositions.', options: ['permeated', 'permeate', 'permeating', 'permeation'], correctAnswer: 0, explanation: '"Permeated" means "spread throughout" or "infused".' },
      { question: '___ the ostensibly contradictory evidence, the hypothesis remains tenable.', options: ['Notwithstanding', 'However', 'Although', 'Despite'], correctAnswer: 0, explanation: '"Notwithstanding" is formal and means "despite".' },
      { question: 'The methodology employed was ___ rigorous that it set a new standard.', options: ['so', 'such', 'too', 'very'], correctAnswer: 0, explanation: '"So + adjective + that" showing result.' },
      { question: 'Her critique ___ the fundamental assumptions underlying the theory.', options: ['interrogated', 'interrogate', 'interrogating', 'interrogation'], correctAnswer: 0, explanation: '"Interrogated" means "examined critically" or "questioned".' },
      { question: 'The argument was ___ by logical fallacies that undermined its validity.', options: ['vitiated', 'vitiate', 'vitiating', 'vitiation'], correctAnswer: 0, explanation: '"Vitiated" means "weakened" or "impaired".' },
      { question: '___ the paucity of empirical data, the conclusion remains speculative.', options: ['Given', 'Giving', 'Gave', 'Gives'], correctAnswer: 0, explanation: '"Given" as a preposition means "considering" or "taking into account".' },
    ],
  };

  // Select appropriate pool based on CEFR level, or use difficulty as fallback
  let selectedPool: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }>;
  
  if (cefrLevel && questionPools[cefrLevel]) {
    selectedPool = questionPools[cefrLevel];
  } else {
    // Fallback to difficulty-based selection
    if (difficulty === 'Beginner') {
      selectedPool = [...questionPools.A1, ...questionPools.A2];
    } else if (difficulty === 'Intermediate') {
      selectedPool = [...questionPools.B1, ...questionPools.B2];
    } else {
      selectedPool = [...questionPools.C1, ...questionPools.C2];
    }
  }

  // Shuffle and select questions
  const shuffled = [...selectedPool].sort(() => Math.random() - 0.5);
  const selected: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }> = [];
  
  // If we have enough questions, select randomly
  if (selectedPool.length >= count) {
    selected.push(...shuffled.slice(0, count));
  } else {
    // If we need more questions than available, repeat questions but shuffle options to vary them
    const repeatCount = Math.ceil(count / selectedPool.length);
    for (let i = 0; i < repeatCount; i++) {
      const roundShuffled = [...selectedPool].sort(() => Math.random() - 0.5);
      for (const q of roundShuffled) {
        if (selected.length >= count) break;
        // Shuffle options for repeated questions to create variation
        const shuffledQ = i > 0 ? shuffleOptionsAndUpdateAnswer(q.options, q.correctAnswer) : { options: q.options, correctAnswer: q.correctAnswer };
        selected.push({
          question: i > 0 ? `${q.question} (Question ${selected.length + 1})` : q.question,
          options: shuffledQ.options,
          correctAnswer: shuffledQ.correctAnswer,
          explanation: q.explanation,
        });
      }
    }
  }

  // Ensure balanced answer distribution
  const balancedQuestions = ensureBalancedAnswerDistribution(
    selected.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: topic,
    }))
  );

  // Ensure we return exactly the requested count
  return balancedQuestions.slice(0, count).map((q, index) => ({
    ...q,
    id: index + 1,
  }));
}

/** IELTS Academic Reading simulation: 40 questions, 60 minutes, past-paper style */
export type IELTSQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  section?: 1 | 2 | 3;
};

export type IELTSPassage = {
  section: 1 | 2 | 3;
  text: string;
  title?: string;
};

export type IELTSSimulationResult = {
  questions: IELTSQuestion[];
  passages: IELTSPassage[];
};

const IELTS_SIMULATION_PROMPT = `You are an expert IELTS Academic Reading test writer. Create a full IELTS Academic Reading simulation with 3 academic reading passages and 40 questions.

RULES:
- Create 3 academic reading passages (one for each section). Each passage should be 600-900 words, written in academic style on topics like: science, environment, history, psychology, technology, health, education (like real IELTS).
- Exactly 40 questions total. Split across 3 sections (e.g. ~13–14 per section). Section 1 slightly easier, Section 3 hardest.
- 60 minutes total (like the real test). Questions should reflect real IELTS past papers and official sample tests.
- Use REAL IELTS question types in a realistic mix:
  1. Multiple choice (4 options A–D): "Choose the correct letter, A, B, C or D."
  2. True / False / Not Given (3 options): "Do the following statements agree with the information in the text?"
  3. Yes / No / Not Given (3 options): "Do the following statements agree with the views/claims of the writer?"
- Each "question" must be self-contained: include the specific statement or stem. For MCQ, give the full question and 4 options. For T/F/NG or Y/N/NG, give the statement and options ["True", "False", "Not given"] or ["Yes", "No", "Not given"] as appropriate.
- correctAnswer is the 0-based index of the correct option.
- explanation: brief, educational explanation referring to IELTS skills (e.g. scanning, inference, writer's view).

IMPORTANT: Distribute correct answers randomly across all options. For multiple choice questions (4 options), vary the correctAnswer values (0, 1, 2, 3) evenly. For True/False/Not Given and Yes/No/Not Given questions (3 options), vary the correctAnswer values (0, 1, 2) evenly. Do NOT put all or most correct answers in the first option.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "passages": [
    { "section": 1, "title": "Passage Title for Section 1", "text": "Full academic reading passage text (600-900 words)..." },
    { "section": 2, "title": "Passage Title for Section 2", "text": "Full academic reading passage text (600-900 words)..." },
    { "section": 3, "title": "Passage Title for Section 3", "text": "Full academic reading passage text (600-900 words)..." }
  ],
  "questions": [
    { "question": "...", "options": ["A", "B", "C", "D"] or ["True","False","Not given"] or ["Yes","No","Not given"], "correctAnswer": 0, "explanation": "...", "topic": "e.g. IELTS Reading Section 1", "section": 1 },
    ... 40 items ...
  ]
}`;

type IELTSQuestionInput = Omit<IELTSQuestion, 'id'>;

function getDefaultIELTSQuestions(): IELTSQuestion[] {
  const pool: IELTSQuestionInput[] = [
    { question: 'According to the passage, renewable energy sources have become more cost-effective in the last decade.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The text states that costs have fallen significantly over the past ten years.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The writer suggests that urbanisation will slow down by 2050.', options: ['Yes', 'No', 'Not given'], correctAnswer: 1, explanation: 'The writer claims urbanisation will continue to accelerate, not slow.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'What is the main focus of the first paragraph?', options: ['Historical migration patterns', 'The impact of technology on cities', 'Definitions of sustainable development', 'Population growth in Asia'], correctAnswer: 1, explanation: 'The opening paragraph centres on how technology has changed urban life.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The study mentioned found a direct link between sleep loss and productivity.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The passage clearly states that the research established this connection.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'Does the author believe that recycling alone can solve plastic pollution?', options: ['Yes', 'No', 'Not given'], correctAnswer: 1, explanation: 'The author argues that recycling is insufficient without reducing consumption.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'According to the text, which factor contributes most to species extinction?', options: ['Climate change', 'Habitat destruction', 'Hunting', 'Pollution'], correctAnswer: 1, explanation: 'The passage identifies habitat loss as the primary cause.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The passage states that all participants in the experiment improved their scores.', options: ['True', 'False', 'Not given'], correctAnswer: 1, explanation: 'The text says only a majority improved; not all did.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The writer argues that traditional teaching methods are obsolete.', options: ['Yes', 'No', 'Not given'], correctAnswer: 2, explanation: 'The writer compares methods but does not claim traditional ones are obsolete.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'What does the passage say about early human migration?', options: ['It occurred mainly by sea', 'It was driven by climate change', 'It happened in a single wave', 'It followed river valleys'], correctAnswer: 1, explanation: 'The text links migration to climatic shifts.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'Remote work has been proven to reduce carbon emissions.', options: ['True', 'False', 'Not given'], correctAnswer: 2, explanation: 'The passage discusses remote work but does not cite such proof.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'According to the passage, social media has increased political engagement among young voters.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The text states that youth turnout has risen with social media use.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'Does the author support the construction of more nuclear power plants?', options: ['Yes', 'No', 'Not given'], correctAnswer: 2, explanation: 'The author presents both pros and cons without taking a clear stance.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The primary purpose of the second paragraph is to:', options: ['Introduce a controversial theory', 'Summarise earlier research', 'Define key terms', 'Present opposing views'], correctAnswer: 2, explanation: 'The paragraph focuses on defining the main concepts used later.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'Ocean acidification is mentioned as a threat to coral reefs.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The passage explicitly cites acidification as a major threat.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'The writer claims that artificial intelligence will replace most manual jobs by 2030.', options: ['Yes', 'No', 'Not given'], correctAnswer: 1, explanation: 'The writer says AI will change many jobs but not replace most.', topic: 'IELTS Reading Section 1', section: 1 },
    { question: 'According to the text, what was the main limitation of the 2019 study?', options: ['Small sample size', 'Short duration', 'Limited geographical scope', 'Lack of a control group'], correctAnswer: 2, explanation: 'The passage notes that only one region was studied.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The passage states that antibiotics are effective against viral infections.', options: ['True', 'False', 'Not given'], correctAnswer: 1, explanation: 'The text states antibiotics do not work against viruses.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Does the author believe that economic growth always benefits the environment?', options: ['Yes', 'No', 'Not given'], correctAnswer: 1, explanation: 'The author argues that growth often harms the environment.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Which of the following best describes the structure of the passage?', options: ['Chronological narrative', 'Problem and solution', 'Comparison and contrast', 'Cause and effect'], correctAnswer: 3, explanation: 'The passage organises ideas around causes and their effects.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The research found a correlation between screen time and sleep quality in teenagers.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The study is described as having found this correlation.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The writer suggests that universities should prioritise vocational training over theory.', options: ['Yes', 'No', 'Not given'], correctAnswer: 2, explanation: 'The writer discusses both but does not recommend prioritising one.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'According to the passage, why did the project fail initially?', options: ['Insufficient funding', 'Poor leadership', 'Lack of community support', 'Technical difficulties'], correctAnswer: 2, explanation: 'The text identifies missing community support as the main reason.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Biodiversity loss is reversible in most ecosystems, according to the text.', options: ['True', 'False', 'Not given'], correctAnswer: 1, explanation: 'The passage states that many changes are irreversible.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Does the author endorse government regulation of social media content?', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The author explicitly argues in favour of such regulation.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The main conclusion of the report is that:', options: ['Costs will continue to fall', 'Demand will exceed supply', 'Alternative materials are needed', 'Existing policies are sufficient'], correctAnswer: 2, explanation: 'The report concludes that alternatives to current materials are essential.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The passage states that all surveyed countries have met their emissions targets.', options: ['True', 'False', 'Not given'], correctAnswer: 1, explanation: 'The text says only a minority have met the targets.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The writer argues that history education should focus less on dates and more on skills.', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The writer explicitly supports this shift in focus.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'According to the text, what distinguishes the new approach from previous ones?', options: ['It uses older data', 'It involves local communities', 'It is fully automated', 'It focuses only on cost'], correctAnswer: 1, explanation: 'The passage highlights community involvement as the key difference.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Psychological stress has been shown to weaken the immune system.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The passage cites research supporting this claim.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The writer believes that automation will create more jobs than it eliminates.', options: ['Yes', 'No', 'Not given'], correctAnswer: 2, explanation: 'The writer presents different views without stating a personal belief.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'Which statement best reflects the author\'s view on innovation?', options: ['It is driven mainly by profit', 'It should be guided by ethics', 'It cannot be regulated', 'It benefits all equally'], correctAnswer: 1, explanation: 'The author argues that ethical guidance is necessary.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'The passage suggests that early intervention programmes have long-term benefits.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The text describes studies showing sustained positive effects.', topic: 'IELTS Reading Section 2', section: 2 },
    { question: 'According to the passage, the main obstacle to universal healthcare is:', options: ['Medical shortages', 'Political will', 'Public opposition', 'Technical capacity'], correctAnswer: 1, explanation: 'The text identifies political will as the primary barrier.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The writer claims that linguistic diversity is decreasing globally.', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The writer states that many languages are disappearing.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The theory discussed in the third section has been widely accepted by experts.', options: ['True', 'False', 'Not given'], correctAnswer: 1, explanation: 'The passage notes that the theory remains controversial.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'What is the significance of the 2020 study mentioned?', options: ['It was the first of its kind', 'It challenged previous assumptions', 'It focused on elderly populations', 'It was conducted across multiple continents'], correctAnswer: 1, explanation: 'The text states the study questioned earlier findings.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The author implies that economic inequality is worsening in developed nations.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The author suggests that inequality has increased in these countries.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'Does the writer support the use of censorship in scientific publishing?', options: ['Yes', 'No', 'Not given'], correctAnswer: 1, explanation: 'The writer opposes censorship and advocates for open debate.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The passage concludes that behavioural change is more effective than technology in reducing emissions.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The conclusion states that lifestyle changes matter more than tech alone.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The writer suggests that cultural preservation should receive more funding.', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The writer argues that current funding is insufficient.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'According to the text, why do some critics oppose the proposed policy?', options: ['It is too expensive', 'It lacks evidence', 'It ignores rural areas', 'It favours certain industries'], correctAnswer: 2, explanation: 'The passage states that rural neglect is a key criticism.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The research methodology has been criticised for possible bias.', options: ['True', 'False', 'Not given'], correctAnswer: 0, explanation: 'The text mentions criticism regarding methodological bias.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The author argues that interdisciplinary approaches are essential for solving complex problems.', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The author explicitly makes this argument.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'Which of the following would the author most likely support?', options: ['Reducing funding for arts', 'Stricter environmental laws', 'Privatising public services', 'Limiting international trade'], correctAnswer: 1, explanation: 'The author\'s arguments align with stronger environmental regulation.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The passage states that the phenomenon was first observed in the 1990s.', options: ['True', 'False', 'Not given'], correctAnswer: 2, explanation: 'No specific decade for first observation is given.', topic: 'IELTS Reading Section 3', section: 3 },
    { question: 'The writer believes that public opinion will eventually force policy change.', options: ['Yes', 'No', 'Not given'], correctAnswer: 0, explanation: 'The writer states that sustained public pressure will lead to change.', topic: 'IELTS Reading Section 3', section: 3 },
  ];
  shuffle(pool);
  return pool.slice(0, 40).map((q, i) => ({ ...q, id: i + 1 }));
}

function getDefaultIELTSPassages(): IELTSPassage[] {
  return [
    {
      section: 1,
      title: "The Future of Renewable Energy",
      text: "Renewable energy sources have become increasingly cost-effective over the past decade, transforming the global energy landscape. Solar and wind power technologies have seen dramatic cost reductions, making them competitive with traditional fossil fuels in many regions. Governments worldwide are investing heavily in renewable infrastructure, recognizing both the environmental benefits and economic opportunities. The transition to clean energy is not just an environmental imperative but also an economic one, as countries seek to reduce their dependence on imported fossil fuels and create new jobs in the green energy sector. However, challenges remain, including the need for improved energy storage solutions and grid modernization to accommodate intermittent renewable sources."
    },
    {
      section: 2,
      title: "Urban Development and Sustainability",
      text: "Urbanization continues to accelerate globally, with more than half of the world's population now living in cities. This rapid growth presents both opportunities and challenges for sustainable development. Cities are centers of innovation and economic activity, but they also consume vast amounts of resources and generate significant pollution. Sustainable urban planning requires balancing economic growth with environmental protection and social equity. Key strategies include developing efficient public transportation systems, promoting green building practices, and creating green spaces that improve air quality and quality of life. The success of these initiatives depends on collaboration between governments, businesses, and communities."
    },
    {
      section: 3,
      title: "Cognitive Science and Learning",
      text: "Recent advances in cognitive science have revolutionized our understanding of how people learn. Research has shown that effective learning involves active engagement, spaced repetition, and the application of knowledge in varied contexts. Traditional teaching methods that rely heavily on lectures and memorization are being supplemented with more interactive approaches that encourage critical thinking and problem-solving. The integration of technology in education has opened new possibilities for personalized learning, allowing students to progress at their own pace and receive immediate feedback. However, educators must carefully balance technological tools with human interaction, as social learning remains crucial for developing communication skills and emotional intelligence."
    }
  ];
}

export const generateIELTSSimulation = async (): Promise<IELTSSimulationResult> => {
  const defaultQuestions = getDefaultIELTSQuestions();
  const defaultPassages = getDefaultIELTSPassages();

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    return {
      questions: defaultQuestions,
      passages: defaultPassages
    };
  }

  try {
    // IELTS needs more tokens (40 questions + 3 passages)
    const response = await callAIWithBackup(
      IELTS_SIMULATION_PROMPT,
      'IELTS exam writer. Return JSON object with passages and questions.',
      4000 // More tokens for passages and questions
    );
    const raw = parseAIResponse(response);
    
    // Handle both old format (array) and new format (object with passages and questions)
    let passages: IELTSPassage[] = defaultPassages;
    let questionsArray: any[] = [];

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      // New format: { passages: [...], questions: [...] }
      if (Array.isArray(raw.passages)) {
        passages = raw.passages.map((p: any) => ({
          section: typeof p.section === 'number' && p.section >= 1 && p.section <= 3 ? (p.section as 1 | 2 | 3) : 1,
          title: typeof p.title === 'string' ? p.title : `Section ${p.section || 1}`,
          text: typeof p.text === 'string' && p.text.trim() ? p.text.trim() : defaultPassages[(p.section || 1) - 1].text
        }));
      }
      if (Array.isArray(raw.questions)) {
        questionsArray = raw.questions;
      }
    } else if (Array.isArray(raw)) {
      // Old format: just questions array
      questionsArray = raw;
    }

    if (questionsArray.length < 20) {
      throw new Error('IELTS simulation did not return enough questions');
    }

    let processedQuestions = questionsArray.slice(0, 40).map((q: any, i: number) => {
      const opts = Array.isArray(q.options) && q.options.length >= 2
        ? q.options
        : ['True', 'False', 'Not given'];
      const idx = typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < opts.length
        ? q.correctAnswer
        : 0;
      return {
        id: i + 1,
        question: typeof q.question === 'string' && q.question.trim() ? q.question.trim() : `Question ${i + 1}`,
        options: opts,
        correctAnswer: idx,
        explanation: typeof q.explanation === 'string' ? q.explanation : 'See the passage.',
        topic: typeof q.topic === 'string' ? q.topic : 'IELTS Reading',
        section: typeof q.section === 'number' && q.section >= 1 && q.section <= 3 ? (q.section as 1 | 2 | 3) : undefined,
      };
    });
    
    // Ensure balanced answer distribution by shuffling if needed
    processedQuestions = ensureBalancedAnswerDistribution(processedQuestions);
    
    // Ensure we have 3 passages (one for each section)
    const finalPassages: IELTSPassage[] = [];
    for (let i = 1; i <= 3; i++) {
      const existing = passages.find(p => p.section === i);
      if (existing) {
        finalPassages.push(existing);
      } else {
        finalPassages.push(defaultPassages[i - 1]);
      }
    }
    
    return {
      questions: processedQuestions,
      passages: finalPassages
    };
  } catch (e) {
    console.warn('IELTS simulation: AI failed, using built-in questions and passages.', e);
    return {
      questions: defaultQuestions,
      passages: defaultPassages
    };
  }
};

/** CEFR levels for placement test */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * CEFR level weights for placement test scoring.
 * Higher levels have higher weights to accurately assess user's true level.
 */
const CEFR_WEIGHTS: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

/**
 * Calculate weighted score from placement test answers.
 * @param questions Array of questions with weights
 * @param answers Array of boolean answers (true = correct, false = incorrect, null = unanswered)
 * @returns Weighted score percentage (0-100)
 */
export const calculateWeightedScore = (
  questions: PlacementQuestion[],
  answers: (boolean | null)[]
): number => {
  let totalWeight = 0;
  let earnedWeight = 0;
  
  questions.forEach((q, index) => {
    const answer = answers[index];
    totalWeight += q.weight;
    if (answer === true) {
      earnedWeight += q.weight;
    }
  });
  
  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
};

/**
 * Map weighted placement test score (0–100) to CEFR level.
 * Calibrated for weighted scoring where higher-level questions matter more.
 */
export const scoreToCEFR = (scorePercent: number): CEFRLevel => {
  if (scorePercent <= 15) return 'A1';
  if (scorePercent <= 30) return 'A2';
  if (scorePercent <= 50) return 'B1';
  if (scorePercent <= 70) return 'B2';
  if (scorePercent <= 85) return 'C1';
  return 'C2';
};

export type PlacementQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  /** CEFR level of this question (A1-C2) */
  cefrLevel: CEFRLevel;
  /** Weight for scoring (higher = more important) */
  weight: number;
};

/**
 * Shuffle array (Fisher–Yates). Mutates and returns the same array.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Default placement questions (A1–C2 mix). Used when API keys are missing or API fails.
 * Questions are distributed across CEFR levels with appropriate weights.
 * Distribution for 18 questions: A1(3), A2(3), B1(4), B2(4), C1(2), C2(2)
 */
export function getDefaultPlacementQuestions(count: number = 18): PlacementQuestion[] {
  const poolByLevel: Record<CEFRLevel, Omit<PlacementQuestion, 'id'>[]> = {
    A1: [
      { question: 'What ___ your name?', options: ['is', 'are', 'be', 'am'], correctAnswer: 0, explanation: '"What is your name?" uses "is" with singular "name".', topic: 'Grammar', cefrLevel: 'A1', weight: CEFR_WEIGHTS.A1 },
      { question: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correctAnswer: 1, explanation: 'Third person singular (she) takes "goes".', topic: 'Grammar', cefrLevel: 'A1', weight: CEFR_WEIGHTS.A1 },
      { question: 'I have ___ apple and ___ orange.', options: ['a / a', 'an / an', 'a / an', 'an / a'], correctAnswer: 1, explanation: '"an" before vowel sounds (apple, orange).', topic: 'Grammar', cefrLevel: 'A1', weight: CEFR_WEIGHTS.A1 },
      { question: 'The book is ___ the table.', options: ['in', 'on', 'at', 'by'], correctAnswer: 1, explanation: 'We use "on" for surfaces (table).', topic: 'Grammar', cefrLevel: 'A1', weight: CEFR_WEIGHTS.A1 },
      { question: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], correctAnswer: 0, explanation: '"I" takes "am" in present tense.', topic: 'Grammar', cefrLevel: 'A1', weight: CEFR_WEIGHTS.A1 },
    ],
    A2: [
      { question: 'They ___ watching TV when I arrived.', options: ['was', 'were', 'is', 'are'], correctAnswer: 1, explanation: 'Past continuous: "they" + "were" + -ing.', topic: 'Grammar', cefrLevel: 'A2', weight: CEFR_WEIGHTS.A2 },
      { question: 'She is ___ than her sister.', options: ['tall', 'taller', 'tallest', 'more tall'], correctAnswer: 1, explanation: 'Comparative: short adjective + -er.', topic: 'Grammar', cefrLevel: 'A2', weight: CEFR_WEIGHTS.A2 },
      { question: 'I ___ already finished my homework.', options: ['has', 'have', 'had', 'having'], correctAnswer: 1, explanation: '"I" takes "have"; present perfect.', topic: 'Grammar', cefrLevel: 'A2', weight: CEFR_WEIGHTS.A2 },
      { question: 'What does "postpone" mean?', options: ['to cancel', 'to delay', 'to finish', 'to start'], correctAnswer: 1, explanation: '"Postpone" means to delay or put off.', topic: 'Vocabulary', cefrLevel: 'A2', weight: CEFR_WEIGHTS.A2 },
      { question: 'We should ___ off the meeting until next week.', options: ['put', 'take', 'call', 'set'], correctAnswer: 0, explanation: '"Put off" = postpone.', topic: 'Vocabulary', cefrLevel: 'A2', weight: CEFR_WEIGHTS.A2 },
    ],
    B1: [
      { question: 'If it ___, we will stay at home.', options: ['rain', 'rains', 'rained', 'raining'], correctAnswer: 1, explanation: 'First conditional: if + present, will + base.', topic: 'Grammar', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
      { question: 'We need to ___ the project by Friday.', options: ['complete', 'completing', 'completed', 'completes'], correctAnswer: 0, explanation: '"need to" + base form (complete).', topic: 'Grammar', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
      { question: 'He asked me where I ___.', options: ['live', 'lived', 'living', 'lives'], correctAnswer: 1, explanation: 'Reported speech: present → past (live → lived).', topic: 'Grammar', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
      { question: 'The meeting was ___ successful.', options: ['high', 'highly', 'height', 'higher'], correctAnswer: 1, explanation: '"Highly" is the adverb (modifies "successful").', topic: 'Vocabulary', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
      { question: 'She ___ her job last month.', options: ['resigned from', 'resigned', 'resign', 'resigning'], correctAnswer: 0, explanation: '"Resign from" a job is the correct phrase.', topic: 'Vocabulary', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
      { question: 'The opposite of "expand" is ___.', options: ['extend', 'contract', 'grow', 'increase'], correctAnswer: 1, explanation: '"Contract" means to shrink or reduce.', topic: 'Vocabulary', cefrLevel: 'B1', weight: CEFR_WEIGHTS.B1 },
    ],
    B2: [
      { question: 'Despite the ___, the event went ahead.', options: ['weather', 'weathers', 'weathering', 'weather\'s'], correctAnswer: 0, explanation: '"Despite" + noun. "Weather" is uncountable.', topic: 'Grammar', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
      { question: 'Neither the manager nor the employees ___ present.', options: ['was', 'were', 'is', 'are'], correctAnswer: 1, explanation: 'With "nor", verb agrees with closer subject ("employees").', topic: 'Grammar', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
      { question: 'The report ___ by the team last week.', options: ['written', 'was written', 'wrote', 'is written'], correctAnswer: 1, explanation: 'Passive past: was/were + past participle.', topic: 'Grammar', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
      { question: 'I wish I ___ more time.', options: ['have', 'had', 'would have', 'having'], correctAnswer: 1, explanation: 'Unreal wish about present: past simple "had".', topic: 'Grammar', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
      { question: 'He ___ his success to hard work.', options: ['attributes', 'contributes', 'distributes', 'assigns'], correctAnswer: 0, explanation: '"Attribute X to Y" = credit X to Y.', topic: 'Vocabulary', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
      { question: 'The company is ___ expanding into Asia.', options: ['considering', 'regarding', 'according', 'depending'], correctAnswer: 0, explanation: '"Consider" + -ing = think about doing.', topic: 'Vocabulary', cefrLevel: 'B2', weight: CEFR_WEIGHTS.B2 },
    ],
    C1: [
      { question: 'By next year, she ___ university.', options: ['will finish', 'finishes', 'will have finished', 'has finished'], correctAnswer: 2, explanation: 'Future perfect: "by" + future time → will have + past participle.', topic: 'Grammar', cefrLevel: 'C1', weight: CEFR_WEIGHTS.C1 },
      { question: '___ you mind opening the window?', options: ['Do', 'Would', 'Should', 'Could'], correctAnswer: 1, explanation: '"Would you mind" is the polite request form.', topic: 'Grammar', cefrLevel: 'C1', weight: CEFR_WEIGHTS.C1 },
      { question: '"Comprehensive" means ___.', options: ['brief', 'partial', 'complete', 'simple'], correctAnswer: 2, explanation: '"Comprehensive" = complete, covering everything.', topic: 'Vocabulary', cefrLevel: 'C1', weight: CEFR_WEIGHTS.C1 },
      { question: 'We must ___ to the new regulations.', options: ['adapt', 'adopt', 'adept', 'affect'], correctAnswer: 0, explanation: '"Adapt" = adjust to; "adopt" = take on.', topic: 'Vocabulary', cefrLevel: 'C1', weight: CEFR_WEIGHTS.C1 },
    ],
    C2: [
      { question: 'The findings ___ further investigation.', options: ['warrant', 'warn', 'waste', 'wander'], correctAnswer: 0, explanation: '"Warrant" = justify or deserve.', topic: 'Vocabulary', cefrLevel: 'C2', weight: CEFR_WEIGHTS.C2 },
      { question: 'He ___ that he had made a mistake.', options: ['acknowledged', 'accorded', 'acquired', 'accused'], correctAnswer: 0, explanation: '"Acknowledge" = admit or recognize.', topic: 'Vocabulary', cefrLevel: 'C2', weight: CEFR_WEIGHTS.C2 },
      { question: 'Everyone ___ to submit the form by Friday.', options: ['is required', 'are required', 'require', 'requires'], correctAnswer: 0, explanation: 'Indefinite "everyone" is singular → "is required".', topic: 'Grammar', cefrLevel: 'C2', weight: CEFR_WEIGHTS.C2 },
      { question: 'Not until yesterday ___ the news.', options: ['I heard', 'did I hear', 'I have heard', 'had I heard'], correctAnswer: 1, explanation: 'Inversion after "not until": did I hear.', topic: 'Grammar', cefrLevel: 'C2', weight: CEFR_WEIGHTS.C2 },
    ],
  };

  // Distribute questions across levels: A1(3), A2(3), B1(4), B2(4), C1(2), C2(2) = 18 total
  const distribution: Record<CEFRLevel, number> = {
    A1: 3,
    A2: 3,
    B1: 4,
    B2: 4,
    C1: 2,
    C2: 2,
  };

  const selected: Omit<PlacementQuestion, 'id'>[] = [];
  
  // Select questions from each level
  (Object.keys(distribution) as CEFRLevel[]).forEach(level => {
    const needed = distribution[level];
    const levelPool = shuffle([...poolByLevel[level]]);
    selected.push(...levelPool.slice(0, needed));
  });

  // Shuffle all selected questions
  const shuffled = shuffle(selected);
  
  // Add IDs and ensure balanced answer distribution
  let result = shuffled.map((q, i) => ({ ...q, id: i + 1 }));
  result = ensureBalancedAnswerDistribution(result);
  
  return result;
}

/**
 * Generate placement test questions (15–20). Mixed grammar & vocabulary, A1–C2 range.
 * Uses AI when API keys are set; otherwise returns built-in questions.
 */
export const generatePlacementQuestions = async (
  count: number = 18
): Promise<PlacementQuestion[]> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    return getDefaultPlacementQuestions(count);
  }

  const variation = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  
  // Distribute questions across CEFR levels: A1(3), A2(3), B1(4), B2(4), C1(2), C2(2) = 18 total
  const distribution: Record<CEFRLevel, number> = {
    A1: 3,
    A2: 3,
    B1: 4,
    B2: 4,
    C1: 2,
    C2: 2,
  };
  
  const prompt = `You are an expert English assessor creating a CEFR placement test. Generate a completely NEW, UNIQUE set of exactly ${count} questions (request id: ${variation}). Never repeat the same questions across different requests.

CRITICAL DISTRIBUTION REQUIREMENTS:
- A1 level: ${distribution.A1} questions (weight: 1) - Very basic grammar and vocabulary
- A2 level: ${distribution.A2} questions (weight: 2) - Basic grammar and common vocabulary
- B1 level: ${distribution.B1} questions (weight: 3) - Intermediate grammar and vocabulary
- B2 level: ${distribution.B2} questions (weight: 4) - Upper-intermediate grammar and vocabulary
- C1 level: ${distribution.C1} questions (weight: 5) - Advanced grammar and vocabulary
- C2 level: ${distribution.C2} questions (weight: 6) - Near-native grammar and vocabulary

IMPORTANT:
- Create fresh questions every time. Avoid the most common textbook examples (e.g. "What is your name?", "She goes to school").
- Vary grammar points: different tenses, conditionals, modals, passives, reported speech, articles, prepositions.
- Vary vocabulary: phrasal verbs, collocations, formal/informal register, idioms, word formation.
- Each question must have exactly 4 options. correctAnswer is the index 0–3.
- CRITICAL: Distribute correct answers evenly across all options (0, 1, 2, 3). Do NOT put consecutive correct answers in the same option. Vary them so no more than 2 consecutive questions have the same correctAnswer index.
- Each question MUST include its CEFR level (cefrLevel) and weight matching the level.

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation",
    "topic": "Grammar" or "Vocabulary",
    "cefrLevel": "A1" (or A2, B1, B2, C1, C2),
    "weight": 1 (matching the cefrLevel: A1=1, A2=2, B1=3, B2=4, C1=5, C2=6)
  }
]`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return JSON array of placement questions only.',
      2000 // Placement tests need more tokens
    );
    const raw = parseAIResponse(response);

    if (!Array.isArray(raw) || raw.length === 0) {
      return getDefaultPlacementQuestions(count);
    }

    let processedQuestions = raw.slice(0, count).map((q: any, index: number) => {
      const cefrLevel = (q.cefrLevel && ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(q.cefrLevel)) 
        ? q.cefrLevel as CEFRLevel 
        : 'B1'; // Default to B1 if invalid
      const weight = typeof q.weight === 'number' && q.weight > 0 
        ? q.weight 
        : CEFR_WEIGHTS[cefrLevel];
      
      return {
        id: index + 1,
        question: q.question || `Question ${index + 1}`,
        options:
          Array.isArray(q.options) && q.options.length === 4
            ? q.options
            : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer:
          typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
            ? q.correctAnswer
            : 0,
        explanation: q.explanation || 'No explanation provided',
        topic: q.topic || 'Grammar',
        cefrLevel,
        weight,
      };
    });
    
    // If AI didn't provide proper distribution, redistribute questions
    const levelCounts: Record<CEFRLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    processedQuestions.forEach(q => levelCounts[q.cefrLevel]++);
    
    // If distribution is off, use default questions instead
    const expectedDistribution: Record<CEFRLevel, number> = {
      A1: 3, A2: 3, B1: 4, B2: 4, C1: 2, C2: 2,
    };
    const distributionValid = Object.keys(expectedDistribution).every(
      level => Math.abs(levelCounts[level as CEFRLevel] - expectedDistribution[level as CEFRLevel]) <= 1
    );
    
    if (!distributionValid) {
      console.warn('AI questions distribution invalid, using default questions');
      return getDefaultPlacementQuestions(count);
    }
    
    // Ensure balanced answer distribution
    processedQuestions = ensureBalancedAnswerDistribution(processedQuestions);
    
    return processedQuestions;
  } catch (error) {
    console.warn('Placement test AI failed, using default questions:', error);
    return getDefaultPlacementQuestions(count);
  }
};

/**
 * Context for personalized tips (quiz, writing, speaking).
 * More fields = more personalized tips.
 */
export type TipsContext = {
  averageScore?: number;
  totalActivities?: number;
  cefrLevel?: string | null;
  /** Quiz-specific */
  totalQuizzes?: number;
  quizAvgScore?: number;
  quizBestScore?: number;
  quizPerfectScores?: number;
  courseSummary?: string;
  /** Writing-specific */
  totalEssays?: number;
  totalWords?: number;
  /** Speaking-specific */
  totalRecordings?: number;
  avgPronunciation?: number;
};

/**
 * Generate personalized tips using AI. Tips must vary by user level and performance.
 */
export const generatePersonalizedTips = async (
  type: 'quiz' | 'writing' | 'speaking',
  context?: TipsContext
): Promise<string[]> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    return getDefaultTips(type);
  }

  const parts: string[] = [];
  if (context?.cefrLevel) parts.push(`CEFR level: ${context.cefrLevel}`);
  if (context?.averageScore != null) parts.push(`Overall average score: ${context.averageScore}%`);
  if (context?.totalActivities != null) parts.push(`Total activities completed: ${context.totalActivities}`);
  if (type === 'quiz') {
    if (context?.totalQuizzes != null) parts.push(`Quizzes taken: ${context.totalQuizzes}`);
    if (context?.quizAvgScore != null) parts.push(`Quiz average: ${context.quizAvgScore}%`);
    if (context?.quizBestScore != null) parts.push(`Best quiz score: ${context.quizBestScore}%`);
    if (context?.quizPerfectScores != null) parts.push(`Perfect scores: ${context.quizPerfectScores}`);
    if (context?.courseSummary) parts.push(`By topic: ${context.courseSummary}`);
  }
  if (type === 'writing') {
    if (context?.totalEssays != null) parts.push(`Essays written: ${context.totalEssays}`);
    if (context?.totalWords != null) parts.push(`Total words: ${context.totalWords}`);
  }
  if (type === 'speaking') {
    if (context?.totalRecordings != null) parts.push(`Recordings: ${context.totalRecordings}`);
    if (context?.avgPronunciation != null) parts.push(`Avg pronunciation: ${context.avgPronunciation}%`);
  }
  const contextBlock = parts.length ? `User profile:\n${parts.join('\n')}` : 'No specific user data.';

  const prompt = `Generate exactly 4 personalized, actionable tips for improving ${type} skills in English.

${contextBlock}

CRITICAL: Tips must be tailored to THIS user's level and performance. Do NOT give the same generic advice to everyone. Consider their CEFR level, scores, and experience. A beginner with few activities needs different tips than an advanced user with many. Vary your advice accordingly.

Return ONLY a JSON array of exactly 4 tips, no markdown, no code blocks:
["Tip 1", "Tip 2", "Tip 3", "Tip 4"]

Each tip must be 1–2 sentences, specific and actionable.`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return JSON array of 4 tips only.',
      800 // Tips are short
    );
    const tips = parseAIResponse(response);

    if (Array.isArray(tips) && tips.length > 0) {
      return tips.slice(0, 4).map((tip: any) => (typeof tip === 'string' ? tip : String(tip)).trim());
    }

    return getDefaultTips(type);
  } catch (error) {
    console.error('Error generating tips:', error);
    return getDefaultTips(type);
  }
};

/**
 * Generate smart insights for progress page. Output is in English, AI-generated,
 * and tailored to the user's current needs (weak skills, mistakes, streak, activity trends).
 */
export const generateProgressInsights = async (
  stats: {
    totalActivities: number;
    averageScore: number;
    streak: number;
    lastActivityDate?: string | null;
  },
  skillsData: Array<{ name: string; value: number }>,
  thisWeekActivities: number,
  lastWeekActivities: number,
  cefrLevel?: string | null,
  mistakeCounts?: Array<{ topic: string; mistakeCount: number }>
): Promise<string> => {
  const weakSkills = skillsData.filter(s => s.value === 0 || s.value < 50);
  const strongSkills = skillsData.filter(s => s.value >= 70);
  const defaultEn = 'Keep up the great work! Try different activity types (quiz, writing, speaking) to broaden your practice.';

  const weakLabel = weakSkills.length >= 4
    ? 'Your skills'
    : weakSkills.map(s => s.name).join(' and ');

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    if (weakSkills.length > 0) {
      if (weakSkills.length >= 4) {
        return 'Your skills need work. Complete 2 quizzes this week to build progress.';
      }
      return `Your ${weakLabel} are at 0%. Complete 2 quizzes this week to build progress.`;
    }
    if (thisWeekActivities < 5) {
      return `You completed ${thisWeekActivities} activities this week. Your goal is 50. Ramp up practice to speed up improvement!`;
    }
    return defaultEn;
  }

  const lastActive = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
  const daysSinceActivity = lastActive
    ? Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const mistakesContext =
    mistakeCounts && mistakeCounts.length > 0
      ? `\n- Common mistakes (topic → count): ${mistakeCounts.slice(0, 6).map(m => `"${m.topic}" ${m.mistakeCount}`).join(', ')}. Use these to prioritize what to review.`
      : '';

  const prompt = `You are an expert English learning advisor. Analyze the user's progress and return ONE short, actionable insight IN ENGLISH (max 220 characters). Tailor it to their CURRENT NEEDS.

USER DATA:
- Total activities: ${stats.totalActivities}
- Average score: ${stats.averageScore}%
- Current streak: ${stats.streak} days
- CEFR Level: ${cefrLevel || 'Not set'}
- This week: ${thisWeekActivities} activities | Last week: ${lastWeekActivities}
- Weak skills (0–50%): ${weakSkills.map(s => `${s.name} (${s.value}%)`).join(', ') || 'None'}
- Strong skills (70%+): ${strongSkills.map(s => `${s.name} (${s.value}%)`).join(', ') || 'None'}
- Days since last activity: ${daysSinceActivity ?? 'N/A'}${mistakesContext}

Rules:
1. Focus on what they need NOW: weak skills, low activity, streak at risk, or topics they frequently get wrong.
2. Give one concrete next step (e.g. "Do 2 Reading quizzes", "Review place prepositions", "Complete a short writing task today").
3. Be encouraging. Write only in English.
4. If 4+ skills are weak, say "Your skills" or "several areas"—never list all skill names.
5. No quotes, markdown, or code. Return ONLY the insight text.`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return only the insight text in English.',
      300
    );
    const insight = typeof response === 'string' ? response.trim() : String(response).trim();
    return insight.length > 0 ? insight : defaultEn;
  } catch (error) {
    console.error('Error generating progress insights:', error);
    if (weakSkills.length > 0) {
      if (weakSkills.length >= 4) {
        return 'Your skills need work. Complete 2 quizzes this week to improve.';
      }
      return `Your ${weakLabel} need work. Complete 2 quizzes this week to improve.`;
    }
    return defaultEn;
  }
};

/**
 * Generate personalized study recommendations based on user stats
 */
export const generatePersonalizedRecommendations = async (
  userStats: {
    streak: number;
    totalPoints: number;
    averageScore: number;
    totalActivities: number;
    cefrLevel?: CEFRLevel | null;
  },
  recentActivities: Array<{
    type: string;
    score: number;
    courseTitle?: string;
  }>,
  weaknessAnalysis?: {
    weakAreas: Array<{
      skill: string;
      score: number;
      recommendation: string;
    }>;
    weakQuizTopics: Array<{
      topic: string;
      avgScore: number;
      attempts: number;
    }>;
    improvementSuggestions: string[];
  }
): Promise<Array<{
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
}>> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    // Return default recommendations if no API keys
    return getDefaultRecommendations(userStats, weaknessAnalysis);
  }

  const levelStr = userStats.cefrLevel ? `CEFR ${userStats.cefrLevel}` : 'not yet assessed';
  const statsContext = `User level: ${levelStr}, Streak: ${userStats.streak} days, Total Points: ${userStats.totalPoints}, Average Score: ${userStats.averageScore}%, Total Activities: ${userStats.totalActivities}`;
  
  const recentContext = recentActivities.length > 0
    ? `Recent activities: ${recentActivities.slice(0, 5).map(a => `${a.type} on "${a.courseTitle || 'General'}" (${a.score}%)`).join(', ')}`
    : 'No recent activities';

  // Build weakness analysis context
  let weaknessContext = '';
  if (weaknessAnalysis) {
    const weakSkills = weaknessAnalysis.weakAreas.length > 0
      ? `Weak skills (need improvement): ${weaknessAnalysis.weakAreas.map(w => `${w.skill} (${w.score}%)`).join(', ')}`
      : 'All skill areas are performing well';
    
    const weakTopics = weaknessAnalysis.weakQuizTopics.length > 0
      ? `Weak quiz topics: ${weaknessAnalysis.weakQuizTopics.map(t => `"${t.topic}" (avg ${t.avgScore}%, ${t.attempts} attempts)`).join(', ')}`
      : 'No specific weak quiz topics identified';
    
    weaknessContext = `
WEAKNESS ANALYSIS:
${weakSkills}
${weakTopics}
${weaknessAnalysis.improvementSuggestions.length > 0 ? `\nKey improvement areas:\n${weaknessAnalysis.improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}`;
  }

  const prompt = `You are an expert English learning advisor. Analyze the user's performance data and generate 3-4 highly personalized study recommendations that target their specific weaknesses and areas for improvement.

USER STATISTICS:
${statsContext}
${recentContext}${weaknessContext}

CRITICAL REQUIREMENTS:
1. Focus on the user's WEAKEST areas first - these are the skills/topics where they scored below 70%
2. Provide SPECIFIC, ACTIONABLE recommendations (e.g., "Practice grammar exercises focusing on verb tenses" not just "Improve grammar")
3. Prioritize recommendations based on severity of weakness (lowest scores = highest priority)
4. If user has weak quiz topics, recommend specific courses/topics to practice
5. If user hasn't tried certain activity types (writing/speaking), encourage them to start
6. Make each recommendation personal and directly address their specific performance gaps

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "id": "rec-1",
    "title": "Specific recommendation title targeting their weakness (max 40 chars)",
    "description": "Detailed explanation of WHY this helps their specific weak area and HOW it addresses their performance gap (max 150 chars)",
    "action": "Action button text (max 20 chars)",
    "priority": "high|medium|low",
    "icon": "BookOpen|MessageSquare|FileText|Headphones|Mic|Edit|Briefcase|GraduationCap|Target|Brain",
    "color": "from-blue-500 to-blue-600|from-green-500 to-green-600|from-purple-500 to-purple-600|from-orange-500 to-orange-600|from-indigo-500 to-indigo-600|from-red-500 to-red-600"
  }
]

IMPORTANT: Make recommendations SPECIFIC to their weaknesses. If they scored 50% on Grammar, recommend grammar-focused exercises. If they scored 60% on "Vocabulary Building" quizzes, recommend vocabulary practice. Be precise and targeted.`;

  try {
    const response = await callAIWithBackup(
      prompt, 
      'Expert English learning advisor. Return JSON array only.',
      1000 // Recommendations are shorter
    );
    const recommendations = parseAIResponse(response);
    
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      return recommendations.slice(0, 4).map((rec: any, index: number) => ({
        id: rec.id || `rec-${index + 1}`,
        title: rec.title || 'Study Recommendation',
        description: rec.description || 'Continue practicing to improve your skills',
        action: rec.action || 'Start Now',
        priority: (rec.priority === 'high' || rec.priority === 'medium' || rec.priority === 'low') 
          ? rec.priority 
          : 'medium',
        icon: rec.icon || 'BookOpen',
        color: rec.color || 'from-blue-500 to-blue-600',
      }));
    }
    
    return getDefaultRecommendations(userStats);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return getDefaultRecommendations(userStats);
  }
};

/** Quiz performance analysis result (AI-generated) */
export interface QuizPerformanceAnalysis {
  strongAreas: string;
  areasForImprovement: string;
  recommendation: string;
}

/**
 * Generate detailed, real AI performance analysis for a completed quiz.
 * Uses actual wrong answers, topics, explanations, and timing to produce personalized feedback.
 */
export const generateQuizPerformanceAnalysis = async (results: {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  courseTitle: string;
  questions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    topic?: string;
  }>;
  userAnswers?: (number | null)[];
}): Promise<QuizPerformanceAnalysis> => {
  const questions = results.questions || [];
  const userAnswers = results.userAnswers || [];
  const wrongDetails: Array<{ question: string; topic: string; userChoice: string; correctAnswer: string; explanation: string }> = [];
  const correctTopics = new Map<string, number>();
  const wrongTopics = new Map<string, number>();

  questions.forEach((q, i) => {
    const u = userAnswers[i];
    const userOpt = u != null && q.options[u] != null ? q.options[u] : null;
    const correctOpt = q.options[q.correctAnswer] ?? '';
    const topic = q.topic || 'General';
    if (u != null && u !== q.correctAnswer) {
      wrongDetails.push({
        question: q.question,
        topic,
        userChoice: userOpt ?? '(skipped)',
        correctAnswer: correctOpt,
        explanation: q.explanation || 'No explanation provided.',
      });
      wrongTopics.set(topic, (wrongTopics.get(topic) || 0) + 1);
    } else if (u != null) {
      correctTopics.set(topic, (correctTopics.get(topic) || 0) + 1);
    }
  });

  const strongTopicsList = Array.from(correctTopics.entries()).filter(([, c]) => c >= 1).map(([t]) => t);
  const weakTopicsList = Array.from(wrongTopics.entries()).map(([t, c]) => ({ topic: t, count: c }));

  const fallback = (): QuizPerformanceAnalysis => {
    const total = results.totalQuestions;
    const correct = results.correctAnswers;
    const wrongCount = wrongDetails.length;

    let strongAreas: string;
    if (strongTopicsList.length > 0 && correct > 0) {
      const topicText = strongTopicsList.length === 1 ? strongTopicsList[0] : strongTopicsList.join(', ');
      strongAreas = `You got ${correct} out of ${total} correct. Your correct answers were in: ${topicText}. Notice what those questions had in common (e.g. vocabulary type, grammar structure, or reading skill) and try to apply the same reasoning in similar items. Building from what you already get right is more effective than only focusing on errors.`;
    } else if (results.score >= 70) {
      strongAreas = `Score: ${correct}/${total}. Your timing and the mix of correct answers show you can handle some of this material. Use the Question Review to see exactly which patterns you got right, so you can rely on them in the next attempt.`;
    } else {
      strongAreas = `You completed all ${total} questions. The breakdown below shows where you're strong and where to focus. Use the Question Review to read each explanation — understanding why the correct answer is right will help you improve faster than guessing again.`;
    }

    let areasForImprovement: string;
    if (weakTopicsList.length > 0 && wrongCount > 0) {
      const byTopic = weakTopicsList.map(({ topic, count }) => `${topic}: ${count} wrong`).join('; ');
      areasForImprovement = `Wrong answers by topic: ${byTopic}. For each wrong item, read the explanation and ask: "Why is the correct option right, and why did my choice not fit?" Look for patterns (e.g. confusing similar words, missing context, or misreading the question). Target those patterns with a few similar practice items before retrying the full quiz.`;
    } else if (results.score < 90) {
      areasForImprovement = 'Review the questions you missed in the Question Review below. Pay attention to the reasoning in each explanation, not just the correct letter. Then try a few more questions on the same topic or a slightly harder set to consolidate.';
    } else {
      areasForImprovement = '';
    }

    let recommendation: string;
    if (results.score >= 90) {
      recommendation = 'You did well on this set. Consider an advanced or broader topic next, or the same topic with more questions, to keep reinforcing your skills.';
    } else if (weakTopicsList.length > 0) {
      const topWeak = weakTopicsList.slice(0, 2).map(({ topic }) => topic).join(' and ');
      recommendation = `Next step: focus on ${topWeak}. Study the wrong answers in Question Review, then retry this quiz in a day or two to see how much you've retained. One short review session is often more useful than retrying immediately.`;
    } else {
      recommendation = 'Review the explanations in Question Review once, then retry when you feel ready.';
    }

    return { strongAreas, areasForImprovement, recommendation };
  };

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    return fallback();
  }

  const avgTimePerQuestion = results.totalQuestions > 0 ? Math.round(results.timeSpent / results.totalQuestions) : 0;
  const wrongSummary = wrongDetails.length > 0
    ? wrongDetails.map((w, i) => `${i + 1}. [${w.topic}] Q: ${w.question}\n   User chose: ${w.userChoice}\n   Correct: ${w.correctAnswer}\n   Explanation: ${w.explanation}`).join('\n\n')
    : 'None (all correct).';
  const weakTopics = Array.from(wrongTopics.entries()).map(([t, c]) => `${t} (${c} wrong)`).join(', ') || 'None';
  const strongTopics = Array.from(correctTopics.entries()).filter(([, c]) => c >= 1).map(([t]) => t).join(', ') || 'N/A';

  const prompt = `You are an expert English assessment analyst. Write a DETAILED, non-repetitive performance analysis. Each of the three sections must add NEW information—do NOT repeat the same topic list or the same advice in all three.

QUIZ DATA:
- Course: ${results.courseTitle}
- Score: ${results.score}% (${results.correctAnswers}/${results.totalQuestions} correct)
- Time: ${results.timeSpent}s total, ~${avgTimePerQuestion}s per question
- Topics where the user was STRONG (answered correctly): ${strongTopics}
- Topics where the user was WEAK (wrong answers): ${weakTopics}

WRONG ANSWERS (use these to be specific):
${wrongSummary}

RULES:
- strongAreas: Say what they did RIGHT and why it matters (e.g. which skill or pattern). Do NOT just list topic names again. 2-4 sentences.
- areasForImprovement: Explain WHAT to work on and HOW (e.g. "confusing X with Y" or "inference from context"). Give one or two concrete next steps. Do NOT repeat the same sentence as strongAreas or recommendation. 2-4 sentences.
- recommendation: One clear next action (e.g. "retry in 2 days" or "try the next level"). Do NOT copy the "use Question Review" line from the other sections. 2-3 sentences.

Return ONLY a JSON object (no markdown, no code blocks):
{
  "strongAreas": "...",
  "areasForImprovement": "...",
  "recommendation": "..."
}`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English assessment analyst. Return only valid JSON. You MUST write 2-4 full sentences per field; short one-line answers are not acceptable.',
      2000
    );
    const parsed = parseAIResponse(response);
    if (parsed && typeof parsed.strongAreas === 'string' && typeof parsed.areasForImprovement === 'string' && typeof parsed.recommendation === 'string') {
      return {
        strongAreas: parsed.strongAreas.trim(),
        areasForImprovement: parsed.areasForImprovement.trim(),
        recommendation: parsed.recommendation.trim(),
      };
    }
    return fallback();
  } catch (error) {
    console.error('Error generating quiz performance analysis:', error);
    return fallback();
  }
};

export interface LearningDifficultyAnalysis {
  topic: string;
  advice: string;
}

/**
 * AI analysis: detected difficult topic + English advice. No "learning difficulty" field.
 */
export const getLearningDifficultyAnalysis = async (
  userStats: {
    streak: number;
    totalPoints: number;
    averageScore: number;
    totalActivities: number;
    cefrLevel?: CEFRLevel | null;
  },
  recentActivities: Array<{
    type: string;
    score: number;
    courseTitle?: string;
  }>,
  weaknessAnalysis?: {
    weakAreas: Array<{ skill: string; score: number; recommendation: string }>;
    weakQuizTopics: Array<{ topic: string; avgScore: number; attempts: number }>;
    improvementSuggestions: string[];
  },
  mistakeCounts?: Array<{ topic: string; mistakeCount: number }>,
  wrongAnswerDetails?: Array<{ question: string; userAnswer: string; correctAnswer: string; explanation: string; topic: string }>
): Promise<LearningDifficultyAnalysis | null> => {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    return getDefaultLearningDifficultyAnalysis(weaknessAnalysis, userStats, mistakeCounts, wrongAnswerDetails);
  }

  const levelStr = userStats.cefrLevel ? `CEFR ${userStats.cefrLevel}` : 'not yet assessed';
  const statsContext = `Level: ${levelStr}, Streak: ${userStats.streak} days, Total points: ${userStats.totalPoints}, Average score: ${userStats.averageScore}%, Total activities: ${userStats.totalActivities}`;
  const recentContext = recentActivities.length > 0
    ? `Recent activities: ${recentActivities.slice(0, 5).map(a => `${a.type} – "${a.courseTitle || 'General'}" (${a.score}%)`).join(', ')}`
    : 'No recent activities';

  let weaknessContext = '';
  if (weaknessAnalysis) {
    const weakSkills = weaknessAnalysis.weakAreas.length > 0
      ? `Weak skills: ${weaknessAnalysis.weakAreas.map(w => `${w.skill} (${w.score}%)`).join(', ')}`
      : 'All skill areas OK';
    const weakTopics = weaknessAnalysis.weakQuizTopics.length > 0
      ? `Weak topics: ${weaknessAnalysis.weakQuizTopics.map(t => `"${t.topic}" (avg ${t.avgScore}%, ${t.attempts} attempts)`).join(', ')}`
      : 'No specific weak topics';
    weaknessContext = `
WEAKNESS ANALYSIS:
${weakSkills}
${weakTopics}
${weaknessAnalysis.improvementSuggestions.length > 0 ? `\nSuggestions:\n${weaknessAnalysis.improvementSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}`;
  }

  const mistakesContext = mistakeCounts && mistakeCounts.length > 0
    ? `\nMISTAKE COUNTS (wrong answers per topic): ${mistakeCounts.slice(0, 10).map(m => `"${m.topic}" ${m.mistakeCount} mistakes`).join(', ')}.`
    : '';

  let wrongAnswersContext = '';
  if (wrongAnswerDetails && wrongAnswerDetails.length > 0) {
    wrongAnswersContext = `\n\nWRONG ANSWER DETAILS (actual questions the student got wrong — use these to find SPECIFIC weak points like prepositions, "at"/"in"/"on", verb tenses, specific vocabulary):\n${wrongAnswerDetails.slice(0, 16).map((w, i) => `[${i + 1}] Q: ${w.question} | User chose: "${w.userAnswer}" | Correct: "${w.correctAnswer}" | Explanation: ${w.explanation} | Topic: ${w.topic}`).join('\n')}`;
  }

  const prompt = `You are an expert English teacher. Analyze the student's performance and return ONLY this JSON object (no other text, no markdown, no code blocks).

USER DATA:
${statsContext}
${recentContext}${weaknessContext}${mistakesContext}${wrongAnswersContext}

CRITICAL: Use the WRONG ANSWER DETAILS above to identify SPECIFIC language points the student struggles with (e.g. prepositions, especially "at"; verb tenses; articles; phrasal verbs; particular vocabulary). Do NOT give generic advice like "practice more on topic X". You MUST say what exactly is wrong (e.g. "Your errors show trouble with prepositions, especially 'at' for time/place. Review when to use 'at' vs 'in' vs 'on' and do targeted exercises.").

TASK:
1. "topic": The specific difficult area. Be precise: e.g. "Prepositions (at/in/on)", "Present perfect vs past simple", "Vocabulary – business terms", or the quiz topic name if no clearer pattern.
2. "advice": 2–4 sentences of CONCRETE, DETAILED advice IN ENGLISH. Name the exact grammar/vocabulary point(s), reference their wrong vs correct answers or explanations where relevant, and tell them exactly what to review and practice.

Return ONLY this JSON object:
{"topic":"...","advice":"... in English"}`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return only the JSON object. Identify specific weak points (e.g. prepositions, "at") from wrong-answer details.',
      700
    );
    const parsed = parseAIResponse(response);
    if (parsed && typeof parsed.advice === 'string') {
      return {
        topic: typeof parsed.topic === 'string' ? String(parsed.topic).trim() : '',
        advice: String(parsed.advice).trim(),
      };
    }
    return getDefaultLearningDifficultyAnalysis(weaknessAnalysis, userStats, mistakeCounts, wrongAnswerDetails);
  } catch (e) {
    console.error('getLearningDifficultyAnalysis error:', e);
    return getDefaultLearningDifficultyAnalysis(weaknessAnalysis, userStats, mistakeCounts, wrongAnswerDetails);
  }
};

function getDefaultLearningDifficultyAnalysis(
  weaknessAnalysis?: {
    weakAreas: Array<{ skill: string; score: number; recommendation: string }>;
    weakQuizTopics: Array<{ topic: string; avgScore: number; attempts: number }>;
  },
  userStats?: { averageScore: number; totalActivities: number },
  mistakeCounts?: Array<{ topic: string; mistakeCount: number }>,
  wrongAnswerDetails?: Array<{ question: string; userAnswer: string; correctAnswer: string; explanation: string; topic: string }>
): LearningDifficultyAnalysis | null {
  if (wrongAnswerDetails && wrongAnswerDetails.length > 0) {
    const topTopic = mistakeCounts?.[0]?.topic ?? wrongAnswerDetails[0].topic;
    const excerpts = wrongAnswerDetails.slice(0, 4).map(w => w.explanation).filter(Boolean);
    const reviewHint = excerpts.length > 0
      ? ` Focus on reviewing: ${excerpts.map(e => `"${e.slice(0, 80)}${e.length > 80 ? '…' : ''}"`).join('; ')}.`
      : ' Review the explanations for each question you got wrong.';
    return {
      topic: topTopic,
      advice: `You made ${mistakeCounts?.[0]?.mistakeCount ?? wrongAnswerDetails.length} mistake(s) in "${topTopic}".${reviewHint} Practice similar exercises and pay attention to the specific grammar or vocabulary points in those explanations.`,
    };
  }
  if (mistakeCounts && mistakeCounts.length > 0) {
    const top = mistakeCounts[0];
    return {
      topic: top.topic,
      advice: `You made ${top.mistakeCount} mistake${top.mistakeCount === 1 ? '' : 's'} in "${top.topic}". Practice more exercises and quizzes on this topic, and review the explanations for questions you got wrong.`,
    };
  }
  if (weaknessAnalysis?.weakAreas?.length) {
    const w = weaknessAnalysis.weakAreas[0];
    return {
      topic: w.skill,
      advice: w.recommendation,
    };
  }
  if (weaknessAnalysis?.weakQuizTopics?.length) {
    const t = weaknessAnalysis.weakQuizTopics[0];
    return {
      topic: t.topic,
      advice: `Practice more quizzes and exercises on "${t.topic}" to strengthen this area.`,
    };
  }
  if (userStats && userStats.totalActivities === 0) {
    return {
      topic: '',
      advice: 'Complete the placement test, then try quizzes, writing, and speaking to identify areas to work on.',
    };
  }
  if (userStats && userStats.averageScore < 70) {
    return {
      topic: '',
      advice: 'Focus on your weaker areas, and practise quizzes, writing, and speaking regularly to improve your average score.',
    };
  }
  return null;
}

export interface CommonMistakeAnalysis {
  category: string;
  description: string;
  count: number;
  examples: string[];
  suggestion: string;
}

/**
 * AI analysis of common mistakes - dynamically categorizes and analyzes mistakes
 */
export const getCommonMistakesAnalysis = async (
  mistakeCounts: Array<{ topic: string; mistakeCount: number }>,
  wrongAnswerDetails: Array<{ question: string; userAnswer: string; correctAnswer: string; explanation: string; topic: string }>
): Promise<CommonMistakeAnalysis[]> => {
  if (!mistakeCounts || mistakeCounts.length === 0) {
    return [];
  }

  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    // Fallback: return simple categorized mistakes with topic-specific suggestions
    return mistakeCounts.slice(0, 8).map(m => ({
      category: m.topic,
      description: `You made ${m.mistakeCount} mistake${m.mistakeCount === 1 ? '' : 's'} in this topic`,
      count: m.mistakeCount,
      examples: [],
      suggestion: getFallbackSuggestionForTopic(m.topic),
    }));
  }

  // Prepare context for AI
  const mistakesContext = mistakeCounts.length > 0
    ? `MISTAKE COUNTS: ${mistakeCounts.slice(0, 15).map(m => `"${m.topic}" (${m.mistakeCount} mistakes)`).join(', ')}`
    : '';

  const wrongAnswersContext = wrongAnswerDetails && wrongAnswerDetails.length > 0
    ? `\n\nDETAILED WRONG ANSWERS:\n${wrongAnswerDetails.slice(0, 20).map((w, i) => `[${i + 1}] Topic: "${w.topic}" | Q: ${w.question.slice(0, 150)} | User chose: "${w.userAnswer}" | Correct: "${w.correctAnswer}" | Explanation: ${w.explanation.slice(0, 200)}`).join('\n')}`
    : '';

  const prompt = `You are an expert English teacher. Analyze the student's mistakes and give SPECIFIC, DIFFERENT advice for each category.

${mistakesContext}${wrongAnswersContext}

TASK:
Analyze the mistakes and group them into categories. For EACH category you MUST provide:
1. "category": A clear category name (e.g., "Prepositions (at/in/on)", "Present Perfect vs Past Simple", "Speaking Pronunciation")
2. "description": A brief description of what mistakes were made in this category
3. "count": Total number of mistakes in this category
4. "examples": Array of 2-3 specific examples showing the mistake pattern (e.g., ["Used 'at' instead of 'in' for months"])
5. "suggestion": ONE sentence of advice that is SPECIFIC to this category. CRITICAL: Every suggestion must be DIFFERENT and tailored to the category:
   - For reading/academic topics: suggest skimming, key words, or vocabulary in context (e.g. "Focus on topic sentences and signal words to find main ideas quickly.")
   - For conditionals/grammar: suggest the exact grammar point and practice type (e.g. "Practice mixed conditionals with real-life scenarios; pay attention to which time the if-clause refers to.")
   - For vocabulary: suggest learning in chunks or context (e.g. "Learn collocations and common phrases instead of single words; use flashcards with example sentences.")
   - For inversion: suggest specific structures (e.g. "Drill 'Never have I...', 'Only when...' and negative adverbials until they feel natural.")
   - For writing grammar: suggest the skill (e.g. "Review verb forms for the tense you are using; check subject-verb agreement in long sentences.")
   - For pronunciation: suggest listening and production (e.g. "Use minimal pairs and shadowing; record yourself and compare to native audio.")
   Do NOT use the same generic phrase like "Review explanations and practice more" for every category. Each suggestion must clearly relate to that category only.

Return ONLY a JSON array of objects (no markdown, no code blocks, no explanations):
[
  {"category":"...","description":"...","count":N,"examples":["...","..."],"suggestion":"..."},
  ...
]

Focus on the TOP 6-8 most important categories. Every "suggestion" must be unique and specific to its category.`;

  try {
    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Analyze mistakes and return only a JSON array of categorized mistakes.',
      1000
    );

    const parsed = parseAIResponse(response);
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((item: any) => item && item.category && item.description)
        .map((item: any) => ({
          category: String(item.category || '').trim(),
          description: String(item.description || '').trim(),
          count: typeof item.count === 'number' ? item.count : (typeof item.count === 'string' ? parseInt(item.count) || 0 : 0),
          examples: Array.isArray(item.examples) ? item.examples.map((e: any) => String(e).trim()).filter(Boolean) : [],
          suggestion: String(item.suggestion || 'Practice more exercises on this topic.').trim(),
        }))
        .slice(0, 8)
        .sort((a, b) => b.count - a.count);
    }

    // Fallback if AI response is invalid
    return mistakeCounts.slice(0, 8).map(m => ({
      category: m.topic,
      description: `You made ${m.mistakeCount} mistake${m.mistakeCount === 1 ? '' : 's'} in this topic`,
      count: m.mistakeCount,
      examples: [],
      suggestion: getFallbackSuggestionForTopic(m.topic),
    }));
  } catch (e) {
    console.error('getCommonMistakesAnalysis error:', e);
    return mistakeCounts.slice(0, 8).map(m => ({
      category: m.topic,
      description: `You made ${m.mistakeCount} mistake${m.mistakeCount === 1 ? '' : 's'} in this topic`,
      count: m.mistakeCount,
      examples: [],
      suggestion: getFallbackSuggestionForTopic(m.topic),
    }));
  }
};

/** Topic-specific fallback suggestions when AI is unavailable or returns invalid data */
function getFallbackSuggestionForTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (t.includes('academic') || t.includes('reading') || t.includes('scholarly')) return 'Focus on topic sentences and key words; practice skimming before answering comprehension questions.';
  if (t.includes('conditional')) return 'Practice each conditional type with real examples; pay attention to the time (past/present/future) in the if-clause and result.';
  if (t.includes('vocabulary') || t.includes('daily life')) return 'Learn words in phrases and collocations; use new vocabulary in short sentences daily.';
  if (t.includes('inversion')) return 'Drill structures like "Never have I...", "Only when..."; practice with negative adverbials at the start of sentences.';
  if (t.includes('writing grammar') || t.includes('verb')) return 'Check verb tense and subject-verb agreement in each sentence; read your answers aloud before submitting.';
  if (t.includes('pronunciation')) return 'Use minimal pairs and shadowing; record yourself and compare to native speaker audio for problem sounds.';
  if (t.includes('listening')) return 'Listen once for gist, then again for details; note linking and weak forms in natural speech.';
  if (t.includes('speaking')) return 'Record yourself and compare to model answers; focus on one grammar or pronunciation point at a time.';
  return 'Review the explanations for the questions you got wrong and do extra practice on this topic.';
}

/**
 * Get default recommendations (fallback)
 */
const getDefaultRecommendations = (
  userStats: {
    streak: number;
    totalPoints: number;
    averageScore: number;
    totalActivities: number;
  },
  weaknessAnalysis?: {
    weakAreas: Array<{
      skill: string;
      score: number;
      recommendation: string;
    }>;
    weakQuizTopics: Array<{
      topic: string;
      avgScore: number;
      attempts: number;
    }>;
    improvementSuggestions: string[];
  }
): Array<{
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
}> => {
  const recommendations = [];
  
  // Prioritize weak areas if analysis is available
  if (weaknessAnalysis && weaknessAnalysis.weakAreas.length > 0) {
    const weakestSkill = weaknessAnalysis.weakAreas[0];
    recommendations.push({
      id: `improve-${weakestSkill.skill.toLowerCase()}`,
      title: `Improve Your ${weakestSkill.skill}`,
      description: `${weakestSkill.recommendation} Your current score is ${weakestSkill.score}%.`,
      action: `Practice ${weakestSkill.skill}`,
      priority: 'high' as const,
      icon: weakestSkill.skill === 'Grammar' ? 'BookOpen' : weakestSkill.skill === 'Vocabulary' ? 'MessageSquare' : weakestSkill.skill === 'Speaking' ? 'Mic' : weakestSkill.skill === 'Writing' ? 'Edit' : 'Target',
      color: 'from-red-500 to-red-600',
    });
    
    // Add second weakest area if available
    if (weaknessAnalysis.weakAreas.length > 1) {
      const secondWeakest = weaknessAnalysis.weakAreas[1];
      recommendations.push({
        id: `improve-${secondWeakest.skill.toLowerCase()}-2`,
        title: `Focus on ${secondWeakest.skill}`,
        description: `${secondWeakest.recommendation} Your score is ${secondWeakest.score}%.`,
        action: `Practice ${secondWeakest.skill}`,
        priority: 'high' as const,
        icon: secondWeakest.skill === 'Grammar' ? 'BookOpen' : secondWeakest.skill === 'Vocabulary' ? 'MessageSquare' : secondWeakest.skill === 'Speaking' ? 'Mic' : secondWeakest.skill === 'Writing' ? 'Edit' : 'Target',
        color: 'from-orange-500 to-orange-600',
      });
    }
  }
  
  // Add weak quiz topics
  if (weaknessAnalysis && weaknessAnalysis.weakQuizTopics.length > 0) {
    const weakestTopic = weaknessAnalysis.weakQuizTopics[0];
    recommendations.push({
      id: `practice-${weakestTopic.topic.toLowerCase().replace(/\s+/g, '-')}`,
      title: `Practice ${weakestTopic.topic}`,
      description: `You scored ${weakestTopic.avgScore}% on ${weakestTopic.topic} quizzes. Review this topic and practice more.`,
      action: 'Review Topic',
      priority: 'high' as const,
      icon: 'Brain',
      color: 'from-purple-500 to-purple-600',
    });
  }
  
  if (userStats.averageScore < 70 && (!weaknessAnalysis || weaknessAnalysis.weakAreas.length === 0)) {
    recommendations.push({
      id: 'improve-basics',
      title: 'Strengthen Your Foundation',
      description: 'Focus on basic grammar and vocabulary to improve your average score.',
      action: 'Practice Basics',
      priority: 'high' as const,
      icon: 'BookOpen',
      color: 'from-blue-500 to-blue-600',
    });
  }
  
  if (userStats.streak < 3) {
    recommendations.push({
      id: 'build-streak',
      title: 'Build Your Learning Streak',
      description: 'Practice daily to build a consistent learning habit and unlock achievements.',
      action: 'Start Today',
      priority: 'medium' as const,
      icon: 'Flame',
      color: 'from-orange-500 to-orange-600',
    });
  }
  
  if (userStats.totalActivities < 10) {
    recommendations.push({
      id: 'more-practice',
      title: 'Explore More Activities',
      description: 'Try quizzes, writing, and speaking exercises to diversify your learning.',
      action: 'Explore',
      priority: 'medium' as const,
      icon: 'Target',
      color: 'from-green-500 to-green-600',
    });
  }
  
  // Ensure at least 2 recommendations
  if (recommendations.length < 2) {
    recommendations.push({
      id: 'advanced-topics',
      title: 'Challenge Yourself',
      description: 'Try more advanced topics to push your skills to the next level.',
      action: 'Take Challenge',
      priority: 'medium' as const,
      icon: 'Brain',
      color: 'from-purple-500 to-purple-600',
    });
  }
  
  return recommendations.slice(0, 4);
};

/**
 * Get default tips (fallback)
 */
const getDefaultTips = (type: 'quiz' | 'writing' | 'speaking'): string[] => {
  const tips: Record<string, string[]> = {
    quiz: [
      'Read questions carefully before answering',
      'Manage your time wisely during tests',
      'Review incorrect answers to learn from mistakes',
      'Practice regularly to improve your skills'
    ],
    writing: [
      'Start with an outline to organize your thoughts',
      'Use varied sentence structures for better flow',
      'Check grammar and spelling before submitting',
      'Support ideas with examples and details'
    ],
    speaking: [
      'Speak clearly and at a moderate pace',
      'Use complete sentences when possible',
      'Practice in a quiet environment',
      "Don't worry about mistakes - focus on communication"
    ]
  };
  
  return tips[type] || tips.quiz;
};

/**
 * Extract text from handwritten image (using free OCR - Tesseract.js would be client-side)
 */
export const extractTextFromImage = async (imageBlob: Blob): Promise<string> => {
  // For now, return placeholder
  // In production, use Tesseract.js (client-side, free) or a free OCR API
  return 'This is a sample extracted text. In production, use Tesseract.js for client-side OCR.';
};

/**
 * Analyze handwritten assignment
 */
export const generatePersonalizedWords = async (
  cefrLevel: string | null,
  userActivities: any[],
  count: number = 6
): Promise<string[]> => {
  try {
    // Analyze user activities to find weak areas
    const activityTypes = userActivities.map(a => a.type);
    const recentScores = userActivities.slice(-10).map(a => a.score);
    const averageScore = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    
    // Extract vocabulary-related errors from activities
    const vocabularyErrors: string[] = [];
    userActivities.forEach(activity => {
      if (activity.writingDetailedFeedback?.vocabulary?.suggestions) {
        vocabularyErrors.push(...activity.writingDetailedFeedback.vocabulary.suggestions);
      }
      if (activity.speakingFeedback?.vocabulary?.suggestions) {
        vocabularyErrors.push(...activity.speakingFeedback.vocabulary.suggestions);
      }
    });

    const prompt = `You are an expert English teacher. Generate ${count} personalized English vocabulary words for a student.

Student Information:
- CEFR Level: ${cefrLevel || 'Not assessed yet'}
- Average Score: ${averageScore.toFixed(0)}%
- Activity Types: ${[...new Set(activityTypes)].join(', ') || 'None yet'}
- Vocabulary Areas Needing Improvement: ${vocabularyErrors.length > 0 ? vocabularyErrors.slice(0, 5).join(', ') : 'General vocabulary'}

Requirements:
1. Words should be appropriate for ${cefrLevel || 'beginner'} level
2. Focus on words that will help improve their weak areas
3. Include a mix of common and useful words
4. Words should be practical and relevant to their learning journey
5. Return ONLY a JSON array of word strings, no explanations, no markdown, just: ["word1", "word2", "word3", ...]

Example format: ["resilient", "pragmatic", "eloquent", "meticulous", "ubiquitous", "paradigm"]`;

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert English teacher. Return only valid JSON arrays, no markdown, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '[]';
    
    // Try to parse JSON array
    let words: string[] = [];
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      words = JSON.parse(cleaned);
      if (!Array.isArray(words)) {
        words = [];
      }
    } catch {
      // Fallback: try to extract words from text
      const wordMatches = content.match(/"([^"]+)"/g);
      if (wordMatches) {
        words = wordMatches.map(m => m.replace(/"/g, ''));
      }
    }

    // If we got fewer words than requested, try to get more from AI
    if (words.length < count) {
      // Try with backup API if available
      try {
        const backupPrompt = `Generate ${count - words.length} more English vocabulary words for a ${cefrLevel || 'beginner'} level student. Return ONLY a JSON array: ["word1", "word2", ...]`;
        const backupResponse = await callAIWithBackup(backupPrompt, {
          temperature: 0.7,
          maxTokens: 150,
        });
        const backupContent = backupResponse.trim();
        const backupCleaned = backupContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          const backupWords = JSON.parse(backupCleaned);
          if (Array.isArray(backupWords)) {
            words.push(...backupWords.filter((w: string) => typeof w === 'string' && w.length > 0));
          }
        } catch {
          // Try to extract words from text
          const wordMatches = backupContent.match(/"([^"]+)"/g);
          if (wordMatches) {
            words.push(...wordMatches.map(m => m.replace(/"/g, '')));
          }
        }
      } catch (backupError) {
        console.warn('[AI] Backup word generation failed:', backupError);
      }
    }

    // Return what we have (even if less than requested) - no hard-coded fallbacks
    return words.slice(0, count);
  } catch (error) {
    console.error('[AI] Error generating personalized words:', error);
    // No hard-coded fallback - throw error so component can handle it
    throw new Error('Failed to generate personalized words. Please check your API keys and try again.');
  }
};

/**
 * Generate personalized writing prompts based on user level and activities
 */
export const generateWritingPrompts = async (
  cefrLevel: string | null,
  userActivities: any[],
  count: number = 6
): Promise<Array<{
  id: number;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  wordCount: string;
  color: string;
  bgColor: string;
  completed: boolean;
  score: number | null;
}>> => {
  try {
    // Analyze user activities to determine appropriate difficulty
    const recentScores = userActivities.filter(a => a.type === 'writing').slice(-5).map(a => a.score);
    const averageScore = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    
    // Determine difficulty based on CEFR level
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
    if (cefrLevel === 'B1' || cefrLevel === 'B2') {
      difficulty = 'Intermediate';
    } else if (cefrLevel === 'C1' || cefrLevel === 'C2') {
      difficulty = 'Advanced';
    } else if (averageScore > 80 && cefrLevel === 'A2') {
      difficulty = 'Intermediate';
    }

    const prompt = `You are an expert English teacher. Generate ${count} personalized writing prompts for a student.

Student Information:
- CEFR Level: ${cefrLevel || 'Not assessed yet'}
- Average Writing Score: ${averageScore.toFixed(0)}%
- Difficulty Level: ${difficulty}

Requirements:
1. Create ${count} unique writing prompts appropriate for ${difficulty} level
2. Each prompt should have:
   - A clear, engaging title
   - A detailed description that guides the student
   - Appropriate word count range based on difficulty:
     * Beginner: 100-200 words
     * Intermediate: 200-300 words
     * Advanced: 300-500 words
3. Topics should be varied and interesting
4. Prompts should help improve their writing skills

Return ONLY a JSON array with this exact format (no markdown, no explanations):
[
  {
    "title": "Prompt Title",
    "description": "Detailed description of what to write about",
    "difficulty": "${difficulty}",
    "wordCount": "100-200"
  },
  ...
]`;

    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return JSON array of writing prompts only.',
      2000
    );

    // Parse JSON response
    let prompts: any[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      prompts = JSON.parse(cleaned);
      if (!Array.isArray(prompts)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('[AI] Error parsing writing prompts:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Map to required format with colors and metadata
    const colors = [
      { color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
      { color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
      { color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50' },
      { color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
      { color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50' },
      { color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50' },
    ];

    return prompts.slice(0, count).map((p, index) => ({
      id: index + 1,
      title: p.title || `Writing Prompt ${index + 1}`,
      description: p.description || '',
      difficulty: (p.difficulty || difficulty) as 'Beginner' | 'Intermediate' | 'Advanced',
      wordCount: p.wordCount || (difficulty === 'Beginner' ? '100-200' : difficulty === 'Intermediate' ? '200-300' : '300-500'),
      color: colors[index % colors.length].color,
      bgColor: colors[index % colors.length].bgColor,
      completed: false,
      score: null,
    }));
  } catch (error) {
    console.error('[AI] Error generating writing prompts:', error);
    throw new Error('Failed to generate writing prompts. Please check your API keys and try again.');
  }
};

/**
 * Generate personalized speaking topics based on user level and activities
 */
export const generateSpeakingTopics = async (
  cefrLevel: string | null,
  userActivities: any[],
  count: number = 6
): Promise<Array<{
  id: number;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  color: string;
  bgColor: string;
  completed: boolean;
  score: number | null;
}>> => {
  try {
    // Analyze user activities to determine appropriate difficulty
    const recentScores = userActivities.filter(a => a.type === 'speaking').slice(-5).map(a => a.score);
    const averageScore = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    
    // Determine difficulty based on CEFR level
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
    if (cefrLevel === 'B1' || cefrLevel === 'B2') {
      difficulty = 'Intermediate';
    } else if (cefrLevel === 'C1' || cefrLevel === 'C2') {
      difficulty = 'Advanced';
    } else if (averageScore > 80 && cefrLevel === 'A2') {
      difficulty = 'Intermediate';
    }

    const prompt = `You are an expert English teacher. Generate ${count} personalized speaking topics for a student.

Student Information:
- CEFR Level: ${cefrLevel || 'Not assessed yet'}
- Average Speaking Score: ${averageScore.toFixed(0)}%
- Difficulty Level: ${difficulty}

Requirements:
1. Create ${count} unique speaking topics appropriate for ${difficulty} level
2. Each topic should have:
   - A clear, engaging title
   - A detailed description that guides the student on what to talk about
   - Appropriate duration based on difficulty:
     * Beginner: 2-3 minutes
     * Intermediate: 3-4 minutes
     * Advanced: 4-5 minutes
3. Topics should be varied and interesting
4. Topics should help improve their speaking skills

Return ONLY a JSON array with this exact format (no markdown, no explanations):
[
  {
    "title": "Topic Title",
    "description": "Detailed description of what to talk about",
    "difficulty": "${difficulty}",
    "duration": "2-3 min"
  },
  ...
]`;

    const response = await callAIWithBackup(
      prompt,
      'Expert English teacher. Return JSON array of speaking topics only.',
      2000
    );

    // Parse JSON response
    let topics: any[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      topics = JSON.parse(cleaned);
      if (!Array.isArray(topics)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('[AI] Error parsing speaking topics:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Map to required format with colors and metadata
    const colors = [
      { color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
      { color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
      { color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50' },
      { color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
      { color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50' },
      { color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50' },
    ];

    return topics.slice(0, count).map((t, index) => ({
      id: index + 1,
      title: t.title || `Speaking Topic ${index + 1}`,
      description: t.description || '',
      difficulty: (t.difficulty || difficulty) as 'Beginner' | 'Intermediate' | 'Advanced',
      duration: t.duration || (difficulty === 'Beginner' ? '2-3 min' : difficulty === 'Intermediate' ? '3-4 min' : '4-5 min'),
      color: colors[index % colors.length].color,
      bgColor: colors[index % colors.length].bgColor,
      completed: false,
      score: null,
    }));
  } catch (error) {
    console.error('[AI] Error generating speaking topics:', error);
    throw new Error('Failed to generate speaking topics. Please check your API keys and try again.');
  }
};

export const analyzeHandwriting = async (imageBlob: Blob): Promise<{ text: string; feedback: AIFeedback }> => {
  const extractedText = await extractTextFromImage(imageBlob);
  const feedback = await analyzeWriting(extractedText);
  return { text: extractedText, feedback };
};

// Helper function to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
