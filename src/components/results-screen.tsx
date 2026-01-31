import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, Clock, TrendingUp, RotateCcw, BookOpen, Share2, Download, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { QuizResult } from './assessment-platform';
import { useLanguage } from '../contexts/LanguageContext';

interface ResultsScreenProps {
  results: QuizResult;
  onRetry: () => void;
  onNewCourse: () => void;
  onBack?: () => void;
}

export function ResultsScreen({ results, onRetry, onNewCourse, onBack }: ResultsScreenProps) {
  const { t } = useLanguage();
  const { score, totalQuestions, correctAnswers, timeSpent, courseTitle, questions = [], userAnswers = [] } = results;
  const [expandedReview, setExpandedReview] = useState(true);
  
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
        <div className="p-5 grid md:grid-cols-4 gap-4">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center"
          >
            <Trophy className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600 mb-0.5">
              {score >= 70 ? 'A' : score >= 50 ? 'B' : 'C'}
            </div>
            <div className="text-sm text-gray-600">{t('results.grade')}</div>
          </motion.div>
        </div>

        {/* AI Insights */}
        <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t('results.aiAnalysis')}</h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-gray-900">{t('results.strongAreas')}</p>
                  <p className="text-gray-600 text-sm">
                    You demonstrated excellent understanding of core concepts. Your response time shows confidence in the material.
                  </p>
                </div>
              </div>
            </div>
            {score < 90 && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-gray-900">{t('results.areasToImprove')}</p>
                  <p className="text-gray-600 text-sm">
                    Review advanced topics and practice more challenging questions to reach mastery level.
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
                    {score >= 90 
                      ? 'Try an advanced course to continue challenging yourself!'
                      : 'Review the material and retry to improve your score. Practice makes perfect!'}
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
            <AnimatePresence>
              {expandedReview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {questions.map((q, idx) => {
                    const userChoice = userAnswers[idx];
                    const isCorrect = userChoice !== null && userChoice !== undefined && userChoice === q.correctAnswer;
                    const userText = userChoice != null && q.options[userChoice] != null ? q.options[userChoice] : '—';
                    const correctText = q.options[q.correctAnswer] ?? '—';
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`rounded-xl p-4 border-2 ${
                          isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
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
                            <p className="font-semibold text-gray-900 mb-2">
                              {idx + 1}. {q.question}
                            </p>
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
                            {q.explanation && (
                              <p className="mt-2 text-gray-700 text-sm pt-2 border-t border-gray-200">
                                <span className="font-medium text-gray-900">{t('results.explanation')}:</span>{' '}
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
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
              Retry Assessment
            </button>
            <button
              onClick={onNewCourse}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-900 px-5 py-3 rounded-xl font-semibold text-sm hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Try Another Course
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all">
              <Share2 className="w-4 h-4" />
              Share Results
            </button>
            <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all">
              <Download className="w-4 h-4" />
              Download Certificate
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
