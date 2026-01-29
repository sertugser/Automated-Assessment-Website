import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Calendar, Target, BookOpen, ChevronRight } from 'lucide-react';
import { getActivities, type UserActivity } from '../lib/user-progress';
import { useLanguage } from '../contexts/LanguageContext';

interface QuizHistoryProps {
  onBack: () => void;
  onQuizClick?: (quizId: string) => void;
}

export function QuizHistory({ onBack, onQuizClick }: QuizHistoryProps) {
  const { t } = useLanguage();
  const [quizHistory, setQuizHistory] = useState<UserActivity[]>([]);

  useEffect(() => {
    const activities = getActivities();
    const quizzes = activities
      .filter(a => a.type === 'quiz')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setQuizHistory(quizzes);
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) return `${daysDiff} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const calculateStats = (quiz: UserActivity) => {
    let correct = quiz.correctAnswers ?? 0;
    let total = quiz.totalQuestions ?? 0;
    if (total === 0 && quiz.score > 0) {
      const est = 20;
      correct = Math.round((quiz.score / 100) * est);
      total = est;
    }
    return { correctAnswers: correct, totalQuestions: total };
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-1">Quiz History</h1>
            <p className="text-gray-600 text-sm">View completed quizzes and track your progress</p>
          </div>
        </div>
      </motion.div>

      {quizHistory.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-12 text-center border-2 border-gray-200 shadow-lg"
        >
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Quiz History</h3>
          <p className="text-gray-600">You haven&apos;t completed any quizzes yet. Start a quiz to see your progress here.</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
        >
          <ul className="divide-y divide-gray-100">
            {quizHistory.map((quiz, index) => {
              const { correctAnswers, totalQuestions } = calculateStats(quiz);
              const wrongAnswers = totalQuestions > 0 ? totalQuestions - correctAnswers : 0;
              const title = quiz.courseTitle || quiz.courseId || 'Quiz';
              return (
                <li key={quiz.id}>
                  <button
                    type="button"
                    onClick={() => onQuizClick?.(quiz.id)}
                    className="w-full flex items-center gap-4 px-4 py-4 sm:px-6 sm:py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(quiz.date)}
                        </span>
                        {quiz.duration != null && quiz.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(quiz.duration)}
                          </span>
                        )}
                        {quiz.cefrLevel && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                            {quiz.cefrLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 shrink-0 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {correctAnswers}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        {wrongAnswers}
                      </span>
                      <span className="text-gray-400">/ {totalQuestions}</span>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 shrink-0">{quiz.score}%</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
