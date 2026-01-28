import { motion } from 'motion/react';
import { Trophy, Target, Clock, TrendingUp, RotateCcw, BookOpen, Share2, Download } from 'lucide-react';
import { QuizResult } from './assessment-platform';

interface ResultsScreenProps {
  results: QuizResult;
  onRetry: () => void;
  onNewCourse: () => void;
}

export function ResultsScreen({ results, onRetry, onNewCourse }: ResultsScreenProps) {
  const { score, totalQuestions, correctAnswers, timeSpent, courseTitle } = results;
  
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Main Results Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8"
      >
        {/* Header with Score */}
        <div className={`bg-gradient-to-r ${performance.color} p-8 text-white text-center relative overflow-hidden`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative z-10"
          >
            <Trophy className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-5xl font-bold mb-2">{score}%</h1>
            <h2 className="text-2xl font-bold mb-2">{performance.title}</h2>
            <p className="text-lg opacity-90">{performance.message}</p>
          </motion.div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        </div>

        {/* Course Info */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{courseTitle}</h3>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">+{pointsEarned} points</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-8 grid md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl text-center"
          >
            <Target className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-sm text-gray-600">Correct Answers</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center"
          >
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {formatTime(timeSpent)}
            </div>
            <div className="text-sm text-gray-600">Total Time</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-2xl text-center"
          >
            <TrendingUp className="w-8 h-8 text-pink-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-pink-600 mb-1">
              {avgTimePerQuestion}s
            </div>
            <div className="text-sm text-gray-600">Avg per Question</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl text-center"
          >
            <Trophy className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-green-600 mb-1">
              {score >= 70 ? 'A' : score >= 50 ? 'B' : 'C'}
            </div>
            <div className="text-sm text-gray-600">Grade</div>
          </motion.div>
        </div>

        {/* AI Insights */}
        <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">AI Performance Analysis</h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-gray-900">Strong Areas</p>
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
                    <p className="font-semibold text-gray-900">Areas for Improvement</p>
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
                  <p className="font-semibold text-gray-900">Recommendation</p>
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

        {/* Action Buttons */}
        <div className="p-8 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={onRetry}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:shadow-xl transition-all"
            >
              <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Retry Assessment
            </button>
            <button
              onClick={onNewCourse}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-900 px-6 py-4 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              <BookOpen className="w-5 h-5" />
              Try Another Course
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all">
              <Share2 className="w-5 h-5" />
              Share Results
            </button>
            <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all">
              <Download className="w-5 h-5" />
              Download Certificate
            </button>
          </div>
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-2xl shadow-lg p-8"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Continue Your Learning Journey</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Advanced Topics', icon: TrendingUp, desc: 'Ready for the next level?' },
            { title: 'Practice Mode', icon: Target, desc: 'Sharpen your skills' },
            { title: 'Study Guide', icon: BookOpen, desc: 'Review key concepts' }
          ].map((item, index) => (
            <div
              key={index}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-600 hover:shadow-lg transition-all cursor-pointer group"
            >
              <item.icon className="w-10 h-10 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
