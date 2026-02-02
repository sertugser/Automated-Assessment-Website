import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import logo from '../assets/fbaa49f59eaf54473f226d88f4a207918ca971f2.png';
import { generatePlacementQuestions, getDefaultPlacementQuestions, scoreToCEFR, calculateWeightedScore, type CEFRLevel } from '../lib/ai-services';
import { updateUser, getCurrentUser, type User } from '../lib/auth';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: 'A1 – Beginner',
  A2: 'A2 – Elementary',
  B1: 'B1 – Intermediate',
  B2: 'B2 – Upper Intermediate',
  C1: 'C1 – Advanced',
  C2: 'C2 – Proficient',
};

interface PlacementTestProps {
  user: User;
  onComplete: (cefrLevel: CEFRLevel) => void;
  onBack?: () => void;
  /** Shown when retaking from inside platform */
  isRetake?: boolean;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  cefrLevel: CEFRLevel;
  weight: number;
}

const PLACEMENT_COUNT = 18;

export function PlacementTest({ user, onComplete, onBack, isRetake }: PlacementTestProps) {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]); // Track correct/incorrect for each question
  const [selections, setSelections] = useState<(number | null)[]>([]); // Track selected answers for each question
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; cefr: CEFRLevel } | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const q = await generatePlacementQuestions(PLACEMENT_COUNT);
        const loadedQuestions = q?.length ? q : getDefaultPlacementQuestions(PLACEMENT_COUNT);
        setQuestions(loadedQuestions);
        // Initialize selections and answers arrays
        setSelections(Array(loadedQuestions.length).fill(null));
        setAnswers(Array(loadedQuestions.length).fill(null));
        toast.success('Placement test ready!');
      } catch (e) {
        console.warn('Placement test load failed, using built-in questions:', e);
        const defaultQuestions = getDefaultPlacementQuestions(PLACEMENT_COUNT);
        setQuestions(defaultQuestions);
        setSelections(Array(defaultQuestions.length).fill(null));
        setAnswers(Array(defaultQuestions.length).fill(null));
        toast.success('Placement test ready!');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!started || !questions.length) return;
    const t = setInterval(() => setTimeElapsed(Math.floor((Date.now() - (startTime ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started, questions.length, startTime]);

  const startTest = () => {
    setStarted(true);
    setStartTime(Date.now());
  };

  const currentQ = questions[currentQuestion];
  const progress = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    // Update selections array for current question
    setSelections((s) => {
      const newSelections = [...s];
      newSelections[currentQuestion] = index;
      return newSelections;
    });
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevIndex = currentQuestion - 1;
      setCurrentQuestion(prevIndex);
      setSelectedAnswer(selections[prevIndex] ?? null);
    }
  };

  const handleNext = () => {
    if (!currentQ) return;
    
    // Save current answer if selected
    if (selectedAnswer !== null) {
      const isCorrect = selectedAnswer === currentQ.correctAnswer;
      setAnswers((a) => {
        const newAnswers = [...a];
        newAnswers[currentQuestion] = isCorrect;
        return newAnswers;
      });
    }
    
    if (currentQuestion < questions.length - 1) {
      const nextIndex = currentQuestion + 1;
      setCurrentQuestion(nextIndex);
      setSelectedAnswer(selections[nextIndex] ?? null);
    } else {
      // Last question - calculate final weighted score
      // Make sure last answer is included
      const finalAnswers = [...answers];
      if (selectedAnswer !== null && finalAnswers[currentQuestion] === null) {
        finalAnswers[currentQuestion] = selectedAnswer === currentQ.correctAnswer;
      }
      // Use weighted scoring instead of simple percentage
      const score = calculateWeightedScore(questions, finalAnswers);
      const cefr = scoreToCEFR(score);
      setResult({ score, cefr });
      setFinished(true);
    }
  };

  const handleContinue = () => {
    if (!result) return;
    const u = getCurrentUser();
    if (u) {
      updateUser(u.id, { cefrLevel: result.cefr, placementTestCompleted: true });
    }
    onComplete(result.cefr);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        </div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center max-w-md w-full border border-white/50">
          <Sparkles className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing your placement test</h2>
          <p className="text-gray-600">Generating questions to determine your CEFR level…</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        </div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center max-w-md w-full border border-white/50">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load test</h2>
          <p className="text-gray-600 mb-4">Please check your API keys and try again.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-indigo-600 bg-white/80 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </button>
        )}
        {/* Background blobs (same as auth) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo & title */}
          <div className="text-center mb-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="inline-flex items-center justify-center mb-3"
            >
              <img src={logo} alt="AssessAI" className="w-16 h-16" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-bold text-gray-900 mb-1"
            >
              English Placement Test
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-gray-600"
            >
              Discover your CEFR level (A1–C2)
            </motion.p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <div className="p-1.5 bg-green-100 rounded-lg mb-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">{PLACEMENT_COUNT} Q · ~10 min</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <div className="p-1.5 bg-indigo-100 rounded-lg mb-1.5">
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Grammar & vocab</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <div className="p-1.5 bg-purple-100 rounded-lg mb-1.5">
                  <Trophy className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">A1–C2 result</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={startTest}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all"
              >
                Start test
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (finished && result) {
    const correctCount = answers.filter((a): a is boolean => a === true).length;
    const wrongCount = answers.filter((a): a is boolean => a === false).length;
    
    // Calculate level-specific performance
    const levelStats: Record<CEFRLevel, { correct: number; total: number }> = {
      A1: { correct: 0, total: 0 },
      A2: { correct: 0, total: 0 },
      B1: { correct: 0, total: 0 },
      B2: { correct: 0, total: 0 },
      C1: { correct: 0, total: 0 },
      C2: { correct: 0, total: 0 },
    };
    
    questions.forEach((q, index) => {
      levelStats[q.cefrLevel].total++;
      if (answers[index] === true) {
        levelStats[q.cefrLevel].correct++;
      }
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          {/* Result Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-6 border border-white/50"
          >
            <div className="text-center mb-8">
              <div className="p-4 bg-indigo-100 rounded-2xl inline-flex mb-6">
                <Trophy className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Test Tamamlandı!</h2>
              <p className="text-5xl font-bold text-indigo-600 mb-2">{result.cefr}</p>
              <p className="text-xl text-gray-600 mb-4">{CEFR_LABELS[result.cefr]}</p>
              <div className="flex items-center justify-center gap-6 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700"><strong>{correctCount}</strong> Doğru</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-gray-700"><strong>{wrongCount}</strong> Yanlış</span>
                </div>
                <div className="text-gray-700">
                  <strong>Ağırlıklı Skor:</strong> {result.score}%
                </div>
              </div>
              
              {/* Level Performance Breakdown */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Seviye Bazlı Performans:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {(Object.keys(levelStats) as CEFRLevel[]).map(level => {
                    const stats = levelStats[level];
                    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                      <div key={level} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <span className="font-medium text-gray-700">{level}:</span>
                        <span className={`font-semibold ${percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {stats.correct}/{stats.total} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Questions Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/50 mb-6"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Sorular ve Cevaplar</h3>
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {questions.map((q, index) => {
                const userAnswer = selections[index];
                const isCorrect = answers[index] === true;
                const userSelected = userAnswer !== null && userAnswer !== undefined;
                
                return (
                  <div
                    key={q.id}
                    className={`p-6 rounded-xl border-2 ${
                      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-gray-600">Soru {index + 1}</span>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                          {q.topic}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          q.cefrLevel === 'A1' ? 'bg-blue-100 text-blue-700' :
                          q.cefrLevel === 'A2' ? 'bg-green-100 text-green-700' :
                          q.cefrLevel === 'B1' ? 'bg-yellow-100 text-yellow-700' :
                          q.cefrLevel === 'B2' ? 'bg-orange-100 text-orange-700' :
                          q.cefrLevel === 'C1' ? 'bg-purple-100 text-purple-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.cefrLevel} (Ağırlık: {q.weight})
                        </span>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{q.question}</h4>
                    
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, i) => {
                        const isUserAnswer = userSelected && userAnswer === i;
                        const isCorrectAnswer = i === q.correctAnswer;
                        
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border-2 flex items-center justify-between ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-100'
                                : isUserAnswer && !isCorrectAnswer
                                ? 'border-red-500 bg-red-100'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <span className={isCorrectAnswer ? 'font-semibold text-green-900' : isUserAnswer ? 'font-semibold text-red-900' : 'text-gray-700'}>
                              {opt}
                            </span>
                            <div className="flex items-center gap-2">
                              {isCorrectAnswer && <span className="text-xs font-semibold text-green-700">Doğru Cevap</span>}
                              {isUserAnswer && !isCorrectAnswer && <span className="text-xs font-semibold text-red-700">Sizin Cevabınız</span>}
                              {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong className="text-gray-900">Açıklama:</strong> {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <button
              onClick={handleContinue}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all text-lg"
            >
              {isRetake ? t('common.backToDashboard') : t('common.continue')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Placement test</h1>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">{formatTime(timeElapsed)}</span>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {currentQ.topic}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{currentQ.question}</h2>
            <div className="space-y-3 mb-6">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedAnswer === i;
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleAnswerSelect(i)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                    }`}
                  >
                    <span>{opt}</span>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex justify-between gap-2">
              <div>
                {currentQuestion > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Önceki
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleNext}
                  disabled={selectedAnswer === null}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
                >
                  {currentQuestion < questions.length - 1 ? 'Sonraki' : 'Testi Bitir'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Question Navigation - Clickable question numbers */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {questions.map((_, index) => {
            const answered = selections[index] !== null && selections[index] !== undefined;
            const isCurrent = index === currentQuestion;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (index !== currentQuestion) {
                    setCurrentQuestion(index);
                    setSelectedAnswer(selections[index] ?? null);
                  }
                }}
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm transition-all
                  shrink-0
                  ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : ''}
                  ${answered && !isCurrent ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : ''}
                  ${!answered && !isCurrent ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : ''}
                `}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
