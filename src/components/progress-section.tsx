import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Calendar, Award, Target, BarChart3, Clock, 
  CheckCircle, Star, Flame
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
import { useLanguage } from '../contexts/LanguageContext';

export function ProgressSection() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(getUserStats());
  const [weeklyProgressData, setWeeklyProgressData] = useState(getWeeklyProgressData());
  const [monthlyData, setMonthlyData] = useState(getMonthlyData());
  const [skillsData, setSkillsData] = useState(getSkillsBreakdown());
  const [activityTypeData, setActivityTypeData] = useState(getActivityTypeDistribution());

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

      {/* Overview Cards - Progress-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg h-full"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{lessonsCompleted}</div>
          <div className="text-blue-100 text-xs mb-1">{t('progress.lessonsCompleted')}</div>
          <div className="text-xs text-blue-200 font-semibold">
            {lessonsChange > 0 ? '+' : ''}{lessonsChange} {t('progress.thisWeek')}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg h-full"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full"
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
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Weekly Performance */}
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
            <LineChart data={weeklyProgressData}>
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
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'lessonsCompleted') {
                    return [value === 0 ? 'No lessons' : `${value} lesson${value !== 1 ? 's' : ''}`, 'Lessons Completed'];
                  }
                  return [`${value}%`, 'Average Score'];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  if (value === 'lessonsCompleted') return 'Lessons Completed';
                  if (value === 'averageScore') return 'Average Score (%)';
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
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="averageScore" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 6 }}
                name="averageScore"
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

      {/* Skills Breakdown */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('progress.skillsBreakdown')}</h3>
          <div className="space-y-4">
            {skillsData.map((skill, index) => (
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
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.value}%` }}
                    transition={{ duration: 1, delay: 0.2 * index }}
                    className="h-3 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  />
                </div>
              </motion.div>
            ))}
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
                  // Only show label if value is greater than 0
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
    </div>
  );
}
