import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import {
  Brain, Clock, Award, CheckCircle, Star, Trophy,
  Zap, Target, ChevronRight, Play, BookOpen, TrendingUp, Calendar, ArrowLeft
} from 'lucide-react';
import { getQuizStats, getRecentQuizzes, getQuizStatsByCourse, getActivities, getUserStats } from '../lib/user-progress';
import { generatePersonalizedTips } from '../lib/ai-services';
import type { CEFRLevel } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';

export const quizCategories = [
  {
    id: 1,
    title: 'Grammar Essentials',
    description: 'Test your grammar knowledge',
    difficulty: 'Beginner',
    questions: 15,
    duration: 10,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    icon: BookOpen,
    courseId: 'grammar-basics',
  },
  {
    id: 2,
    title: 'Vocabulary Challenge',
    description: 'Expand your word knowledge',
    difficulty: 'Beginner',
    questions: 20,
    duration: 12,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    icon: Star,
    courseId: 'vocabulary',
  },
  {
    id: 3,
    title: 'Reading Comprehension',
    description: 'Understand passages deeply',
    difficulty: 'Intermediate',
    questions: 12,
    duration: 20,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    icon: BookOpen,
    courseId: 'reading-comprehension',
  },
  {
    id: 4,
    title: 'Listening Practice',
    description: 'Improve audio comprehension',
    difficulty: 'Intermediate',
    questions: 15,
    duration: 18,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    icon: Brain,
    courseId: 'listening',
  },
  {
    id: 5,
    title: 'Advanced Grammar',
    description: 'Master complex structures',
    difficulty: 'Advanced',
    questions: 20,
    duration: 25,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    icon: Trophy,
    courseId: 'advanced-grammar',
  },
  {
    id: 6,
    title: 'IELTS Simulation',
    description: 'Full IELTS Academic Reading simulation (40 q, 60 min)',
    difficulty: 'Advanced',
    questions: 40,
    duration: 60,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    icon: Award,
    courseId: 'ielts-simulation',
  }
];

// Sub-quizzes for each category
export const subQuizzes: Record<string, Array<{
  id: string;
  title: string;
  description: string;
  questions: number;
  duration: number;
  courseId: string;
  topic: string;
}>> = {
  'grammar-basics': [
    { id: 'present-tense', title: 'Present Tenses', description: 'Master present simple, continuous, and perfect', questions: 15, duration: 10, courseId: 'grammar-basics-present-tense', topic: 'Present Tenses (Present Simple, Present Continuous, Present Perfect)' },
    { id: 'past-tense', title: 'Past Tenses', description: 'Learn past simple, continuous, and perfect', questions: 15, duration: 10, courseId: 'grammar-basics-past-tense', topic: 'Past Tenses (Past Simple, Past Continuous, Past Perfect)' },
    { id: 'future-tense', title: 'Future Tenses', description: 'Understand will, going to, and future perfect', questions: 15, duration: 10, courseId: 'grammar-basics-future-tense', topic: 'Future Tenses (Will, Going to, Future Perfect)' },
    { id: 'conditionals', title: 'Conditionals', description: 'Practice if clauses and conditional sentences', questions: 15, duration: 10, courseId: 'grammar-basics-conditionals', topic: 'Conditionals (Zero, First, Second, Third Conditionals)' },
    { id: 'passive-voice', title: 'Passive Voice', description: 'Learn passive voice constructions', questions: 15, duration: 10, courseId: 'grammar-basics-passive-voice', topic: 'Passive Voice Constructions' },
    { id: 'modal-verbs', title: 'Modal Verbs', description: 'Master can, could, should, must, and more', questions: 15, duration: 10, courseId: 'grammar-basics-modal-verbs', topic: 'Modal Verbs (Can, Could, Should, Must, May, Might)' },
  ],
  'vocabulary': [
    { id: 'daily-life', title: 'Daily Life Vocabulary', description: 'Essential words for everyday situations', questions: 20, duration: 12, courseId: 'vocabulary-daily-life', topic: 'Daily Life Vocabulary and Common Expressions' },
    { id: 'business', title: 'Business Vocabulary', description: 'Professional terms and expressions', questions: 20, duration: 12, courseId: 'vocabulary-business', topic: 'Business English Vocabulary and Professional Terms' },
    { id: 'academic', title: 'Academic Vocabulary', description: 'Words for academic writing and reading', questions: 20, duration: 12, courseId: 'vocabulary-academic', topic: 'Academic Vocabulary for Writing and Reading' },
    { id: 'travel', title: 'Travel Vocabulary', description: 'Words for traveling and tourism', questions: 20, duration: 12, courseId: 'vocabulary-travel', topic: 'Travel and Tourism Vocabulary' },
    { id: 'food', title: 'Food & Cooking', description: 'Culinary terms and food-related words', questions: 20, duration: 12, courseId: 'vocabulary-food', topic: 'Food and Cooking Vocabulary' },
    { id: 'emotions', title: 'Emotions & Feelings', description: 'Express emotions and feelings accurately', questions: 20, duration: 12, courseId: 'vocabulary-emotions', topic: 'Emotions and Feelings Vocabulary' },
  ],
  'reading-comprehension': [
    { id: 'short-stories', title: 'Short Stories', description: 'Read and understand narrative texts', questions: 12, duration: 20, courseId: 'reading-comprehension-short-stories', topic: 'Short Stories and Narrative Texts' },
    { id: 'news-articles', title: 'News Articles', description: 'Comprehend current events and news', questions: 12, duration: 20, courseId: 'reading-comprehension-news-articles', topic: 'News Articles and Current Events' },
    { id: 'academic-texts', title: 'Academic Texts', description: 'Understand scholarly articles and papers', questions: 12, duration: 20, courseId: 'reading-comprehension-academic-texts', topic: 'Academic Texts and Scholarly Articles' },
    { id: 'opinion-pieces', title: 'Opinion Pieces', description: 'Analyze editorials and opinion articles', questions: 12, duration: 20, courseId: 'reading-comprehension-opinion-pieces', topic: 'Opinion Pieces and Editorials' },
    { id: 'literature', title: 'Literature', description: 'Explore literary works and excerpts', questions: 12, duration: 20, courseId: 'reading-comprehension-literature', topic: 'Literature and Literary Works' },
  ],
  'listening': [
    { id: 'conversations', title: 'Conversations', description: 'Understand everyday dialogues', questions: 15, duration: 18, courseId: 'listening-conversations', topic: 'Everyday Conversations and Dialogues' },
    { id: 'lectures', title: 'Lectures', description: 'Comprehend academic presentations', questions: 15, duration: 18, courseId: 'listening-lectures', topic: 'Academic Lectures and Presentations' },
    { id: 'interviews', title: 'Interviews', description: 'Follow interview discussions', questions: 15, duration: 18, courseId: 'listening-interviews', topic: 'Interviews and Discussions' },
    { id: 'podcasts', title: 'Podcasts', description: 'Listen to podcast episodes', questions: 15, duration: 18, courseId: 'listening-podcasts', topic: 'Podcasts and Audio Content' },
    { id: 'news-broadcasts', title: 'News Broadcasts', description: 'Understand news reports', questions: 15, duration: 18, courseId: 'listening-news-broadcasts', topic: 'News Broadcasts and Reports' },
  ],
  'advanced-grammar': [
    { id: 'complex-sentences', title: 'Complex Sentences', description: 'Master subordinate clauses and complex structures', questions: 20, duration: 25, courseId: 'advanced-grammar-complex-sentences', topic: 'Complex Sentences and Subordinate Clauses' },
    { id: 'subjunctive', title: 'Subjunctive Mood', description: 'Learn subjunctive forms and usage', questions: 20, duration: 25, courseId: 'advanced-grammar-subjunctive', topic: 'Subjunctive Mood and Forms' },
    { id: 'advanced-conditionals', title: 'Advanced Conditionals', description: 'Master mixed and advanced conditional forms', questions: 20, duration: 25, courseId: 'advanced-grammar-advanced-conditionals', topic: 'Advanced and Mixed Conditionals' },
    { id: 'inversion', title: 'Inversion', description: 'Understand inverted sentence structures', questions: 20, duration: 25, courseId: 'advanced-grammar-inversion', topic: 'Inversion and Inverted Sentence Structures' },
    { id: 'reported-speech', title: 'Reported Speech', description: 'Master indirect speech and reporting', questions: 20, duration: 25, courseId: 'advanced-grammar-reported-speech', topic: 'Reported Speech and Indirect Speech' },
    { id: 'participles', title: 'Participles & Gerunds', description: 'Learn advanced participle and gerund usage', questions: 20, duration: 25, courseId: 'advanced-grammar-participles', topic: 'Participles and Gerunds' },
  ],
  'ielts-simulation': [
    { id: 'ielts-test-1', title: 'IELTS Reading Test 1', description: 'Full IELTS Academic Reading simulation', questions: 40, duration: 60, courseId: 'ielts-simulation-test-1', topic: 'IELTS Academic Reading Test 1' },
    { id: 'ielts-test-2', title: 'IELTS Reading Test 2', description: 'Full IELTS Academic Reading simulation', questions: 40, duration: 60, courseId: 'ielts-simulation-test-2', topic: 'IELTS Academic Reading Test 2' },
    { id: 'ielts-test-3', title: 'IELTS Reading Test 3', description: 'Full IELTS Academic Reading simulation', questions: 40, duration: 60, courseId: 'ielts-simulation-test-3', topic: 'IELTS Academic Reading Test 3' },
    { id: 'ielts-test-4', title: 'IELTS Reading Test 4', description: 'Full IELTS Academic Reading simulation', questions: 40, duration: 60, courseId: 'ielts-simulation-test-4', topic: 'IELTS Academic Reading Test 4' },
  ],
};


interface QuizSectionProps {
  onCourseSelect?: (courseId: string) => void;
  cefrLevel?: CEFRLevel | null;
  onViewAllQuizzes?: () => void;
  initialQuizActivityId?: string | null;
  onQuizClick?: (quizId: string) => void;
}

export function QuizSection({ onCourseSelect, cefrLevel = null, onViewAllQuizzes, initialQuizActivityId, onQuizClick }: QuizSectionProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [quizStats, setQuizStats] = useState(getQuizStats());
  const [recentQuizzes, setRecentQuizzes] = useState(getRecentQuizzes(3));
  const [courseStats, setCourseStats] = useState(getQuizStatsByCourse());
  const [quizTips, setQuizTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);

  // Calculate additional quiz statistics
  const getAdditionalQuizStats = () => {
    const activities = getActivities();
    const quizActivities = activities.filter(a => a.type === 'quiz');
    
    // Calculate this week's highest score and which quiz it came from
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const thisWeekQuizzes = quizActivities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate >= weekAgo;
    });
    
    let thisWeekHighest = 0;
    let bestQuizTitle = '';
    if (thisWeekQuizzes.length > 0) {
      const bestQuiz = thisWeekQuizzes.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      thisWeekHighest = bestQuiz.score;
      bestQuizTitle = bestQuiz.courseTitle || bestQuiz.courseId || 'Quiz';
    }
    
    // Calculate today's average score
    const todayQuizzes = quizActivities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
    
    const todayAvg = todayQuizzes.length > 0
      ? Math.round(todayQuizzes.reduce((sum, a) => sum + a.score, 0) / todayQuizzes.length)
      : 0;
    
    return { thisWeekHighest, bestQuizTitle, todayAvg };
  };

  const handleStartQuiz = (courseId: string) => {
    if (onCourseSelect) {
      onCourseSelect(courseId);
    } else {
      // Fallback: navigate to quiz directly if no handler provided
      window.location.href = `#quiz-${courseId}`;
    }
  };

  const [additionalStats, setAdditionalStats] = useState(getAdditionalQuizStats());

  useEffect(() => {
    const updateStats = () => {
      setQuizStats(getQuizStats());
      setRecentQuizzes(getRecentQuizzes(3));
      setCourseStats(getQuizStatsByCourse());
      setAdditionalStats(getAdditionalQuizStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    window.addEventListener('storage', updateStats);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  // Eğer dashboard'dan belirli bir quiz aktivitesi seçildiyse, Quiz History ekranına yönlendir
  useEffect(() => {
    if (!initialQuizActivityId || !onViewAllQuizzes) return;
    // Şu an için sadece Quiz History ekranına geçiyoruz; kartlar orada zaten tüm detayları gösteriyor
    onViewAllQuizzes();
  }, [initialQuizActivityId, onViewAllQuizzes]);

  useEffect(() => {
    const loadTips = async () => {
      setLoadingTips(true);
      try {
        const stats = getUserStats();
        const qStats = getQuizStats();
        const byCourse = getQuizStatsByCourse();
        const courseSummary = Object.entries(byCourse)
          .map(([id, s]) => `${id.replace(/-/g, ' ')}: ${s.attempts} attempt(s), best ${s.bestScore}%`)
          .join('; ');
        const tips = await generatePersonalizedTips('quiz', {
          averageScore: stats.averageScore,
          totalActivities: stats.totalActivities,
          cefrLevel: cefrLevel ?? undefined,
          totalQuizzes: qStats.totalQuizzes,
          quizAvgScore: qStats.avgScore,
          quizBestScore: qStats.bestScore,
          quizPerfectScores: qStats.perfectScores,
          courseSummary: courseSummary || undefined,
        });
        setQuizTips(tips);
      } catch (error) {
        console.error('Error loading tips:', error);
        setQuizTips([
          'Read questions carefully',
          'Manage your time wisely',
          'Review incorrect answers',
          'Practice regularly'
        ]);
      } finally {
        setLoadingTips(false);
      }
    };

    loadTips();
  }, [cefrLevel]);

  const formatActivityDate = (dateString: string): string => {
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
      return `${daysDiff} days ago`;
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Interactive Quizzes</h1>
      </motion.div>

      {/* Stats - Quiz-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Brain className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{quizStats.totalQuizzes}</div>
          <div className="text-blue-100 text-xs">Quizzes Taken</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="w-5 h-5" />
            </div>
            <Award className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{quizStats.avgScore}%</div>
          <div className="text-green-100 text-xs">Quiz Average</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <Zap className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{additionalStats.thisWeekHighest}%</div>
          <div className="text-purple-100 text-xs mb-1">This Week's Best</div>
          {additionalStats.bestQuizTitle && (
            <div className="text-xs text-purple-200 font-semibold truncate" title={additionalStats.bestQuizTitle}>
              {additionalStats.bestQuizTitle}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="w-5 h-5" />
            </div>
            <Calendar className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{additionalStats.todayAvg}%</div>
          <div className="text-orange-100 text-xs mb-1">Today Average Score</div>
          <div className="text-xs text-orange-200 font-semibold">Today's performance</div>
        </motion.div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quiz Categories</h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quiz Categories */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {selectedCategory === null ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizCategories.map((category, index) => {
                  // Use user's CEFR level instead of difficulty if available
                  const displayLevel = cefrLevel || category.difficulty;
                  const getLevelColor = (level: string) => {
                    if (level === 'A1' || level === 'A2') return 'bg-green-100 text-green-700';
                    if (level === 'B1' || level === 'B2') return 'bg-yellow-100 text-yellow-700';
                    if (level === 'C1' || level === 'C2') return 'bg-red-100 text-red-700';
                    // Fallback for Beginner/Intermediate/Advanced
                    if (level === 'Beginner') return 'bg-green-100 text-green-700';
                    if (level === 'Intermediate') return 'bg-yellow-100 text-yellow-700';
                    return 'bg-red-100 text-red-700';
                  };
                  
                  return (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => setSelectedCategory(category.id)}
                      className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:shadow-xl transition-all cursor-pointer flex flex-col h-full"
                      style={{ minHeight: '260px' }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${category.color} rounded-xl`}>
                          <category.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getLevelColor(displayLevel)}`}>
                          {displayLevel}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{category.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">{category.description}</p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(category.id);
                          }}
                          className={`w-full bg-gradient-to-r ${category.color} text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-auto`}
                        >
                          <ChevronRight className="w-4 h-4" />
                          View Quizzes
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div>
                {(() => {
                  const category = quizCategories.find(c => c.id === selectedCategory);
                  if (!category) return null;
                  
                  const categorySubQuizzes = subQuizzes[category.courseId] || [];
                  const displayLevel = cefrLevel || category.difficulty;
                  const getLevelColor = (level: string) => {
                    if (level === 'A1' || level === 'A2') return 'bg-green-100 text-green-700';
                    if (level === 'B1' || level === 'B2') return 'bg-yellow-100 text-yellow-700';
                    if (level === 'C1' || level === 'C2') return 'bg-red-100 text-red-700';
                    if (level === 'Beginner') return 'bg-green-100 text-green-700';
                    if (level === 'Intermediate') return 'bg-yellow-100 text-yellow-700';
                    return 'bg-red-100 text-red-700';
                  };

                  return (
                    <div>
                      {/* Back button and header */}
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                          <p className="text-gray-600">{category.description}</p>
                        </div>
                      </div>

                      {/* Sub-quizzes grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {categorySubQuizzes.map((subQuiz, index) => {
                          const courseStats = getQuizStatsByCourse();
                          const stats = courseStats[subQuiz.courseId] || { attempts: 0, bestScore: 0 };
                          
                          return (
                            <motion.div
                              key={subQuiz.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.05 * index }}
                              className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:shadow-xl transition-all flex flex-col"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 bg-gradient-to-br ${category.color} rounded-xl`}>
                                  <category.icon className="w-6 h-6 text-white" />
                                </div>
                                {stats.attempts > 0 && (
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(displayLevel)}`}>
                                    Best: {stats.bestScore}%
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-bold text-gray-900 mb-2">{subQuiz.title}</h3>
                              <p className="text-sm text-gray-600 mb-4">{subQuiz.description}</p>

                              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <div className="text-xs text-gray-500">Questions</div>
                                  <div className="font-bold text-gray-900">{subQuiz.questions}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <div className="text-xs text-gray-500">Duration</div>
                                  <div className="font-bold text-gray-900">{subQuiz.duration} min</div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleStartQuiz(subQuiz.courseId)}
                                className={`w-full bg-gradient-to-r ${category.color} text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-auto`}
                              >
                                <Play className="w-4 h-4" />
                                Start Quiz
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Quizzes - Aligned with Reading Comprehension (first row, third column) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all lg:mt-[calc(1rem+260px)] max-lg:mt-0"
            style={{ minHeight: '260px' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Recent Quizzes</h3>
              {recentQuizzes.length > 0 && onViewAllQuizzes && (
                <button
                  onClick={onViewAllQuizzes}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              {recentQuizzes.length > 0 ? (
                recentQuizzes.map((quiz, index) => {
                  const colors = [
                    'bg-blue-100/80 border-blue-200/50 hover:bg-blue-100',
                    'bg-green-100/80 border-green-200/50 hover:bg-green-100',
                    'bg-purple-100/80 border-purple-200/50 hover:bg-purple-100',
                    'bg-pink-100/80 border-pink-200/50 hover:bg-pink-100',
                    'bg-orange-100/80 border-orange-200/50 hover:bg-orange-100',
                    'bg-indigo-100/80 border-indigo-200/50 hover:bg-indigo-100',
                  ];
                  const colorClass = colors[index % colors.length];
                  
                  return (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => {
                        if (onQuizClick) {
                          onQuizClick(quiz.id);
                        } else if (onViewAllQuizzes) {
                          onViewAllQuizzes();
                        }
                      }}
                      className={`w-full text-left p-3 ${colorClass} rounded-xl transition-all cursor-pointer border hover:shadow-md`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm text-gray-900 truncate pr-2">{quiz.title}</div>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          quiz.score >= 80 ? 'bg-green-200 text-green-800' :
                          quiz.score >= 60 ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {quiz.score}%
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTime(quiz.date)}</span>
                        </div>
                        <span className="text-gray-600">{formatActivityDate(quiz.date)}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No quizzes yet.</p>
                  <p className="mt-1">Start your first quiz!</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
