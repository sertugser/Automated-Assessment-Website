import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, BookOpen, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { getActivities, type UserActivity } from '../lib/user-progress';

interface QuizDetailProps {
  quizId: string;
  onBack: () => void;
}

export function QuizDetail({ quizId, onBack }: QuizDetailProps) {
  const [quiz, setQuiz] = useState<UserActivity | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const activities = getActivities();
    const found = activities.find(a => a.id === quizId && a.type === 'quiz');
    setQuiz(found || null);
  }, [quizId]);

  const toggleExpanded = (i: number) => {
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  };

  if (!quiz) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-12 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz not found</h2>
          <p className="text-gray-600 mb-6">The quiz you&apos;re looking for doesn&apos;t exist.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const questions = quiz.quizQuestions || [];
  const userAnswers = quiz.quizUserAnswers || [];
  const readingPassage = quiz.quizReadingPassage || '';
  const feedback = quiz.quizFeedback;
  const wrongCount = questions.filter((q, i) => {
    const u = userAnswers[i];
    return u != null && u !== q.correctAnswer;
  }).length;

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatTime = (sec: number) => `${Math.floor(sec / 60)}m ${sec % 60}s`;

  const filtered = filter === 'wrong'
    ? questions.map((q, i) => ({ q, i })).filter(({ q, i }) => {
        const u = userAnswers[i];
        return u != null && u !== q.correctAnswer;
      })
    : questions.map((q, i) => ({ q, i }));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header + Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"
      >
        <button
          type="button"
          onClick={onBack}
          className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors w-fit shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 truncate">
            {quiz.courseTitle || quiz.courseId || 'Quiz'}
          </h1>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <span className="text-lg font-bold">{quiz.score}%</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-200 shadow-lg text-gray-700">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium">{formatDate(quiz.date)}</span>
            </div>
            {quiz.duration != null && quiz.duration > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-200 shadow-lg text-gray-700">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">{formatTime(quiz.duration)}</span>
              </div>
            )}
            {quiz.cefrLevel && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-200 shadow-lg text-gray-700">
                <span className="text-sm font-semibold">{quiz.cefrLevel}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Reading passage – soft card */}
      {readingPassage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Reading Passage</h2>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 max-h-96 overflow-y-auto">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{readingPassage}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Questions – filter + question cards */}
      {questions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Questions</h2>
            <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${filter === 'all' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                All ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('wrong')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${filter === 'wrong' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Wrong ({wrongCount})
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {filtered.map(({ q, i: origIdx }) => {
                const u = userAnswers[origIdx];
                const correct = u != null && u === q.correctAnswer;
                const answered = u != null;
                const isOpen = expanded[origIdx] ?? true;

                return (
                  <motion.div
                    key={origIdx}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(origIdx)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                          correct ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {origIdx + 1}
                      </div>
                      <span className="flex-1 text-gray-900 font-semibold line-clamp-2">{q.question}</span>
                      {answered && (
                        correct
                          ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                          : <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                      )}
                      {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          key={`open-${origIdx}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-t border-gray-100 overflow-hidden"
                        >
                          <div className="p-5 pt-4 space-y-3 bg-gray-50/50">
                            {q.options.map((opt, oi) => {
                              const sel = u === oi;
                              const right = oi === q.correctAnswer;
                              return (
                                <div
                                  key={oi}
                                  className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm border-2 ${
                                    right
                                      ? 'bg-green-50 border-green-200 text-green-900'
                                      : sel
                                        ? 'bg-red-50 border-red-200 text-red-900'
                                        : 'bg-white border-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span className="font-medium">{opt}</span>
                                  {right && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                                  {sel && !right && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                </div>
                              );
                            })}
                            {q.explanation && (
                              <div
                                className={`mt-4 rounded-xl px-4 py-3 border-2 ${
                                  correct ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'
                                }`}
                              >
                                <p className="text-sm font-semibold text-gray-800 mb-1">{correct ? 'Correct' : 'Explanation'}</p>
                                <p className="text-sm text-gray-700">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* AI Feedback – Smart Insights style */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">AI Performance Analysis</h2>
            </div>
            <div className="space-y-4">
              {feedback.strongAreas && (
                <div className="bg-white/80 rounded-xl border-2 border-gray-100 p-4 shadow-sm">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Strong areas</p>
                  <p className="text-gray-700">{feedback.strongAreas}</p>
                </div>
              )}
              {feedback.areasForImprovement && (
                <div className="bg-white/80 rounded-xl border-2 border-gray-100 p-4 shadow-sm">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Areas for improvement</p>
                  <p className="text-gray-700">{feedback.areasForImprovement}</p>
                </div>
              )}
              {feedback.recommendation && (
                <div className="bg-white/80 rounded-xl border-2 border-gray-100 p-4 shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Recommendation</p>
                  <p className="text-gray-700">{feedback.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
