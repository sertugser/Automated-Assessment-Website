import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User, Mail, Calendar, Award, Trophy, Star, Flame, Target,
  BookOpen, Edit2, Edit, Save, X, Settings,
  Globe, Shield, LogOut, Camera, Lock, Eye, EyeOff, Trash2
} from 'lucide-react';
import { type User as UserType, updateUser, changePassword, getCurrentUser } from '../lib/auth';
import { toast } from 'sonner';
import { getUserStats, getAchievements, type Achievement } from '../lib/user-progress';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfilePageProps {
  user: UserType;
  onLogout: () => void;
  onUpdateUser: (user: UserType) => void;
}

export function ProfilePage({ user, onLogout, onUpdateUser }: ProfilePageProps) {
  const [stats, setStats] = useState(getUserStats());
  // Only load achievements for students, not for instructors
  const [achievements, setAchievements] = useState<Achievement[]>(
    user.role !== 'instructor' ? getAchievements() : []
  );

  useEffect(() => {
    // Update stats and achievements periodically
    const updateData = () => {
      setStats(getUserStats());
      // Only update achievements for students
      if (user.role !== 'instructor') {
        setAchievements(getAchievements());
      }
    };
    
    updateData();
    const interval = setInterval(updateData, 2000);
    
    return () => clearInterval(interval);
  }, [user.role]);
  
  const { lang, setLang, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  // Instructors only see settings, students see both overview and settings
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>(
    user.role === 'instructor' ? 'settings' : 'overview'
  );
  
  // Update avatar preview when user changes
  useEffect(() => {
    setAvatarPreview(user.avatar || null);
  }, [user.avatar]);

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

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = changePassword(user.email, currentPassword, newPassword);
    if (result.success) {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } else {
      toast.error(result.error || 'Failed to change password');
    }
  };

  // Compress and resize image to reduce file size
  const compressImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          const base64String = canvas.toDataURL('image/jpeg', quality);
          resolve(base64String);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarClick = () => {
    // If avatar exists, delete it
    if (avatarPreview) {
      if (confirm('Are you sure you want to delete your profile photo?')) {
        setAvatarPreview(null);
        updateUser(user.id, { avatar: undefined });
        // Get updated user from localStorage to ensure sync
        const updatedUser = getCurrentUser();
        if (updatedUser) {
          onUpdateUser(updatedUser);
        } else {
          onUpdateUser({ ...user, avatar: undefined });
        }
        toast.success('Profile photo deleted successfully');
      }
      return;
    }

    // If no avatar, upload new one
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }

      try {
        // Compress and resize image
        const compressedBase64 = await compressImage(file, 400, 400, 0.75);
        
        // Check if compressed image is still too large (shouldn't be, but just in case)
        if (compressedBase64.length > 500 * 1024) { // 500KB limit
          toast.error('Image is still too large after compression. Please use a smaller image.');
          return;
        }
        
        // Update user avatar in localStorage
        const success = updateUser(user.id, { avatar: compressedBase64 });
        
        if (!success) {
          console.error('updateUser failed for user ID:', user.id);
          toast.error('Failed to save profile photo. Please try again.');
          return;
        }
        
        // Get updated user from localStorage to ensure sync with parent component
        const updatedUser = getCurrentUser();
        if (updatedUser && updatedUser.avatar) {
          setAvatarPreview(updatedUser.avatar);
          onUpdateUser(updatedUser);
          toast.success('Profile photo saved successfully');
        } else {
          // Fallback if getCurrentUser fails or avatar is missing
          console.warn('getCurrentUser returned null or missing avatar, using fallback');
          setAvatarPreview(compressedBase64);
          const fallbackUser = { ...user, avatar: compressedBase64 };
          onUpdateUser(fallbackUser);
          toast.success('Profile photo saved successfully');
        }
      } catch (error) {
        console.error('Error processing avatar:', error);
        toast.error('Error saving profile photo: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    input.click();
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


  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getRoleBadge = (role: string) => {
    const badges = {
      student: { color: 'bg-blue-100 text-blue-700', label: 'Student' },
      instructor: { color: 'bg-purple-100 text-purple-700', label: 'Instructor' },
      admin: { color: 'bg-red-100 text-red-700', label: 'Administrator' }
    };
    return badges[role as keyof typeof badges] || badges.student;
  };

  return (
    <div className={user.role === 'instructor' ? '' : 'min-h-screen bg-gray-50'}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${user.role === 'instructor' ? 'py-0' : 'py-8'}`}>
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div 
                className="relative"
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
              >
                <div 
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden cursor-pointer transition-all relative ${
                    avatarPreview ? 'bg-gray-200' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}
                  style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  onClick={handleAvatarClick}
                  role={avatarPreview ? 'img' : undefined}
                  aria-label={avatarPreview ? user.name : undefined}
                >
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center z-10">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div 
                  className={`absolute inset-0 rounded-full bg-black transition-all duration-200 flex items-center justify-center cursor-pointer z-20 ${
                    isHoveringAvatar ? 'bg-opacity-50' : 'bg-opacity-0'
                  }`}
                  onClick={handleAvatarClick}
                >
                  {avatarPreview ? (
                    <Trash2 className={`w-8 h-8 text-white transition-opacity duration-200 ${
                      isHoveringAvatar ? 'opacity-100' : 'opacity-0'
                    }`} />
                  ) : (
                    <Camera className={`w-8 h-8 text-white transition-opacity duration-200 ${
                      isHoveringAvatar ? 'opacity-100' : 'opacity-0'
                    }`} />
                  )}
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

        {/* Tabs - Only show for students, instructors only see settings */}
        {user.role !== 'instructor' && (
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
        )}

        {/* Overview Tab - Only for students */}
        {user.role !== 'instructor' && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Achievements - Only show for students, not for instructors */}
            {user.role !== 'instructor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Trophy className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t('profile.achievements')}</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            )}
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

                {/* Password Change */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-semibold text-gray-900">Change Password</div>
                        <div className="text-sm text-gray-600">Update your account password</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>
                  
                  {showPasswordForm && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handlePasswordChange}
                        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Update Password
                      </button>
                    </div>
                  )}
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