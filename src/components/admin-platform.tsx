import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, BarChart3, Shield, LogOut, User, Mail, Calendar, Award,
  TrendingUp, Activity, BookOpen, Edit, Mic, FileText, Trash2,
  Search, Filter, Download, RefreshCw, Eye, EyeOff, Lock, Save, X
} from 'lucide-react';
import { getUsers, deleteUser, updateUser, getCurrentUser, logout, changePassword, type User as UserType } from '../lib/auth';
import { getUserStats, getActivitiesForUser, type UserActivity } from '../lib/user-progress';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

interface AdminPlatformProps {
  onBack: () => void;
  user: UserType;
}

export function AdminPlatform({ onBack, user }: AdminPlatformProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserType[]>(getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
    cefrLevel: '' as string,
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalActivities: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    loadUsers();
    loadStats();
    // Update every 2 seconds to catch activity changes
    const interval = setInterval(() => {
      loadUsers();
      loadStats();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const loadStats = () => {
    const allUsers = getUsers();
    const allActivities = allUsers.flatMap(u => getActivitiesForUser(u.id));
    const activeUserIds = new Set(allUsers.filter(u => getActivitiesForUser(u.id).length > 0).map(u => u.id));
    
    setStats({
      totalUsers: allUsers.length,
      totalStudents: allUsers.filter(u => u.role === 'student').length,
      totalInstructors: allUsers.filter(u => u.role === 'instructor').length,
      totalActivities: allActivities.length,
      activeUsers: activeUserIds.size,
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === user.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      if (deleteUser(userId)) {
        toast.success('User deleted successfully');
        loadUsers();
        loadStats();
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
          setShowUserDetails(false);
        }
      } else {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleViewUserDetails = (user: UserType) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      cefrLevel: user.cefrLevel || '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;

    if (!editFormData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!editFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Check if password is being changed
    if (editFormData.newPassword) {
      if (editFormData.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (editFormData.newPassword !== editFormData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    // Update user info
    const updates: Partial<UserType> = {
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      role: editFormData.role,
      cefrLevel: editFormData.cefrLevel || undefined,
    };

    if (updateUser(editingUser.id, updates)) {
      // Update password if provided
      if (editFormData.newPassword) {
        const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
        passwords[editFormData.email.trim()] = editFormData.newPassword;
        localStorage.setItem('aafs_passwords', JSON.stringify(passwords));
      }

      toast.success('User updated successfully');
      loadUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } else {
      toast.error('Failed to update user');
    }
  };

  const filteredUsers = users.filter(u => {
    if (u.role === 'admin') return false;
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getUserActivities = (userId: string): UserActivity[] => {
    // Always get fresh activities from localStorage
    return getActivitiesForUser(userId);
  };

  const getUserStatsForUser = (userId: string) => {
    // Always get fresh activities from localStorage
    const activities = getActivitiesForUser(userId);
    if (activities.length === 0) {
      return {
        totalActivities: 0,
        averageScore: 0,
        totalPoints: 0,
        streak: 0,
      };
    }
    const scores = activities.map(a => a.score).filter(s => s !== undefined && s !== null);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const totalPoints = activities.reduce((sum, a) => sum + (a.points || 0), 0);
    return {
      totalActivities: activities.length,
      averageScore,
      totalPoints,
      streak: 0, // Would need to calculate from dates
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">System Administration Panel</p>
              </div>
              {/* Search in header */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Users className="w-5 h-5 text-indigo-600" />
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-xs text-gray-600">Total Users</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
            <div className="text-xs text-gray-600">Students</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Award className="w-5 h-5 text-purple-600" />
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalInstructors}</div>
            <div className="text-xs text-gray-600">Instructors</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Activity className="w-5 h-5 text-green-600" />
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalActivities}</div>
            <div className="text-xs text-gray-600">Total Activities</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <User className="w-5 h-5 text-orange-600" />
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
            <div className="text-xs text-gray-600">Active Users</div>
          </motion.div>
        </div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="instructor">Instructors</option>
                </select>
                <button
                  onClick={() => { loadUsers(); loadStats(); toast.success('Data refreshed'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEFR Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => {
                  // Get fresh stats for each user on every render
                  const userStats = getUserStatsForUser(u.id);
                  const roleColors = {
                    student: 'bg-blue-100 text-blue-700',
                    instructor: 'bg-purple-100 text-purple-700',
                    admin: 'bg-red-100 text-red-700',
                  };
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              u.avatar ? 'bg-gray-200' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                            }`}
                            style={u.avatar ? { 
                              backgroundImage: `url(${u.avatar})`, 
                              backgroundSize: 'cover', 
                              backgroundPosition: 'center' 
                            } : undefined}
                            role={u.avatar ? 'img' : undefined}
                            aria-label={u.avatar ? u.name : undefined}
                          >
                            {!u.avatar && u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-12">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.cefrLevel || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userStats.totalActivities} ({userStats.averageScore}% avg)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewUserDetails(u)}
                            className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {u.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </motion.div>

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <EyeOff className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div 
                    className={`h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 ${
                      selectedUser.avatar ? 'bg-gray-200' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}
                    style={selectedUser.avatar ? { 
                      backgroundImage: `url(${selectedUser.avatar})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center' 
                    } : undefined}
                    role={selectedUser.avatar ? 'img' : undefined}
                    aria-label={selectedUser.avatar ? selectedUser.name : undefined}
                  >
                    {!selectedUser.avatar && selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{selectedUser.name}</h4>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.role === 'student' ? 'bg-blue-100 text-blue-700' :
                      selectedUser.role === 'instructor' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">CEFR Level</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.cefrLevel || 'Not assessed'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Activity Statistics</h5>
                  {(() => {
                    const userStats = getUserStatsForUser(selectedUser.id);
                    const activities = getUserActivities(selectedUser.id);
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">Total Activities</p>
                          <p className="text-2xl font-bold text-gray-900">{userStats.totalActivities}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">Average Score</p>
                          <p className="text-2xl font-bold text-gray-900">{userStats.averageScore}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">Total Points</p>
                          <p className="text-2xl font-bold text-gray-900">{userStats.totalPoints}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Recent Activities</h5>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getUserActivities(selectedUser.id).slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.type === 'quiz' ? 'Quiz' : activity.type === 'writing' ? 'Writing' : 'Speaking'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">{activity.score}%</span>
                      </div>
                    ))}
                    {getUserActivities(selectedUser.id).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No activities yet</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setEditFormData({
                      name: '',
                      email: '',
                      role: 'student',
                      cefrLevel: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    {editingUser.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CEFR Level</label>
                  <select
                    value={editFormData.cefrLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, cefrLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Not assessed</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <label className="block text-sm font-medium text-gray-700">Change Password (Optional)</label>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={editFormData.newPassword}
                        onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                        placeholder="New password (leave empty to keep current)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {editFormData.newPassword && (
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={editFormData.confirmPassword}
                          onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
