import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Clock, Award, Target, Brain, Sparkles, ChevronRight, Calendar,
  BarChart3, Flame, Star, Trophy, Lightbulb, AlertCircle, ArrowRight
} from 'lucide-react';
import { getUserStats, getRecentActivities, type UserActivity } from '../lib/user-progress';
import type { CEFRLevel } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
  color: string;
}

interface ModernDashboardProps {
  userName?: string;
  cefrLevel?: CEFRLevel | null;
  onRetakePlacement?: () => void;
  recommendations?: Recommendation[];
}

export function ModernDashboard({ userName = 'Student', cefrLevel, onRetakePlacement, recommendations }: ModernDashboardProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(getUserStats());
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);

  // Update stats when component mounts or when activities change
  useEffect(() => {
    const updateStats = () => {
      setStats(getUserStats());
      setRecentActivity(getRecentActivities(3));
    };

    updateStats();
    
    // Listen for storage changes (when new activities are added)
    const handleStorageChange = () => {
      updateStats();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (in case of same-tab updates)
    const interval = setInterval(updateStats, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Format date for display
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

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'quiz':
        return 'text-blue-600';
      case 'writing':
        return 'text-green-600';
      case 'speaking':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {t('dashboard.welcome')}, {userName}!
        </h1>
      </motion.div>

      {/* Stats Cards - Dashboard overview (general stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Target className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{cefrLevel ?? '—'}</div>
          <div className="text-indigo-100 text-xs">
            {cefrLevel ? t('dashboard.cefrLevel') : t('dashboard.takePlacementTest')}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Flame className="w-5 h-5" />
            </div>
            <Sparkles className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{stats.streak} {stats.streak === 1 ? t('dashboard.day') : t('dashboard.days')}</div>
          <div className="text-orange-100 text-xs">{t('dashboard.currentStreak')}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Award className="w-5 h-5" />
            </div>
            <Star className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{stats.totalPoints.toLocaleString()}</div>
          <div className="text-green-100 text-xs">{t('dashboard.totalPoints')}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <Trophy className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{stats.averageScore}%</div>
          <div className="text-purple-100 text-xs">{t('dashboard.avgScore')}</div>
        </motion.div>
      </div>

      {/* Placement / CEFR Banner */}
      {onRetakePlacement && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={onRetakePlacement}
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-8 cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">
                  {cefrLevel ? t('dashboard.retakePlacement') : t('dashboard.discoverLevel')}
                </h3>
                <p className="text-indigo-100">
                  {cefrLevel ? t('dashboard.placementDesc') : t('dashboard.placementDescNew')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold group-hover:bg-white/30 transition-all">
              <span>{cefrLevel ? t('dashboard.retakeTest') : t('dashboard.startTest')}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Personalized Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {/* Recommendations - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-200 rounded-lg">
                <Lightbulb className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t('dashboard.personalizedRecs')}</h3>
                <p className="text-xs text-gray-600">{t('dashboard.basedOnPerformance')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-3">
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + index * 0.05 }}
                  className="bg-white rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group border border-transparent hover:border-indigo-200"
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className={`p-2 bg-gradient-to-br ${rec.color} rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <rec.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{rec.title}</h4>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.priority === 'high' ? t('dashboard.highPriority') : rec.priority === 'medium' ? t('dashboard.recommended') : t('dashboard.optional')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2.5 line-clamp-2">{rec.description}</p>
                  <button className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-1.5 group-hover:gap-2">
                    {rec.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))
              ) : (
                <div className="col-span-2 text-center py-4 text-gray-500 text-sm">
                  {t('dashboard.loadingRecs')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-100 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <p>{t('dashboard.proTip')}</p>
            </div>
          </motion.div>

          {/* Recent Activity - Takes 1 column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl p-5 border border-gray-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('dashboard.recentActivity')}</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className={`font-semibold ${getActivityColor(activity.type)} text-sm capitalize`}>
                        {activity.courseTitle || activity.type}
                      </div>
                      <div className="text-xs text-gray-500">{formatActivityDate(activity.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{activity.score}%</div>
                      <div className="text-xs text-gray-500">{t('dashboard.score')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {t('dashboard.noActivities')}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}