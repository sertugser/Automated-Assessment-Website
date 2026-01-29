import { motion } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Calendar, Award, Target, BarChart3, Clock, 
  CheckCircle, Star, Flame, Brain, Sparkles, Info
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  getUserStats, 
  getWeeklyProgressData, 
  getMonthlyData, 
  getSkillsBreakdown,
  getActivityTypeDistribution,
  getActivities 
} from '../lib/user-progress';
import { generateProgressInsights } from '../lib/ai-services';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrentUser } from '../lib/auth';

// Heatmap component
function ActivityHeatmap({ activities }: { activities: Array<{ date: string }> }) {
  const today = new Date();
  const days: Date[] = [];
  
  // Generate last 140 days (20 weeks) - fill the right side
  for (let i = 139; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  const getActivityCount = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    return activities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.toISOString().split('T')[0] === dateStr;
    }).length;
  };

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    if (count >= 3) return 'bg-green-600';
    return 'bg-gray-100';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 pt-6">
          {weekDays.map(day => (
            <div key={day} className="h-10 flex items-center text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => {
                const count = getActivityCount(day);
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`w-10 h-10 rounded ${getIntensity(count)} ${
                      isToday ? 'ring-2 ring-indigo-500' : ''
                    } transition-all hover:scale-110 cursor-pointer`}
                    title={`${day.toLocaleDateString()}: ${count} activity${count !== 1 ? 'ies' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-gray-100" />
          <div className="w-3 h-3 rounded bg-green-200" />
          <div className="w-3 h-3 rounded bg-green-400" />
          <div className="w-3 h-3 rounded bg-green-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export function ProgressSection() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(getUserStats());
  const [weeklyProgressData, setWeeklyProgressData] = useState(getWeeklyProgressData());
  const [monthlyData, setMonthlyData] = useState(getMonthlyData());
  const [skillsData, setSkillsData] = useState(getSkillsBreakdown());
  const [activityTypeData, setActivityTypeData] = useState(getActivityTypeDistribution());
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Weekly goal (50 lessons per week)
  const WEEKLY_GOAL = 50;

  useEffect(() => {
    const updateStats = () => {
      setStats(getUserStats());
      setWeeklyProgressData(getWeeklyProgressData());
      setMonthlyData(getMonthlyData());
      setSkillsData(getSkillsBreakdown());
      setActivityTypeData(getActivityTypeDistribution());
    };

    updateStats();
    
    // Update periodically
    const interval = setInterval(updateStats, 2000);
    
    // Listen for storage changes
    window.addEventListener('storage', updateStats);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  // Load AI insights:
  // - İlk yüklemede mutlaka göster
  // - Yeni aktivite yapıldığında (stats.totalActivities artarsa)
  // - Veya kullanıcı en az 3 gündür sistemde aktivite yapmadıysa
  useEffect(() => {
    const shouldGenerateInsight = () => {
      try {
        const raw = localStorage.getItem('assessai_last_insight_meta');
        const now = new Date();
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

        let lastActivities = 0;
        let lastGeneratedAt: Date | null = null;

        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.lastActivities === 'number') {
            lastActivities = parsed.lastActivities;
          }
          if (parsed.generatedAt) {
            lastGeneratedAt = new Date(parsed.generatedAt);
          }
        }

        const hasNewActivity = stats.totalActivities > lastActivities;

        // Uzun süre kullanılmadıysa (3+ gün) tetikle
        let inactiveForThreeDays = false;
        if (stats.lastActivityDate) {
          const lastActivity = new Date(stats.lastActivityDate);
          const sinceLastActivity = now.getTime() - lastActivity.getTime();
          const sinceLastInsight = lastGeneratedAt
            ? now.getTime() - lastGeneratedAt.getTime()
            : THREE_DAYS_MS + 1;

          inactiveForThreeDays =
            sinceLastActivity >= THREE_DAYS_MS && sinceLastInsight >= THREE_DAYS_MS;
        } else if (lastGeneratedAt) {
          const sinceLastInsight = now.getTime() - lastGeneratedAt.getTime();
          inactiveForThreeDays = sinceLastInsight >= THREE_DAYS_MS;
        } else {
          // Hiç insight üretilmediyse ilk açılışta üret
          inactiveForThreeDays = true;
        }

        return hasNewActivity || inactiveForThreeDays;
      } catch {
        return true;
      }
    };

    const loadInsights = async () => {
      setLoadingInsight(true);
      try {
        const activities = getActivities();
        const thisWeekActivities = activities.filter(a => {
          const activityDate = new Date(a.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return activityDate >= weekAgo;
        });
        const lastWeekActivities = activities.filter(a => {
          const activityDate = new Date(a.date);
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return activityDate >= twoWeeksAgo && activityDate < weekAgo;
        });
        const user = getCurrentUser();
        const insightText = await generateProgressInsights(
          {
            totalActivities: stats.totalActivities,
            averageScore: stats.averageScore,
            streak: stats.streak,
          },
          skillsData,
          thisWeekActivities.length,
          lastWeekActivities.length,
          user?.cefrLevel || null
        );
        setInsight(insightText);
        hasLoadedOnceRef.current = true;

        // Son insight meta bilgisini kaydet
        try {
          localStorage.setItem(
            'assessai_last_insight_meta',
            JSON.stringify({
              lastActivities: stats.totalActivities,
              generatedAt: new Date().toISOString(),
            })
          );
        } catch {
          // ignore
        }
      } catch (error) {
        console.error('Error loading insights:', error);
        setInsight('Harika ilerleme! Devam etmek için farklı aktivite türlerini deneyebilirsin.');
        hasLoadedOnceRef.current = true;
      } finally {
        setLoadingInsight(false);
      }
    };

    // İlk yüklemede mutlaka yükle, sonra sadece koşul sağlandığında yükle
    if (!hasLoadedOnceRef.current || shouldGenerateInsight()) {
      loadInsights();
    } else {
      // Eğer koşul sağlanmıyorsa ama insight varsa, loading'i kapat
      setLoadingInsight(false);
    }
  }, [stats.totalActivities, stats.lastActivityDate, skillsData]); // Sadece önemli metrikler değiştiğinde değerlendir

  const activities = getActivities();
  const thisWeekActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate >= weekAgo;
  });

  const lastWeekActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate >= twoWeeksAgo && activityDate < weekAgo;
  });

  const lessonsCompleted = activities.length;
  const lessonsThisWeek = thisWeekActivities.length;
  const lessonsLastWeek = lastWeekActivities.length;
  const lessonsChange = lessonsLastWeek > 0 
    ? lessonsThisWeek - lessonsLastWeek 
    : lessonsThisWeek;

  // Estimate study time (15 minutes per activity)
  const totalStudyHours = Math.round((activities.length * 15) / 60);
  const studyTimeThisWeek = Math.round((lessonsThisWeek * 15) / 60);

  // Calculate improvement (compare this week vs last week average)
  const thisWeekAvg = thisWeekActivities.length > 0
    ? Math.round(thisWeekActivities.reduce((sum, a) => sum + a.score, 0) / thisWeekActivities.length)
    : 0;
  const lastWeekAvg = lastWeekActivities.length > 0
    ? Math.round(lastWeekActivities.reduce((sum, a) => sum + a.score, 0) / lastWeekActivities.length)
    : 0;
  const improvement = lastWeekAvg > 0 ? thisWeekAvg - lastWeekAvg : 0;

  // Prepare weekly data with last week comparison
  const getLastWeekData = () => {
    const activities = getActivities();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastWeekData = [];
    for (let i = 13; i >= 7; i--) { // Last week: 7-13 days ago
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayActivities = activities.filter(a => {
        const activityDate = new Date(a.date);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate.getTime() === date.getTime();
      });
      
      const lessonsCompleted = dayActivities.length;
      const averageScore = dayActivities.length > 0
        ? Math.round(dayActivities.reduce((sum, a) => sum + a.score, 0) / dayActivities.length)
        : 0;
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = dayNames[date.getDay()];
      
      lastWeekData.push({
        day: dayName,
        lessonsCompleted,
        averageScore,
      });
    }
    return lastWeekData;
  };

  const lastWeekData = getLastWeekData();
  const weeklyDataWithComparison = weeklyProgressData.map((day, index) => ({
    ...day,
    lastWeekLessons: lastWeekData[index]?.lessonsCompleted || 0,
    lastWeekScore: lastWeekData[index]?.averageScore || 0,
  }));

  // Card hover messages
  const cardHoverMessages: Record<string, string> = {
    lessons: `Toplam ${lessonsCompleted} aktivite tamamladın. Bu hafta ${lessonsThisWeek} aktivite yaptın.`,
    time: `Toplam ${totalStudyHours} saat çalışma süren var. Bu hafta ${studyTimeThisWeek} saat çalıştın.`,
    improvement: `Geçen haftaya göre ${improvement > 0 ? '+' : ''}${improvement}% iyileşme gösterdin.`,
    skills: `Tüm becerilerin ortalaması ${Math.round(skillsData.reduce((sum, s) => sum + s.value, 0) / skillsData.length)}%.`,
  };

  // Weekly goal progress
  const weeklyGoalProgress = Math.min(100, Math.round((lessonsThisWeek / WEEKLY_GOAL) * 100));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('progress.title')}</h1>
      </motion.div>

      {/* Smart Insights Panel - Moved to top */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">Smart Insights</h3>
            </div>
            {loadingInsight ? (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span>Analyzing your progress...</span>
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">{insight}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Overview Cards - Progress-specific metrics with Goal Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg h-full relative group"
          onMouseEnter={() => setHoveredCard('lessons')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{lessonsCompleted}</div>
          <div className="text-blue-100 text-xs mb-1">{t('progress.lessonsCompleted')}</div>
          <div className="text-xs text-blue-200 font-semibold mb-2">
            {lessonsChange > 0 ? '+' : ''}{lessonsChange} {t('progress.thisWeek')}
          </div>
          {/* Goal Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-blue-200">Weekly Goal</span>
              <span className="text-blue-100 font-semibold">{lessonsThisWeek} / {WEEKLY_GOAL}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weeklyGoalProgress}%` }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-full h-2"
              />
            </div>
          </div>
          {/* Hover Tooltip */}
          {hoveredCard === 'lessons' && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
              {cardHoverMessages.lessons}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg h-full relative group"
          onMouseEnter={() => setHoveredCard('time')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
            <BarChart3 className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{totalStudyHours}h</div>
          <div className="text-purple-100 text-xs mb-1">{t('progress.totalStudyTime')}</div>
          <div className="text-xs text-purple-200 font-semibold">{studyTimeThisWeek}h {t('progress.thisWeek')}</div>
          {/* Hover Tooltip */}
          {hoveredCard === 'time' && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
              {cardHoverMessages.time}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full relative group"
          onMouseEnter={() => setHoveredCard('improvement')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Target className="w-5 h-5" />
            </div>
            <Award className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{improvement > 0 ? '+' : ''}{improvement}%</div>
          <div className="text-green-100 text-xs mb-1">Weekly Improvement</div>
          <div className="text-xs text-green-200 font-semibold">vs last week</div>
          {/* Hover Tooltip */}
          {hoveredCard === 'improvement' && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
              {cardHoverMessages.improvement}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full relative group"
          onMouseEnter={() => setHoveredCard('skills')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <Star className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{Math.round(skillsData.reduce((sum, s) => sum + s.value, 0) / skillsData.length)}%</div>
          <div className="text-indigo-100 text-xs mb-1">Skills Average</div>
          <div className="text-xs text-indigo-200 font-semibold">All skills</div>
          {/* Hover Tooltip */}
          {hoveredCard === 'skills' && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
              {cardHoverMessages.skills}
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Weekly Performance with Last Week Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('progress.weeklyPerformance')}</h3>
            <p className="text-sm text-gray-600">Daily lessons completed and average scores for the last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyDataWithComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="day" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#6366f1"
                tick={{ fill: '#6366f1', fontSize: 12 }}
                label={{ value: 'Lessons', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6366f1' } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fill: '#10b981', fontSize: 12 }}
                domain={[0, 100]}
                label={{ value: 'Score (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#10b981' } }}
              />
              <Tooltip />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  if (value === 'lessonsCompleted') return 'Lessons Completed';
                  if (value === 'averageScore') return 'Average Score (%)';
                  if (value === 'lastWeekScore') return 'Last Week Score (%)';
                  return value;
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="lessonsCompleted" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 6 }}
                name="lessonsCompleted"
                activeDot={{ r: 8, fill: '#6366f1' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="averageScore" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 6 }}
                name="averageScore"
                activeDot={{ r: 8, fill: '#10b981' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="lastWeekScore" 
                stroke="#9ca3af" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', r: 4 }}
                name="lastWeekScore"
                activeDot={{ r: 6, fill: '#9ca3af' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Lessons Completed</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
              />
              <Bar dataKey="completed" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Skills Breakdown + Activity Heatmap + Smart Insights */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('progress.skillsBreakdown')}</h3>
          <div className="space-y-4">
            {skillsData.map((skill, index) => {
              const isEmpty = skill.value === 0;
              return (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">{skill.name}</span>
                    <span className="font-bold text-gray-900">{skill.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 relative">
                    {isEmpty ? (
                      <div className="h-3 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">Not started yet</span>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.value}%` }}
                        transition={{ duration: 1, delay: 0.2 * index }}
                        className="h-3 rounded-full"
                        style={{ backgroundColor: skill.color }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Activity Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={activityTypeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => {
                  if (entry.value > 0) {
                    return `${entry.value}%`;
                  }
                  return '';
                }}
                labelLine={false}
              >
                {activityTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
                formatter={(value: number) => [`${value}%`, 'Percentage']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {activityTypeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg mb-8"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Learning Activity Heatmap</h3>
        <ActivityHeatmap activities={activities} />
      </motion.div>

    </div>
  );
}
