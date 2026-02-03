import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Target, Sparkles, ChevronRight,
  BarChart3, Flame, Star, Trophy, BookOpen, AlertCircle,
  Clock, Edit, Mic
} from 'lucide-react';
import { getUserStats, getRecentActivities, getMistakeSummaryCounts } from '../lib/user-progress';
import type { UserActivity } from '../lib/user-progress';
import type { CEFRLevel } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';
import type { LearningDifficultyAnalysis, CommonMistakeAnalysis } from '../lib/ai-services';

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
  recommendations?: Recommendation[];
  onOpenActivity?: (activityId: string, type: 'speaking' | 'writing' | 'quiz') => void;
  onRetakeTest?: () => void;
  learningDifficulty?: LearningDifficultyAnalysis | null;
  loadingDifficulty?: boolean;
  commonMistakes?: CommonMistakeAnalysis[];
  loadingCommonMistakes?: boolean;
}

export function ModernDashboard({ userName = 'Student', cefrLevel, recommendations, onOpenActivity, onRetakeTest, learningDifficulty, loadingDifficulty, commonMistakes = [], loadingCommonMistakes = false }: ModernDashboardProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(getUserStats());
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>(() => getRecentActivities(10));
  const [mistakeSummary, setMistakeSummary] = useState(() => getMistakeSummaryCounts());

  // Fixed categories like reference: Wrong Answer, Grammar, Spelling, Pronunciation (ordered by count desc for ranking)
  const frequentMistakeRows = (() => {
    const raw = [
      { key: 'wrong' as const, labelKey: 'dashboard.wrongAnswer', count: mistakeSummary.wrongAnswers },
      { key: 'grammar' as const, labelKey: 'dashboard.grammar', count: mistakeSummary.grammar },
      { key: 'vocabulary' as const, labelKey: 'dashboard.vocabulary', count: mistakeSummary.vocabulary },
      { key: 'pronunciation' as const, labelKey: 'dashboard.pronunciation', count: mistakeSummary.pronunciation },
    ];
    const sorted = [...raw].sort((a, b) => b.count - a.count);
    return sorted.map((r, rank) => ({ ...r, rank: rank + 1, label: t(r.labelKey) }));
  })();

  // Update stats, recent activities, and mistake summary when component mounts or when activities change
  useEffect(() => {
    const update = () => {
      setStats(getUserStats());
      setRecentActivities(getRecentActivities(10));
      setMistakeSummary(getMistakeSummaryCounts());
    };

    update();
    window.addEventListener('storage', update);
    const interval = setInterval(update, 2000);
    return () => {
      window.removeEventListener('storage', update);
      clearInterval(interval);
    };
  }, []);

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
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full relative"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Target className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{cefrLevel ?? '—'}</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-indigo-100 text-xs">
              {cefrLevel ? t('dashboard.cefrLevel') : t('dashboard.takePlacementTest')}
            </div>
            {onRetakeTest && cefrLevel && (
              <button
                onClick={onRetakeTest}
                className="bg-white text-indigo-600 px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-2xl hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 border-2 border-indigo-200 hover:border-indigo-500 hover:font-bold"
              >
                <Target className="w-3.5 h-3.5" />
                {t('dashboard.clickToRetake')}
              </button>
            )}
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

      {/* Detected mistakes & AI advice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Common mistakes - AI analyzed */}
        <div className="w-full max-w-3xl">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            {t('dashboard.commonMistakes')}
          </h2>
          {loadingCommonMistakes ? (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200 p-4 flex items-center gap-2 text-red-700 text-sm shadow-lg h-full min-h-[140px]">
              <div className="h-5 w-5 rounded-full border-2 border-red-400 border-t-transparent animate-spin shrink-0" />
              <span>{t('dashboard.loadingDifficulty')}</span>
            </div>
          ) : commonMistakes && commonMistakes.length > 0 ? (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200 shadow-lg overflow-hidden h-full min-h-[140px] flex flex-col">
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {commonMistakes.slice(0, 6).map((mistake, i) => (
                  <div key={`mistake-${i}`} className="border-b border-red-200/60 last:border-b-0 pb-3 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{mistake.category}</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1.5">{mistake.description}</p>
                    <p className="text-xs text-red-800 font-medium italic">{mistake.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200 p-4 text-center text-red-700 text-sm shadow-lg h-full min-h-[140px] flex items-center justify-center">
              {t('dashboard.noCommonMistakesData')}
            </div>
          )}
        </div>

        {/* Frequent mistakes – same layout as Recent Activity, pink */}
        <div className="w-full max-w-3xl md:ml-auto md:justify-self-end h-full flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            {t('dashboard.frequentMistakes')}
          </h2>
          {loadingCommonMistakes ? (
            <div className="bg-gradient-to-br from-pink-100 to-rose-200 rounded-xl border-2 border-pink-300 p-4 flex items-center gap-2 text-rose-800 text-sm shadow-lg h-full min-h-[140px]">
              <div className="h-5 w-5 rounded-full border-2 border-pink-500 border-t-transparent animate-spin shrink-0" />
              <span>{t('dashboard.loadingDifficulty')}</span>
            </div>
          ) : frequentMistakeRows.some(r => r.count > 0) ? (
            <div className="bg-gradient-to-br from-pink-100 to-rose-200 rounded-xl border-2 border-pink-300 shadow-lg">
              <ul className="divide-y divide-pink-300/80">
                {frequentMistakeRows.map((row) => (
                  <li key={row.key} className="flex items-center gap-4 px-4 py-3 text-left rounded-lg border-2 border-transparent">
                    <div className="p-2 rounded-lg shrink-0 bg-pink-200/90 text-rose-900">
                      <span className="text-sm font-bold tabular-nums">{row.rank}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{row.label}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0 text-rose-900">
                      {row.count} {t('dashboard.timesSuffix')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-pink-100 to-rose-200 rounded-xl border-2 border-pink-300 p-6 text-center text-rose-800 text-sm shadow-lg h-full min-h-[140px] flex items-center justify-center">
              {t('dashboard.noCommonMistakesData')}
            </div>
          )}
        </div>
      </motion.div>

      {/* Recent activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mb-8"
      >
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          {t('dashboard.recentActivity')}
        </h2>
        {recentActivities.length === 0 ? (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-6 text-center text-indigo-600 text-sm">
            {t('dashboard.noActivities')}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 shadow-lg">
            <ul className="divide-y divide-indigo-200/60">
              {recentActivities.map((a) => {
                const Icon = a.type === 'quiz' ? BookOpen : a.type === 'writing' ? Edit : Mic;
                const title = a.courseTitle || (a.type === 'quiz' ? 'Quiz' : a.type === 'writing' ? 'Writing' : 'Speaking');
                const dateStr = formatActivityDate(a.date, t);
                const isClickable = !!onOpenActivity && (a.type === 'quiz' || a.type === 'writing' || a.type === 'speaking');
                return (
                  <li key={a.id} className="group">
                    <button
                      type="button"
                      onClick={() => isClickable && onOpenActivity(a.id, a.type as 'quiz' | 'writing' | 'speaking')}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-all duration-200 rounded-lg border-2 border-transparent ${isClickable ? 'hover:bg-indigo-100 hover:shadow-md cursor-pointer hover:border-indigo-600' : 'cursor-default'}`}
                      style={{ boxSizing: 'border-box' }}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition-all duration-200 ${isClickable ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-110' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors duration-200 ${isClickable ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-900'}`}>{title}</p>
                        <p className="text-xs text-gray-500">{dateStr}</p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 transition-colors duration-200 ${isClickable ? 'text-indigo-600 group-hover:text-indigo-700' : 'text-indigo-600'}`}>{a.score}%</span>
                      {isClickable && <ChevronRight className="w-4 h-4 shrink-0 transition-all duration-200 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </motion.div>

    </div>
  );
}

function formatActivityDate(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (dDate.getTime() === yesterday.getTime()) return t('dashboard.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
