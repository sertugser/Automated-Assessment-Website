import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronRight, ChevronLeft, Sparkles, BookOpen } from 'lucide-react';
import { generateQuizQuestions, generateIELTSSimulation, generateReadingComprehension } from '../lib/ai-services';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import type { CEFRLevel } from '../lib/auth';
import { subQuizzes } from './quiz-section';

interface QuizInterfaceProps {
  courseId: string;
  onComplete: (results: QuizResult) => void;
  onBack: () => void;
  questionCount?: number;
  duration?: number; // in minutes
  cefrLevel?: CEFRLevel | null;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  section?: 1 | 2 | 3;
}

interface ReadingComprehensionData {
  passage: string;
  questions: Question[];
}

// Quiz topic mapping for AI generation
const quizTopicMap: Record<string, { title: string; topic: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced' }> = {
  'grammar-basics': { title: 'English Grammar', topic: 'English Grammar Basics', difficulty: 'Beginner' },
  'vocabulary': { title: 'Vocabulary Building', topic: 'English Vocabulary', difficulty: 'Beginner' },
  'reading-comprehension': { title: 'Reading Comprehension', topic: 'Reading Comprehension', difficulty: 'Intermediate' },
  'listening': { title: 'Listening Skills', topic: 'English Listening Comprehension', difficulty: 'Intermediate' },
  'listening-practice': { title: 'Listening Practice', topic: 'English Listening', difficulty: 'Intermediate' },
  'speaking': { title: 'Speaking Practice', topic: 'English Speaking and Conversation', difficulty: 'Intermediate' },
  'writing': { title: 'Writing Skills', topic: 'English Writing and Composition', difficulty: 'Advanced' },
  'business-english': { title: 'Business English', topic: 'Business English and Professional Communication', difficulty: 'Advanced' },
  'ielts-prep': { title: 'IELTS Preparation', topic: 'IELTS Test Preparation and Practice', difficulty: 'Advanced' },
  'ielts-simulation': { title: 'IELTS Simulation', topic: 'IELTS Test Preparation', difficulty: 'Advanced' },
  'advanced-grammar': { title: 'Advanced Grammar', topic: 'Advanced English Grammar', difficulty: 'Advanced' },
};

// Helper function to get quiz info including sub-quiz topic
const getQuizInfo = (courseId: string): { title: string; topic: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced' } => {
  // Check if it's a sub-quiz
  for (const categoryQuizzes of Object.values(subQuizzes)) {
    const subQuiz = categoryQuizzes.find(sq => sq.courseId === courseId);
    if (subQuiz) {
      // Determine difficulty based on parent category
      const parentCategory = Object.keys(subQuizzes).find(key => 
        subQuizzes[key].some(sq => sq.courseId === courseId)
      );
      let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
      if (parentCategory === 'advanced-grammar' || parentCategory === 'ielts-simulation') {
        difficulty = 'Advanced';
      } else if (parentCategory === 'reading-comprehension' || parentCategory === 'listening') {
        difficulty = 'Intermediate';
      }
      return {
        title: subQuiz.title,
        topic: subQuiz.topic,
        difficulty,
      };
    }
  }
  
  // Fallback to main quizTopicMap
  return quizTopicMap[courseId] || { title: 'English Quiz', topic: 'General English', difficulty: 'Beginner' as const };
};

const IELTS_TIME_LIMIT_SEC = 60 * 60; // 60 minutes

export function QuizInterface({ courseId, onComplete, onBack, questionCount: propQuestionCount, duration: propDuration, cefrLevel }: QuizInterfaceProps) {
  const { t } = useLanguage();
  const quizInfo = useMemo(() => getQuizInfo(courseId), [courseId]);
  const isIELTS = useMemo(() => courseId.startsWith('ielts-simulation'), [courseId]);
  const isReadingComprehension = useMemo(() => courseId === 'reading-comprehension' || courseId.startsWith('reading-comprehension-'), [courseId]);
  // Use prop questionCount if provided, otherwise default to 15 for non-IELTS quizzes
  const questionCount = propQuestionCount ?? (isIELTS ? null : 15);
  const [ieltsStarted, setIeltsStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [readingPassage, setReadingPassage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeUpSubmitted, setTimeUpSubmitted] = useState(false);
  const loadingRef = useRef(false);
  const loadedCourseIdRef = useRef<string | null>(null);

  // For non-IELTS quizzes, automatically start loading if questionCount is available
  const shouldLoadQuiz = useMemo(() => isIELTS ? ieltsStarted : (questionCount != null && questionCount > 0), [isIELTS, ieltsStarted, questionCount]);

  // Reset when courseId changes
  useEffect(() => {
    if (loadedCourseIdRef.current !== courseId) {
      loadingRef.current = false;
      loadedCourseIdRef.current = null;
      setQuestions([]);
      setReadingPassage('');
    }
  }, [courseId]);

  useEffect(() => {
    // Prevent multiple loads
    if (!shouldLoadQuiz || loadingRef.current || loadedCourseIdRef.current === courseId) return;
    
    loadingRef.current = true;
    loadedCourseIdRef.current = courseId;
    
    const loadQuiz = async () => {
      setIsLoading(true);
      try {
        let generated: Question[];
        const currentQuizInfo = getQuizInfo(courseId);
        const currentIsIELTS = courseId.startsWith('ielts-simulation');
        const currentIsReadingComprehension = courseId === 'reading-comprehension' || courseId.startsWith('reading-comprehension-');
        
        if (currentIsIELTS) {
          generated = await generateIELTSSimulation();
          setQuestions(generated);
        } else if (currentIsReadingComprehension) {
          const readingData = await generateReadingComprehension(
            currentQuizInfo.difficulty,
            questionCount!,
            cefrLevel ?? undefined,
            currentQuizInfo.topic
          );
          // Ensure passage is always set - generateReadingComprehension should always return a passage
          const passage = readingData.passage && readingData.passage.trim() !== '' && readingData.passage !== 'No passage provided'
            ? readingData.passage 
            : 'This reading comprehension exercise requires you to read a passage and answer questions based on it. Please read the passage carefully before answering.';
          console.log('Reading comprehension - courseId:', courseId, 'isReadingComprehension:', currentIsReadingComprehension, 'passage length:', passage.length, 'passage preview:', passage.substring(0, 100));
          setReadingPassage(passage);
          setQuestions(readingData.questions);
          generated = readingData.questions;
        } else {
          generated = await generateQuizQuestions(
            currentQuizInfo.topic,
            currentQuizInfo.difficulty,
            questionCount!,
            cefrLevel ?? undefined
          );
          setQuestions(generated);
        }
        setAnswers(Array(generated.length).fill(null));
        setSelections(Array(generated.length).fill(null));
        setStartTime(Date.now());
        toast.success(currentIsIELTS ? 'IELTS simulation ready. Good luck!' : currentIsReadingComprehension ? 'Reading comprehension ready!' : 'Quiz questions generated successfully!');
      } catch (error) {
        console.error('Error generating quiz:', error);
        loadingRef.current = false;
        loadedCourseIdRef.current = null;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Failed to generate quiz: ${errorMessage}. Please check your API keys.`);
        setTimeout(() => onBack(), 2000);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuiz();
  }, [shouldLoadQuiz, courseId, questionCount, cefrLevel, onBack]);

  useEffect(() => {
    if (questions.length === 0 || startTime === 0) return;
    const t = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [questions.length, startTime]);

  const timeRemaining = isIELTS ? Math.max(0, IELTS_TIME_LIMIT_SEC - timeElapsed) : null;
  const timeUp = isIELTS && timeRemaining !== null && timeRemaining <= 0;

  useEffect(() => {
    if (!isIELTS || timeUpSubmitted || questions.length === 0 || !timeUp) return;
    setTimeUpSubmitted(true);
    const correctCount = answers.filter((a): a is boolean => a === true).length;
    const score = Math.round((correctCount / questions.length) * 100);
    onComplete({
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeSpent: timeElapsed,
      courseTitle: quizInfo.title,
      questions,
      userAnswers: selections,
      readingPassage: readingPassage || undefined,
    });
  }, [isIELTS, timeUp, timeUpSubmitted, questions.length, answers, selections, timeElapsed, quizInfo.title, onComplete, questions, readingPassage]);

  if (isIELTS && !ieltsStarted && !isLoading && questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('quiz.ieltsSimulation')}</h2>
          <p className="text-gray-600 mb-4">
            {t('quiz.ieltsIntro')}
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
            <li>{t('quiz.ielts40_60')}</li>
            <li>{t('quiz.ieltsSections')}</li>
            <li>{t('quiz.ieltsTypes')}</li>
            <li>{t('quiz.ieltsTimer')}</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIeltsStarted(true)}
              className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
            >
              {t('quiz.ieltsStart')}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('quiz.backToCourses')}
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Sparkles className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isIELTS ? t('quiz.generatingIelts') : t('quiz.generating')}
          </h2>
          <p className="text-gray-600">
            {isIELTS ? t('quiz.ieltsCreating') : t('quiz.aiCreating')}
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('quiz.noQuestions')}</h2>
          <p className="text-gray-600 mb-4">{t('quiz.noQuestionsDesc')}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
          >
            {t('quiz.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswerSelect = (index: number) => {
    if (timeUp) return;
    setSelectedAnswer(index);
  };

  /** Persist current selection when navigating away */
  const saveCurrentSelection = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentQuestion];
    if (!q) return;
    const isCorrect = selectedAnswer === q.correctAnswer;
    setAnswers(a => { const n = [...a]; n[currentQuestion] = isCorrect; return n; });
    setSelections(s => { const n = [...s]; n[currentQuestion] = selectedAnswer; return n; });
  };

  /** Save selection and move to next (no feedback until results) */
  const handleNext = () => {
    if (timeUp) return;
    if (selectedAnswer !== null) {
      const isCorrect = selectedAnswer === currentQ.correctAnswer;
      setAnswers(a => {
        const n = [...a];
        n[currentQuestion] = isCorrect;
        return n;
      });
      setSelections(s => {
        const n = [...s];
        n[currentQuestion] = selectedAnswer;
        return n;
      });
    }
    if (currentQuestion < questions.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      setSelectedAnswer(selections[next] ?? null);
    } else {
      const isCurrentCorrect = selectedAnswer !== null && selectedAnswer === currentQ.correctAnswer;
      const prevCorrect = answers.filter((a, i) => i !== currentQuestion && a === true).length;
      const correctCount = prevCorrect + (isCurrentCorrect ? 1 : 0);
      const score = Math.round((correctCount / questions.length) * 100);
      const finalSelections = [...selections];
      if (selectedAnswer !== null) finalSelections[currentQuestion] = selectedAnswer;
      onComplete({
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timeSpent: timeElapsed,
        courseTitle: quizInfo.title,
        questions: questions,
        userAnswers: finalSelections,
        readingPassage: readingPassage || undefined,
      });
    }
  };

  const handlePrev = () => {
    if (timeUp || currentQuestion <= 0) return;
    saveCurrentSelection();
    const prev = currentQuestion - 1;
    setCurrentQuestion(prev);
    setSelectedAnswer(selections[prev] ?? null);
  };

  const handleGoToQuestion = (idx: number) => {
    if (timeUp || idx < 0 || idx >= questions.length || idx === currentQuestion) return;
    saveCurrentSelection();
    setCurrentQuestion(idx);
    setSelectedAnswer(selections[idx] ?? null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {isIELTS ? 'IELTS Academic Reading' : quizInfo.title}
          </h1>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border shrink-0 ${
            timeUp ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          }`}>
            <Clock className={`w-5 h-5 ${timeUp ? 'text-red-600' : 'text-indigo-600'}`} />
            <span className={`font-semibold ${timeUp ? 'text-red-700' : 'text-gray-900'}`}>
              {timeUp ? t('quiz.timesUp') : isIELTS && timeRemaining != null
                ? `${t('quiz.timeLeft')}: ${formatTime(timeRemaining)}`
                : formatTime(timeElapsed)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {currentQ.section != null && `Section ${currentQ.section} · `}
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-semibold text-indigo-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Reading Passage - Show for Reading Comprehension */}
      {(courseId === 'reading-comprehension' || courseId.startsWith('reading-comprehension-')) && readingPassage && readingPassage.trim() !== '' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 mb-6 border-2 border-purple-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-purple-900">Reading Passage</h3>
          </div>
          <div className="bg-white rounded-lg p-6 max-h-96 overflow-y-auto">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{readingPassage}</p>
          </div>
        </motion.div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-6"
        >
          {/* Topic / Section Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {currentQ.section != null ? `Section ${currentQ.section}` : currentQ.topic}
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            {currentQ.question}
          </h2>

          {/* Options - no feedback during quiz */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              return (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={timeUp}
                  whileHover={{ scale: timeUp ? 1 : 1.02 }}
                  whileTap={{ scale: timeUp ? 1 : 0.98 }}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 bg-white'}
                  `}
                >
                  <span className="font-medium text-gray-900">{option}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Action Buttons - Next only, no Check Answer */}
          <div className="flex gap-4 mt-6 flex-wrap">
            {timeUp ? (
              <div className="w-full py-3 rounded-xl font-semibold bg-red-100 text-red-800 text-center">
                {t('quiz.submitting')}
              </div>
            ) : (
              <>
                <button
                  onClick={onBack}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:border-gray-400 transition-all"
                >
                  {t('quiz.backToCourses')}
                </button>
                {currentQuestion > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-6 py-3 border-2 border-indigo-200 rounded-xl font-semibold text-indigo-700 hover:bg-indigo-50 transition-all flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    {t('quiz.previous')}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={selectedAnswer === null}
                  className={`
                    flex-1 min-w-0 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                    ${selectedAnswer !== null
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {currentQuestion < questions.length - 1 ? t('quiz.nextQuestion') : t('quiz.viewResults')}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer Tracker - only answered/current, no correct/wrong until results */}
      <div className="flex gap-2 justify-center flex-wrap">
        {questions.map((_, index) => {
          const answered = selections[index] !== null && selections[index] !== undefined;
          const isCurrent = index === currentQuestion;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleGoToQuestion(index)}
              disabled={timeUp}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm transition-all shrink-0
                ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : ''}
                ${answered && !isCurrent ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : ''}
                ${!answered && !isCurrent ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : ''}
                ${timeUp ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}