import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Target, BookOpen, Headphones, Edit, MessageSquare,
  Trophy, Clock, ChevronRight, Sparkles, CheckCircle
} from 'lucide-react';

const assessmentCategories = [
  {
    id: 1,
    title: 'Vocabulary Assessment',
    description: 'Test your English vocabulary level across different topics',
    icon: BookOpen,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    questions: 25,
    duration: '15 min',
    completed: true,
    score: 88,
    level: 'B2 - Upper Intermediate'
  },
  {
    id: 2,
    title: 'Listening Comprehension',
    description: 'Evaluate your listening skills with audio recordings',
    icon: Headphones,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    questions: 20,
    duration: '20 min',
    completed: true,
    score: 85,
    level: 'B2 - Upper Intermediate'
  },
  {
    id: 3,
    title: 'Grammar & Structure',
    description: 'Assess your understanding of English grammar rules',
    icon: Edit,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    questions: 30,
    duration: '20 min',
    completed: false,
    score: null,
    level: null
  },
  {
    id: 4,
    title: 'Reading Comprehension',
    description: 'Test your reading and understanding abilities',
    icon: BookOpen,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    questions: 15,
    duration: '25 min',
    completed: false,
    score: null,
    level: null
  },
  {
    id: 5,
    title: 'Speaking Fluency',
    description: 'Record yourself and get AI feedback on pronunciation',
    icon: MessageSquare,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    questions: 10,
    duration: '15 min',
    completed: false,
    score: null,
    level: null
  }
];

export function LevelAssessment() {
  const [selectedAssessment, setSelectedAssessment] = useState<number | null>(null);

  const completedCount = assessmentCategories.filter(cat => cat.completed).length;
  const totalCategories = assessmentCategories.length;
  const overallProgress = Math.round((completedCount / totalCategories) * 100);

  // Calculate overall level based on completed assessments
  const completedAssessments = assessmentCategories.filter(cat => cat.completed);
  const avgScore = completedAssessments.length > 0
    ? Math.round(completedAssessments.reduce((sum, cat) => sum + (cat.score || 0), 0) / completedAssessments.length)
    : 0;

  const getOverallLevel = () => {
    if (avgScore >= 90) return 'C1 - Advanced';
    if (avgScore >= 80) return 'B2 - Upper Intermediate';
    if (avgScore >= 70) return 'B1 - Intermediate';
    if (avgScore >= 60) return 'A2 - Elementary';
    return 'A1 - Beginner';
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Level Assessment</h1>
        <p className="text-lg text-gray-600">Discover your English proficiency level with AI-powered tests</p>
      </motion.div>

      {/* Overall Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Trophy className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {completedCount > 0 ? getOverallLevel() : 'Not Assessed Yet'}
              </h2>
              <p className="text-indigo-100 text-lg">Your Current English Level</p>
              {completedCount > 0 && (
                <p className="text-indigo-100 text-sm mt-1">
                  Average Score: {avgScore}% • {completedCount}/{totalCategories} Assessments Completed
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold mb-2">{overallProgress}%</div>
            <div className="text-indigo-100">Overall Progress</div>
          </div>
        </div>
      </motion.div>

      {/* Assessment Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Assessment Categories</h2>
          <div className="text-sm text-gray-600">
            Complete all tests to get your official CEFR level
          </div>
        </div>

        <div className="space-y-3">
          {assessmentCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => setSelectedAssessment(category.id)}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`p-3 bg-gradient-to-br ${category.color} rounded-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <category.icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{category.title}</h3>
                    {category.completed && (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-semibold flex-shrink-0">
                        <CheckCircle className="w-4 h-4" />
                        <span>{category.score}%</span>
                      </div>
                    )}
                    {category.level && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium flex-shrink-0">
                        {category.level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>

                {/* Meta & Action */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-sm text-gray-600 text-right">
                    <div className="font-medium text-gray-900">{category.questions} questions</div>
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{category.duration}</span>
                    </div>
                  </div>
                  <button className={`bg-gradient-to-r ${category.color} text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2`}>
                    {category.completed ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Retake
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4" />
                        Start Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Information Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200 mt-8"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-200 rounded-lg flex-shrink-0">
            <Sparkles className="w-6 h-6 text-yellow-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">About CEFR Levels</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>A1-A2 (Beginner - Elementary):</strong> Basic phrases and simple communication</p>
              <p><strong>B1-B2 (Intermediate - Upper Intermediate):</strong> Can handle most daily situations independently</p>
              <p><strong>C1-C2 (Advanced - Proficient):</strong> Near-native fluency and comprehension</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
