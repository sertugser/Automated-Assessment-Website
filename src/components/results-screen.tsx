import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, Clock, TrendingUp, RotateCcw, BookOpen, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { QuizResult } from './assessment-platform';
import { useLanguage } from '../contexts/LanguageContext';

type ReviewFilter = 'all' | 'wrong' | 'correct' | 'truefalse';

interface ResultsScreenProps {
  results: QuizResult;
  onRetry: () => void;
  onNewCourse: () => void;
  onBack?: () => void;
}

/** Detect if question is True/False (2 options, typically True/False or Yes/No) */
function isTrueFalseQuestion(q: { options?: string[] }): boolean {
  const opts = q.options ?? [];
  if (opts.length !== 2) return false;
  const a = opts[0]?.trim().toLowerCase() ?? '';
  const b = opts[1]?.trim().toLowerCase() ?? '';
  const tf = (s: string) => /^(true|false|yes|no|doğru|yanlış|evet|hayır)$/.test(s);
  return tf(a) && tf(b);
}

export function ResultsScreen({ results, onRetry, onNewCourse, onBack }: ResultsScreenProps) {
  const { t } = useLanguage();
  const { score, totalQuestions, correctAnswers, timeSpent, courseTitle, questions = [], userAnswers = [], readingPassage } = results;
  const [expandedReview, setExpandedReview] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [focusedQuestionIndex, setFocusedQuestionIndex] = useState<number | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToQuestion = useCallback((idx: number) => {
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    setFocusedQuestionIndex(idx);
    focusTimeoutRef.current = setTimeout(() => setFocusedQuestionIndex(null), 2500);
    const el = document.getElementById(`review-q-${idx}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Check if there are any True/False questions
  const hasTrueFalseQuestions = questions.some(q => isTrueFalseQuestion(q));
  
  // Reset filter to 'all' if True/False filter is selected but no True/False questions exist
  useEffect(() => {
    if (reviewFilter === 'truefalse' && !hasTrueFalseQuestions) {
      setReviewFilter('all');
    }
  }, [reviewFilter, hasTrueFalseQuestions]);

  const filteredQuestions = questions
    .map((q, i) => ({ q, origIdx: i }))
    .filter(({ q, origIdx }) => {
      const userChoice = userAnswers[origIdx];
      const isCorrect = userChoice != null && userChoice === q.correctAnswer;
      if (reviewFilter === 'wrong') return !isCorrect;
      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'truefalse') return isTrueFalseQuestion(q);
      return true;
    });
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPerformanceMessage = () => {
    if (score >= 90) return { title: 'Outstanding!', message: 'You\'ve mastered this topic!', color: 'from-green-500 to-emerald-600' };
    if (score >= 70) return { title: 'Great Job!', message: 'You\'re making excellent progress!', color: 'from-blue-500 to-indigo-600' };
    if (score >= 50) return { title: 'Good Effort!', message: 'Keep practicing to improve!', color: 'from-yellow-500 to-orange-600' };
    return { title: 'Keep Learning!', message: 'Review the material and try again!', color: 'from-orange-500 to-red-600' };
  };

  const performance = getPerformanceMessage();
  const pointsEarned = Math.round(score * 2.5);
  const avgTimePerQuestion = Math.round(timeSpent / totalQuestions);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Main Results Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
      >
        {/* Header with Score */}
        <div className={`bg-gradient-to-r ${performance.color} p-6 text-white text-center relative overflow-hidden`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative z-10"
          >
            <Trophy className="w-14 h-14 mx-auto mb-3" />
            <h1 className="text-4xl font-bold mb-1">{score}%</h1>
            <h2 className="text-xl font-bold mb-1">{performance.title}</h2>
            <p className="text-base opacity-90">{performance.message}</p>
          </motion.div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        </div>

        {/* Course Info */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">{courseTitle}</h3>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">+{pointsEarned} points</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-5 grid md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl text-center"
          >
            <Target className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-indigo-600 mb-0.5">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-sm text-gray-600">{t('results.correctAnswers')}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center"
          >
            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600 mb-0.5">
              {formatTime(timeSpent)}
            </div>
            <div className="text-sm text-gray-600">{t('results.totalTime')}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl text-center"
          >
            <TrendingUp className="w-6 h-6 text-pink-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-pink-600 mb-0.5">
              {avgTimePerQuestion}s
            </div>
            <div className="text-sm text-gray-600">{t('results.avgPerQuestion')}</div>
          </motion.div>
        </div>

        {/* AI Insights - use real AI feedback when available */}
        <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t('results.aiAnalysis')}</h3>
          <div className="space-y-3">
            {(results.feedback?.strongAreas || score >= 70) && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">{t('results.strongAreas')}</p>
                    <p className="text-gray-600 text-sm">
                      {results.feedback?.strongAreas || 'You demonstrated good understanding of core concepts. Your response time shows confidence in the material.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {(score < 90 || (results.feedback?.areasForImprovement ?? '').length > 0) && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">{t('results.areasToImprove')}</p>
                    <p className="text-gray-600 text-sm">
                      {results.feedback?.areasForImprovement || 'Review advanced topics and practice more challenging questions to reach mastery level.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-gray-900">{t('results.recommendation')}</p>
                  <p className="text-gray-600 text-sm">
                    {results.feedback?.recommendation || (score >= 90
                      ? 'Try an advanced course to continue challenging yourself!'
                      : 'Review the material and retry to improve your score. Practice makes perfect!')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review - bulk feedback with explanations */}
        {questions.length > 0 && (
          <div className="p-5 border-t border-gray-200">
            <button
              onClick={() => setExpandedReview(!expandedReview)}
              className="w-full flex items-center justify-between text-left mb-3"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('results.questionReview')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('results.questionReviewDesc')}</p>
              </div>
              {expandedReview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {expandedReview && (
              <>
                {readingPassage && readingPassage.trim() !== '' && (
                  <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      {t('results.readingPassage')}
                    </h4>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{readingPassage}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['all', 'wrong', 'correct', ...(hasTrueFalseQuestions ? ['truefalse'] : [])] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setReviewFilter(filter)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        reviewFilter === filter
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'all' && t('results.filterAll')}
                      {filter === 'wrong' && t('results.filterWrong')}
                      {filter === 'correct' && t('results.filterCorrect')}
                      {filter === 'truefalse' && t('results.filterTrueFalse')}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {filteredQuestions.map(({ q, origIdx }, listIdx) => {
                      const userChoice = userAnswers[origIdx];
                      const isCorrect = userChoice !== null && userChoice !== undefined && userChoice === q.correctAnswer;
                      const userText = userChoice != null && q.options[userChoice] != null ? q.options[userChoice] : '—';
                      const correctText = q.options[q.correctAnswer] ?? '—';
                      const isFocused = focusedQuestionIndex === origIdx;
                      return (
                        <motion.div
                          key={origIdx}
                          id={`review-q-${origIdx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => scrollToQuestion(origIdx)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToQuestion(origIdx); } }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: listIdx * 0.03 }}
                          className={`rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
                            isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          } ${isFocused ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <XCircle className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Full question text - no truncation, so user can see full context */}
                              <p className="font-semibold text-gray-900 mb-3 whitespace-pre-wrap break-words">
                                {origIdx + 1}. {q.question}
                              </p>
                              {/* All options so user can see full question context */}
                              {q.options && q.options.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('results.options')}</p>
                                  <ul className="space-y-1.5">
                                    {q.options.map((opt, oi) => {
                                      const isUserChoice = userChoice === oi;
                                      const isCorrectOpt = oi === q.correctAnswer;
                                      return (
                                        <li
                                          key={oi}
                                          className={`rounded-lg px-3 py-2 text-sm border flex items-center justify-between gap-2 ${
                                            isCorrectOpt
                                              ? 'bg-green-100 border-green-300 text-green-800 font-medium'
                                              : isUserChoice && !isCorrect
                                                ? 'bg-red-100 border-red-300 text-red-800 font-medium'
                                                : 'bg-gray-50 border-gray-200 text-gray-700'
                                          }`}
                                        >
                                          <span><span className="mr-2 font-mono text-gray-500">{String.fromCharCode(65 + oi)}.</span>{opt}</span>
                                          <span className="shrink-0">
                                            {isCorrectOpt && <CheckCircle className="w-4 h-4 text-green-600" />}
                                            {isUserChoice && !isCorrect && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-600" />}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-gray-600">{t('results.yourAnswer')}:</span>{' '}
                                  <span className={isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                    {userText}
                                  </span>
                                </p>
                                {!isCorrect && (
                                  <p>
                                    <span className="text-gray-600">{t('results.correctAnswer')}:</span>{' '}
                                    <span className="text-green-700 font-medium">{correctText}</span>
                                  </p>
                                )}
                              </div>
                              {(q.explanation && q.explanation.trim() && q.explanation !== 'No explanation provided') ? (
                                <p className="mt-2 text-gray-700 text-sm pt-2 border-t border-gray-200">
                                  <span className="font-medium text-gray-900">{t('results.explanation')}:</span>{' '}
                                  {q.explanation}
                                </p>
                              ) : (
                                <p className="mt-2 text-gray-600 text-sm pt-2 border-t border-gray-200 italic">
                                  <span className="font-medium text-gray-900">{t('results.explanation')}:</span>{' '}
                                  {t('results.explanationFallback')}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={onRetry}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              {t('common.retryAssessment')}
            </button>
            <button
              onClick={onNewCourse}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-900 px-5 py-3 rounded-xl font-semibold text-sm hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              {t('common.tryAnotherCourse')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
