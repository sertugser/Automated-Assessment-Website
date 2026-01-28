import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User, Mail, Calendar, Award, Trophy, Star, Flame, Target,
  BookOpen, Clock, TrendingUp, Edit2, Edit, Save, X, Settings,
  Globe, Shield, LogOut, BarChart3
} from 'lucide-react';
import { type User as UserType, updateUser } from '../lib/auth';
import { getUserStats, getRecentActivities, getAchievements, getSkillsBreakdown, type Achievement } from '../lib/user-progress';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfilePageProps {
  user: UserType;
  onLogout: () => void;
  onUpdateUser: (user: UserType) => void;
}

export function ProfilePage({ user, onLogout, onUpdateUser }: ProfilePageProps) {
  const [stats, setStats] = useState(getUserStats());
  const [achievements, setAchievements] = useState<Achievement[]>(getAchievements());

  const [skillsBreakdown, setSkillsBreakdown] = useState(getSkillsBreakdown());

  useEffect(() => {
    // Update stats, achievements, and skills periodically
    const updateData = () => {
      setStats(getUserStats());
      setAchievements(getAchievements());
      setSkillsBreakdown(getSkillsBreakdown());
    };
    
    updateData();
    const interval = setInterval(updateData, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const { lang, setLang, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'settings'>('overview');

  const handleSave = () => {
    if (editedName.trim()) {
      updateUser(user.id, { name: editedName });
      onUpdateUser({ ...user, name: editedName });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user.name);
    setIsEditing(false);
  };

  // Map achievement icon names to actual icon components
  const getAchievementIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Flame,
      BookOpen,
      Target,
      Trophy,
      Edit,
      Award,
      Star,
    };
    return iconMap[iconName] || Trophy;
  };

  // Real stats from user progress; level = CEFR from placement test
  const learningStats = [
    { labelKey: 'stats.cefrLevel', value: user.cefrLevel ?? '—', icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { labelKey: 'stats.activitiesCompleted', value: String(stats.totalActivities), icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { labelKey: 'stats.averageScore', value: `${stats.averageScore}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const [recentActivity, setRecentActivity] = useState<Array<{
    date: string;
    activity: string;
    score: number;
  }>>([]);

  useEffect(() => {
    const updateActivity = () => {
      const activities = getRecentActivities(3);
      const formatted = activities.map(activity => {
        const date = new Date(activity.date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        let dateStr = '';
        if (date.getTime() === today.getTime()) {
          dateStr = 'Today';
        } else if (date.getTime() === yesterday.getTime()) {
          dateStr = 'Yesterday';
        } else {
          const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          dateStr = `${daysDiff} days ago`;
        }

        const activityName = activity.type === 'quiz' 
          ? `Completed ${activity.courseTitle || 'Quiz'}`
          : activity.type === 'writing'
          ? `Writing: ${activity.courseTitle || 'Essay'}`
          : `Speaking: ${activity.courseTitle || 'Practice'}`;

        return {
          date: dateStr,
          activity: activityName,
          score: activity.score,
        };
      });
      setRecentActivity(formatted);
    };

    updateActivity();
    const interval = setInterval(updateActivity, 2000);
    window.addEventListener('storage', updateActivity);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateActivity);
    };
  }, []);

  const getRoleBadge = (role: string) => {
    const badges = {
      student: { color: 'bg-blue-100 text-blue-700', label: 'Student' },
      instructor: { color: 'bg-purple-100 text-purple-700', label: 'Instructor' },
      admin: { color: 'bg-red-100 text-red-700', label: 'Administrator' }
    };
    return badges[role as keyof typeof badges] || badges.student;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* User Info */}
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-2xl font-bold text-gray-900 border-2 border-indigo-300 rounded-lg px-3 py-1 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleSave}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadge(user.role).color}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {getRoleBadge(user.role).label}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mb-2 shadow-lg">
                  <Target className="w-8 h-8" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{user.cefrLevel ?? '—'}</div>
                <div className="text-xs text-gray-600">CEFR</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white mb-2 shadow-lg">
                  <Flame className="w-8 h-8" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.streak}</div>
                <div className="text-xs text-gray-600">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white mb-2 shadow-lg">
                  <Award className="w-8 h-8" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalPoints.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 bg-white rounded-xl p-2 shadow-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('profile.overview')}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('profile.statistics')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('profile.settings')}
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('profile.achievements')}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const IconComponent = getAchievementIcon(achievement.icon);
                  return (
                    <motion.div
                      key={achievement.id}
                      whileHover={{ scale: achievement.unlocked ? 1.02 : 1 }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        achievement.unlocked
                          ? 'border-transparent bg-gradient-to-br from-gray-50 to-white hover:shadow-lg'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-3 bg-gradient-to-br ${achievement.color} rounded-lg ${
                          achievement.unlocked ? '' : 'grayscale'
                        }`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
                          <p className="text-xs text-gray-600">{achievement.description}</p>
                          {achievement.unlocked ? (
                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              {t('profile.unlocked')}
                            </span>
                          ) : (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">{t('profile.progress')}</span>
                                <span className="text-xs font-semibold text-gray-700">{achievement.current} / {achievement.requirement}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                                  style={{ width: `${achievement.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('profile.recentActivity')}</h2>
              </div>

              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{item.date}</span>
                        <span className="text-sm font-bold text-gray-900">{item.score}%</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{item.activity}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Learning Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-3 gap-4"
            >
              {learningStats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{t(stat.labelKey)}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Skills Progress - real data from activity breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('profile.skillsProgress')}</h2>
              </div>
              
              <div className="space-y-4">
                {skillsBreakdown.map((skill, index) => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{skill.name}</span>
                      <span className="text-sm font-bold text-gray-900">{skill.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.value}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                        className="h-3 rounded-full"
                        style={{ backgroundColor: skill.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {skillsBreakdown.every(s => s.value === 0) && (
                <p className="text-sm text-gray-500 mt-4 text-center">{t('progress.completeActivities')}</p>
              )}
            </motion.div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('profile.preferences')}</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-semibold text-gray-900">{t('profile.language')}</div>
                      <div className="text-sm text-gray-600">{t('profile.interfaceLanguage')}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-4 py-2.5 rounded-xl font-semibold transition-all ${
                        lang === 'en'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {t('profile.english')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('tr')}
                      className={`px-4 py-2.5 rounded-xl font-semibold transition-all ${
                        lang === 'tr'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {t('profile.turkish')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('profile.account')}</h2>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t('profile.logout')}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}