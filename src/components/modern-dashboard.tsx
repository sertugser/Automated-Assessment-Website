import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Target, Sparkles, ChevronRight,
  BarChart3, Flame, Star, Trophy, BookOpen, Lightbulb, AlertCircle,
  Clock, Edit, Mic
} from 'lucide-react';
import { getUserStats, getMistakeCountsByTopic, getRecentActivities } from '../lib/user-progress';
import type { UserActivity } from '../lib/user-progress';
import type { CEFRLevel } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';
import type { LearningDifficultyAnalysis } from '../lib/ai-services';

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
}

export function ModernDashboard({ userName = 'Student', cefrLevel, recommendations, onOpenActivity, onRetakeTest, learningDifficulty, loadingDifficulty }: ModernDashboardProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(getUserStats());
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>(() => getRecentActivities(10));

  // Update stats and recent activities when component mounts or when activities change
  useEffect(() => {
    const update = () => {
      setStats(getUserStats());
      setRecentActivities(getRecentActivities(10));
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
          role={onRetakeTest ? 'button' : undefined}
          tabIndex={onRetakeTest ? 0 : undefined}
          onClick={onRetakeTest}
          onKeyDown={onRetakeTest ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRetakeTest(); } } : undefined}
          className={`bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full ${onRetakeTest ? 'cursor-pointer hover:from-indigo-600 hover:to-indigo-700 transition-colors' : ''}`}
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
            {onRetakeTest && cefrLevel && (
              <span className="block mt-1 text-sm font-semibold text-white underline decoration-white/80 underline-offset-1">{t('dashboard.clickToRetake')}</span>
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

      {/* Detected topic & AI advice + Sık yapılan hatalar – eşit boyut, hata sayısı (yüzde yok) */}
      {(() => {
        const mistakeCounts = getMistakeCountsByTopic();
        const hasMistakes = mistakeCounts.length > 0;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Detected topic & AI advice */}
            <div className="min-w-0 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                {t('dashboard.learningDifficultyTitle')}
              </h2>
              {loadingDifficulty ? (
                <div className="bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl border border-violet-200 p-4 flex items-center gap-2 text-violet-700 text-sm shadow-lg h-full min-h-[140px]">
                  <div className="h-5 w-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin shrink-0" />
                  <span>{t('dashboard.loadingDifficulty')}</span>
                </div>
              ) : learningDifficulty ? (
                <div className="bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl border border-violet-200 shadow-lg overflow-hidden h-full min-h-[140px] flex flex-col">
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        {t('dashboard.detectedTopicLabel')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {learningDifficulty.topic?.trim() ? learningDifficulty.topic : t('dashboard.noTopic')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 pt-3 border-t border-violet-200/60 flex-1 min-h-0">
                      <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                        {t('dashboard.aiAdviceLabel')}
                      </span>
                      <div className="flex-1 overflow-y-auto pr-1">
                        <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                          {learningDifficulty.advice.split(/\.(?=\s|$)/).filter(s => s.trim()).map((sentence, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-violet-500 mt-1.5 shrink-0">•</span>
                              <span className="flex-1">{sentence.trim()}{sentence.trim() && !sentence.trim().endsWith('.') ? '.' : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl border border-violet-200 p-4 text-center text-violet-600 text-sm shadow-lg h-full min-h-[140px] flex items-center justify-center">
                  {t('dashboard.noDifficultyData')}
                </div>
              )}
            </div>

            {/* Sık yapılan hatalar – neyden kaç kez hata (yüzde yok) */}
            <div className="min-w-0 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                {t('dashboard.commonMistakes')}
              </h2>
              {hasMistakes ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl border border-amber-200 shadow-lg overflow-hidden h-full min-h-[140px] flex flex-col">
                  <ul className="p-4 space-y-2 list-disc list-inside text-sm text-gray-800 flex-1">
                    {mistakeCounts.slice(0, 8).map((m, i) => (
                      <li key={`mistake-${i}`}>
                        <span className="font-medium">{m.topic}</span>
                        <span className="text-gray-600"> — {m.mistakeCount} {t('dashboard.mistakesSuffix')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl border border-amber-200 p-4 text-center text-amber-700 text-sm shadow-lg h-full min-h-[140px] flex items-center justify-center">
                  {t('dashboard.noCommonMistakesData')}
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

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
          <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 shadow-lg overflow-hidden">
            <ul className="divide-y divide-indigo-200/60">
              {recentActivities.map((a) => {
                const Icon = a.type === 'quiz' ? BookOpen : a.type === 'writing' ? Edit : Mic;
                const title = a.courseTitle || (a.type === 'quiz' ? 'Quiz' : a.type === 'writing' ? 'Writing' : 'Speaking');
                const dateStr = formatActivityDate(a.date, t);
                const isClickable = !!onOpenActivity && (a.type === 'quiz' || a.type === 'writing' || a.type === 'speaking');
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => isClickable && onOpenActivity(a.id, a.type as 'quiz' | 'writing' | 'speaking')}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${isClickable ? 'hover:bg-indigo-100/60 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                        <p className="text-xs text-gray-500">{dateStr}</p>
                      </div>
                      <span className="text-sm font-semibold text-indigo-600 shrink-0">{a.score}%</span>
                      {isClickable && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
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