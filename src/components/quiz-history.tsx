import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Calendar, Target, TrendingUp } from 'lucide-react';
import { getActivities, type UserActivity } from '../lib/user-progress';
import { useLanguage } from '../contexts/LanguageContext';
import { quizCategories } from './quiz-section';

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
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        return `${daysDiff} days ago`;
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getLevelColor = (level?: string) => {
    if (!level) return 'bg-gray-100 text-gray-700';
    if (level === 'A1' || level === 'A2') return 'bg-green-100 text-green-700';
    if (level === 'B1' || level === 'B2') return 'bg-yellow-100 text-yellow-700';
    if (level === 'C1' || level === 'C2') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Calculate stats from score if missing (for old quizzes)
  const calculateStats = (quiz: UserActivity) => {
    let correctAnswers = quiz.correctAnswers ?? 0;
    let totalQuestions = quiz.totalQuestions ?? 0;
    
    // If missing, estimate from score (assuming score is percentage)
    if (totalQuestions === 0 && quiz.score > 0) {
      // Try to estimate: common quiz sizes are 10, 12, 15, 20, 25, 40
      // Use score to estimate: if score is 35%, and we assume 20 questions, that's 7 correct
      // But we can't know exact total, so we'll use a reasonable default
      const estimatedTotal = 20; // Default assumption
      correctAnswers = Math.round((quiz.score / 100) * estimatedTotal);
      totalQuestions = estimatedTotal;
    }
    
    return { correctAnswers, totalQuestions };
  };

  // Get quiz color based on courseId
  const getQuizColor = (courseId?: string) => {
    const category = quizCategories.find(cat => cat.courseId === courseId);
    if (category) {
      // Special handling for Advanced Grammar - use red instead of pink
      if (courseId === 'advanced-grammar') {
        return {
          bg: 'bg-red-100',
          border: 'border-red-200',
          text: 'text-red-800',
          badge: 'bg-red-200',
          bodyBg: 'bg-red-50/30',
        };
      }
      
      // Map color names to actual Tailwind classes with more vibrant colors
      const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; bodyBg: string }> = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', badge: 'bg-blue-200', bodyBg: 'bg-blue-50/30' },
        green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', badge: 'bg-green-200', bodyBg: 'bg-green-50/30' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-200', bodyBg: 'bg-purple-50/30' },
        orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', badge: 'bg-orange-200', bodyBg: 'bg-orange-50/30' },
        pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', badge: 'bg-pink-200', bodyBg: 'bg-pink-50/30' },
        teal: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', badge: 'bg-teal-200', bodyBg: 'bg-teal-50/30' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', badge: 'bg-indigo-200', bodyBg: 'bg-indigo-50/30' },
      };
      
      const colorMatch = category.color.match(/from-(\w+)-500/);
      if (colorMatch && colorMap[colorMatch[1]]) {
        return colorMap[colorMatch[1]];
      }
    }
    return {
      bg: 'bg-indigo-100',
      border: 'border-indigo-300',
      text: 'text-indigo-800',
      badge: 'bg-indigo-200',
      bodyBg: 'bg-indigo-50/30',
    };
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz History</h1>
          <p className="text-gray-600">View all your completed quizzes and track your progress</p>
        </div>
      </div>

      {/* Quiz List - Modern Card Grid */}
      {quizHistory.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-12 text-center border-2 border-gray-200 shadow-lg"
        >
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Quiz History</h3>
          <p className="text-gray-600">You haven't completed any quizzes yet. Start your first quiz to see your progress here!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quizHistory.map((quiz, index) => {
            const { correctAnswers, totalQuestions } = calculateStats(quiz);
            const wrongAnswers = totalQuestions > 0 ? totalQuestions - correctAnswers : 0;
            const score = quiz.score;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : score;
            const colors = getQuizColor(quiz.courseId);

            return (
              <motion.button
                key={quiz.id}
                onClick={() => onQuizClick?.(quiz.id)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className={`${colors.bodyBg} rounded-3xl border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all flex flex-col overflow-hidden cursor-pointer w-full text-left`}
              >
                {/* Header */}
                <div className={`p-4 ${colors.bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-1">
                        {quiz.courseTitle || quiz.courseId || 'Quiz'}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quiz.cefrLevel && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLevelColor(quiz.cefrLevel)}`}>
                            {quiz.cefrLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`ml-2 px-3 py-1.5 rounded-2xl ${colors.badge} shadow-sm`}>
                      <div className={`text-xl font-bold ${colors.text}`}>
                        {score}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className={`p-4 flex-1 ${colors.bodyBg}`}>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* Correct */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2.5 text-center shadow-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">{correctAnswers}</div>
                      <div className="text-xs text-gray-600">Correct</div>
                    </div>

                    {/* Wrong */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2.5 text-center shadow-sm">
                      <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">{wrongAnswers}</div>
                      <div className="text-xs text-gray-600">Wrong</div>
                    </div>

                    {/* Total */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2.5 text-center shadow-sm">
                      <Target className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">{totalQuestions}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={`px-4 py-2.5 ${colors.bg} border-t ${colors.border}`}>
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(quiz.date)}</span>
                    </div>
                    {quiz.duration && quiz.duration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(quiz.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
