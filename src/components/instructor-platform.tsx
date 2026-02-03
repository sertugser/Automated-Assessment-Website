import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Home, FileText, Users, ClipboardList, LogOut, User, Plus, Edit, Trash2,
  ChevronRight, ChevronDown, BarChart3, Clock, CheckCircle, AlertCircle, Sparkles, Target, Award, Star, Send,
} from 'lucide-react';
import { type User as UserType } from '../lib/auth';
import {
  getAssignmentsByInstructor,
  getSubmissionsByInstructor,
  getStudentsByInstructor,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  updateSubmission,
  assignToStudents,
  getAssignedStudents,
  getInstructorRoster,
  addStudentsToRoster,
  removeStudentFromRoster,
  type Assignment,
  type Submission,
  type AssignmentType,
  type AssignmentStatus,
  type AIFeedback,
} from '../lib/assignments';
import { addAssignmentNotifications } from '../lib/notifications';
import { getClassAnalytics } from '../lib/analytics';
import { getUsers, getCurrentUser } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { ProfilePage } from './profile-page';

const COURSE_OPTIONS = [
  { id: 'grammar-basics', label: 'Grammar Basics' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'reading-comprehension', label: 'Reading Comprehension' },
  { id: 'advanced-grammar', label: 'Advanced Grammar' },
  { id: 'ielts-simulation', label: 'IELTS Simulation' },
];

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'writing', label: 'Writing' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'quiz', label: 'Quiz' },
];

type InstructorScreen = 'dashboard' | 'assignments' | 'submissions' | 'students' | 'profile';

interface InstructorPlatformProps {
  onBack: () => void;
  user: UserType | null;
}

export function InstructorPlatform({ onBack, user }: InstructorPlatformProps) {
  const { t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState<InstructorScreen>('dashboard');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<{ studentId: string; studentName: string }[]>([]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assigningAssignment, setAssigningAssignment] = useState<Assignment | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [rosterStudentIds, setRosterStudentIds] = useState<string[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'writing' as AssignmentType,
    courseId: 'grammar-basics',
    status: 'published' as AssignmentStatus,
    maxScore: 100,
    instructions: '',
  });
  const [formCreateStudentIds, setFormCreateStudentIds] = useState<string[]>([]);
  const [formCreateDueDate, setFormCreateDueDate] = useState<string>('');
  const [expandAssignTo, setExpandAssignTo] = useState(false);
  const [assignAllCreate, setAssignAllCreate] = useState(false);
  const [assignAllModal, setAssignAllModal] = useState(false);

  const instructorId = user?.id || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('[data-profile-dropdown]')) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  useEffect(() => {
    if (instructorId) {
      setAssignments(getAssignmentsByInstructor(instructorId));
      setSubmissions(getSubmissionsByInstructor(instructorId));
      setStudents(getStudentsByInstructor(instructorId));
    }
  }, [instructorId]);

  const refreshData = () => {
    if (instructorId) {
      setAssignments(getAssignmentsByInstructor(instructorId));
      setSubmissions(getSubmissionsByInstructor(instructorId));
      setStudents(getStudentsByInstructor(instructorId));
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'completed' && !s.instructorScore && !s.instructorFeedback);
  const classAnalytics = students.length > 0
    ? getClassAnalytics(students.map(s => s.studentId))
    : null;

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructorId) return;
    const newAssignment = createAssignment({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      courseId: formData.courseId,
      instructorId,
      status: formData.status,
      maxScore: formData.maxScore,
      instructions: formData.instructions || undefined,
    });
    if (formCreateStudentIds.length > 0) {
      assignToStudents(newAssignment.id, formCreateStudentIds, formCreateDueDate || undefined);
      addStudentsToRoster(instructorId, formCreateStudentIds);
      addAssignmentNotifications({
        assignmentId: newAssignment.id,
        assignmentTitle: newAssignment.title,
        assignmentType: newAssignment.type,
        courseId: newAssignment.courseId,
        studentIds: formCreateStudentIds,
      });
    }
    refreshData();
    setShowCreateAssignment(false);
    setFormData({ title: '', description: '', type: 'writing', courseId: 'grammar-basics', status: 'published', maxScore: 100, instructions: '' });
    setFormCreateStudentIds([]);
    setFormCreateDueDate('');
    setExpandAssignTo(false);
    setAssignAllCreate(false);
  };

  const handleUpdateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    updateAssignment(editingAssignment.id, {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      courseId: formData.courseId,
      status: formData.status,
      maxScore: formData.maxScore,
      instructions: formData.instructions || undefined,
    });
    refreshData();
    setEditingAssignment(null);
    setFormData({ title: '', description: '', type: 'writing', courseId: 'grammar-basics', status: 'published', maxScore: 100, instructions: '' });
  };

  const handleDeleteAssignment = (id: string) => {
    if (window.confirm(t('instructor.deleteConfirm'))) {
      deleteAssignment(id);
      refreshData();
      setEditingAssignment(null);
    }
  };

  const handleReviewSubmission = (
    submissionId: string,
    instructorScore: number,
    instructorFeedback: string,
    editedAiFeedback?: AIFeedback
  ) => {
    const updates: Partial<Submission> = {
      instructorScore,
      instructorFeedback,
      status: 'reviewed',
      reviewedAt: new Date().toISOString(),
    };
    if (editedAiFeedback) updates.aiFeedback = editedAiFeedback;
    updateSubmission(submissionId, updates);
    refreshData();
    setSelectedSubmission(null);
  };

  const handleAssignToStudents = (assignmentId: string, studentIds: string[], dueDate?: string) => {
    assignToStudents(assignmentId, studentIds, dueDate || undefined);
    addStudentsToRoster(instructorId, studentIds);
    const assignment = getAssignmentById(assignmentId);
    if (assignment && studentIds.length > 0) {
      addAssignmentNotifications({
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        assignmentType: assignment.type,
        courseId: assignment.courseId,
        studentIds,
      });
    }
    refreshData();
    setAssigningAssignment(null);
    setSelectedStudentIds([]);
    setAssignDueDate('');
    setAssignAllModal(false);
  };

  const handleAddStudentsToRoster = (ids: string[]) => {
    addStudentsToRoster(instructorId, ids);
    refreshData();
    setShowAddStudents(false);
    setRosterStudentIds([]);
  };

  const allRegisteredStudents = getUsers().filter(u => u.role === 'student');
  const rosterIds = getInstructorRoster(instructorId);
  const rosterStudents = allRegisteredStudents.filter(s => rosterIds.includes(s.id));
  const assignableStudents = rosterStudents.length > 0 ? rosterStudents : allRegisteredStudents;

  const handleLogout = () => {
    if (window.confirm(t('instructor.logoutConfirm'))) onBack();
  };

  const handleUpdateUser = (updatedUser: UserType) => {
    // Update user state if needed
    // The ProfilePage component handles its own state updates via localStorage
  };

  const getAssignmentById = (id: string) => assignments.find(a => a.id === id);
  const getCourseLabel = (courseId: string) => COURSE_OPTIONS.find(c => c.id === courseId)?.label || courseId;

  const navItems: { id: InstructorScreen; icon: typeof Home; label: string }[] = [
    { id: 'dashboard', icon: Home, label: t('instructor.dashboard') },
    { id: 'assignments', icon: FileText, label: t('instructor.assignments') },
    { id: 'submissions', icon: ClipboardList, label: t('instructor.submissions') },
    { id: 'students', icon: Users, label: t('instructor.students') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logo and Badge */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
              >
                AssessAI
              </button>
              <span className="text-sm text-purple-600 font-medium bg-purple-100 px-2.5 py-1 rounded-full">
                {t('instructor.instructorPanel')}
              </span>
              
              {/* Navigation Tabs - Centered */}
              <nav className="flex items-center justify-center flex-1 ml-6">
                <div className="flex items-center w-full max-w-4xl gap-0">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentScreen(item.id)}
                      className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                        currentScreen === item.id
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>
            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-2.5 rounded-lg transition-all ${
                  currentScreen === 'profile'
                    ? 'text-purple-700 bg-purple-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {user?.avatar ? (
                  <div 
                    className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0"
                    style={{ backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    role="img"
                    aria-label={user.name}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[200px] z-50">
                  <button
                    onClick={() => { setCurrentScreen('profile'); setProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    {t('profile')}
                  </button>
                  <button
                    onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard */}
        {currentScreen === 'dashboard' && (
          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-gray-900 mb-1"
            >
              {t('instructor.welcomeBack')}, {user?.name}!
            </motion.h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg h-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Target className="w-4 h-4 opacity-60" />
                </div>
                <div className="text-2xl font-bold mb-0.5">{assignments.length}</div>
                <div className="text-indigo-100 text-xs">{t('instructor.totalAssignments')}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg h-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <Star className="w-4 h-4 opacity-60" />
                </div>
                <div className="text-2xl font-bold mb-0.5">{students.length}</div>
                <div className="text-purple-100 text-xs">{t('instructor.totalStudents')}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg h-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <Sparkles className="w-4 h-4 opacity-60" />
                </div>
                <div className="text-2xl font-bold mb-0.5">{pendingSubmissions.length}</div>
                <div className="text-orange-100 text-xs">{t('instructor.pendingReview')}</div>
              </motion.div>
              {classAnalytics ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <Award className="w-4 h-4 opacity-60" />
                  </div>
                  <div className="text-2xl font-bold mb-0.5">{Math.round(classAnalytics.averageOverallScore)}%</div>
                  <div className="text-green-100 text-xs">{t('instructor.avgScore')}</div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-0.5">—</div>
                  <div className="text-green-100 text-xs">{t('instructor.avgScore')}</div>
                </motion.div>
              )}
            </div>
            {pendingSubmissions.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  {t('instructor.needsReview')}
                </h2>
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl border border-amber-200 shadow-lg overflow-hidden">
                  <ul className="divide-y divide-amber-200/60">
                    {pendingSubmissions.slice(0, 5).map((s) => {
                      const assignment = getAssignmentById(s.assignmentId);
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => setSelectedSubmission(s)}
                            className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-amber-100/60"
                          >
                            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                              <ClipboardList className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{s.studentName}</p>
                              <p className="text-xs text-gray-500">{assignment?.title}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {t('instructor.needsReview')}
                </h2>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-6 text-center text-indigo-600 text-sm">
                  {t('instructor.allCaughtUp')}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Assignments */}
        {currentScreen === 'assignments' && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <h1 className="text-4xl font-bold text-gray-900">{t('instructor.assignments')}</h1>
              <button
                onClick={() => setShowCreateAssignment(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('instructor.createAssignment')}
              </button>
            </motion.div>
            {assignments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-12 text-center shadow-lg"
              >
                <FileText className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{t('instructor.noAssignments')}</p>
                <button
                  onClick={() => setShowCreateAssignment(true)}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  {t('instructor.createFirst')}
                </button>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {assignments.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg flex items-center justify-between hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <p className="text-sm text-gray-500">{getCourseLabel(a.courseId)} • {a.type} • {a.status}</p>
                      {getAssignedStudents(a.id).length > 0 && (
                        <p className="text-xs text-indigo-600 mt-1">
                          {getAssignedStudents(a.id).length} {t('instructor.assignedTo')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setAssigningAssignment(a);
                          const assigned = getAssignedStudents(a.id);
                          setSelectedStudentIds(assigned);
                          setAssignAllModal(assigned.length > 0 && assigned.length === assignableStudents.length);
                          setAssignDueDate('');
                        }}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
                        title={t('instructor.assignToStudents')}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAssignment(a);
                          setFormData({
                            title: a.title,
                            description: a.description,
                            type: a.type,
                            courseId: a.courseId,
                            status: a.status,
                            maxScore: a.maxScore,
                            instructions: a.instructions || '',
                          });
                        }}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submissions */}
        {currentScreen === 'submissions' && (
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gray-900 mb-2"
            >
              {t('instructor.submissions')}
            </motion.h1>
            {submissions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-12 text-center shadow-lg"
              >
                <ClipboardList className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <p className="text-gray-600">{t('instructor.noSubmissions')}</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {submissions.map((s, i) => {
                  const assignment = getAssignmentById(s.assignmentId);
                  const needsReview = s.status === 'completed' && !s.instructorScore && !s.instructorFeedback;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{s.studentName}</p>
                          <p className="text-sm text-gray-500">{assignment?.title}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(s.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {s.aiScore != null && (
                            <span className="text-sm font-semibold text-indigo-600">
                              AI: {s.aiScore}%
                            </span>
                          )}
                          {needsReview ? (
                            <button
                              onClick={() => setSelectedSubmission(s)}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
                            >
                              {t('instructor.review')}
                            </button>
                          ) : s.instructorScore != null ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle className="w-4 h-4" />
                              {s.instructorScore}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {s.content && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2 pl-1">{s.content}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Students */}
        {currentScreen === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-gray-900 mb-2"
              >
                {t('instructor.students')}
              </motion.h1>
              <button
                onClick={() => {
                  setShowAddStudents(true);
                  setRosterStudentIds([]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('instructor.addStudents')}
              </button>
            </div>
            {rosterStudents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-12 text-center shadow-lg"
              >
                <Users className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{t('instructor.noStudentsInRoster')}</p>
                <button
                  onClick={() => setShowAddStudents(true)}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  {t('instructor.addStudentsFromRegistered')}
                </button>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {rosterStudents.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg flex items-center justify-between hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-indigo-600">
                      {submissions.filter(sub => sub.studentId === s.id).length} {t('instructor.submissionsCount')}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Page */}
        {currentScreen === 'profile' && user && (
          <ProfilePage
            user={user}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </main>

      {/* Create/Edit Assignment Modal */}
      {(showCreateAssignment || editingAssignment) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingAssignment ? t('instructor.editAssignment') : t('instructor.createAssignment')}
                  </h2>
                  <p className="text-xs text-gray-500">{t('instructor.assignFormDesc')}</p>
                </div>
              </div>
            </div>
            <form onSubmit={editingAssignment ? handleUpdateAssignment : handleCreateAssignment} className="flex flex-col min-h-0 overflow-hidden flex-1">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.title')}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('instructor.titlePlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.description')}</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder={t('instructor.descriptionPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.instructions')} <span className="text-gray-400 font-normal">({t('dashboard.optional')})</span></label>
                  <input
                    type="text"
                    value={formData.instructions}
                    onChange={(e) => setFormData(f => ({ ...f, instructions: e.target.value }))}
                    placeholder={t('instructor.instructionsPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.type')}</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(f => ({ ...f, type: e.target.value as AssignmentType }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none bg-white"
                    >
                      {ASSIGNMENT_TYPES.map(tp => (
                        <option key={tp.value} value={tp.value}>{tp.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.course')}</label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => setFormData(f => ({ ...f, courseId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none bg-white"
                    >
                      {COURSE_OPTIONS.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.maxScore')}</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.maxScore}
                      onChange={(e) => setFormData(f => ({ ...f, maxScore: +e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('instructor.status')}</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(f => ({ ...f, status: e.target.value as AssignmentStatus }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="draft">{t('instructor.statusDraft')}</option>
                      <option value="published">{t('instructor.statusPublished')}</option>
                      <option value="archived">{t('instructor.statusArchived')}</option>
                    </select>
                  </div>
                </div>

                {!editingAssignment && (
                  <div className="border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandAssignTo(!expandAssignTo)}
                      className="w-full flex items-center justify-between py-1.5 text-left text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      <span>{t('instructor.assignToStudents')}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        {formCreateStudentIds.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs">
                            {formCreateStudentIds.length} {t('instructor.selected')}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandAssignTo ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    {expandAssignTo && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('instructor.dueDate')}</label>
                          <input
                            type="date"
                            value={formCreateDueDate}
                            onChange={(e) => setFormCreateDueDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={assignAllCreate}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAssignAllCreate(checked);
                              setFormCreateStudentIds(checked ? assignableStudents.map(s => s.id) : []);
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600"
                          />
                          {t('instructor.assignAllStudents')}
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 pr-1">
                          {assignableStudents.length === 0 ? (
                            <p className="text-xs text-gray-400 py-3 px-3">{t('instructor.noStudentsToAssign')}</p>
                          ) : (
                            assignableStudents.map((s) => (
                              <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formCreateStudentIds.includes(s.id)}
                                  disabled={assignAllCreate}
                                  onChange={(e) => {
                                    if (e.target.checked) setFormCreateStudentIds((prev) => [...prev, s.id]);
                                    else setFormCreateStudentIds((prev) => prev.filter((id) => id !== s.id));
                                  }}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600"
                                />
                                <span className="text-sm text-gray-800 truncate flex-1">{s.name}</span>
                                <span className="text-xs text-gray-400 truncate max-w-[120px]">{s.email}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0 bg-gray-50/50">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {editingAssignment ? t('instructor.save') : t('instructor.create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAssignment(false);
                    setEditingAssignment(null);
                    setFormCreateStudentIds([]);
                    setFormCreateDueDate('');
                    setExpandAssignTo(false);
                    setAssignAllCreate(false);
                  }}
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('instructor.cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Students to Roster Modal */}
      {showAddStudents && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('instructor.addStudents')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('instructor.selectFromRegistered')}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 mb-4">
              {allRegisteredStudents
                .filter(s => !rosterIds.includes(s.id))
                .map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={rosterStudentIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setRosterStudentIds((prev) => [...prev, s.id]);
                        else setRosterStudentIds((prev) => prev.filter((id) => id !== s.id));
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.email}</span>
                  </label>
                ))}
            </div>
            {allRegisteredStudents.filter(s => !rosterIds.includes(s.id)).length === 0 && (
              <p className="text-sm text-gray-500 mb-4">{t('instructor.allStudentsAdded')}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleAddStudentsToRoster(rosterStudentIds)}
                disabled={rosterStudentIds.length === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('instructor.addToClass')}
              </button>
              <button
                onClick={() => {
                  setShowAddStudents(false);
                  setRosterStudentIds([]);
                }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                {t('instructor.cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Assign to Students Modal */}
      {assigningAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('instructor.assignToStudents')}</h2>
            <p className="text-sm text-gray-500 mb-4">{assigningAssignment.title}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('instructor.dueDate')}</label>
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-600"
              />
            </div>
            {rosterStudents.length === 0 && allRegisteredStudents.length > 0 && (
              <p className="text-sm text-indigo-600 mb-2">{t('instructor.selectFromRegistered')}</p>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={assignAllModal}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAssignAllModal(checked);
                  setSelectedStudentIds(checked ? assignableStudents.map(s => s.id) : []);
                }}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t('instructor.assignAllStudents')}
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 rounded-xl p-3 mb-4 pr-1">
              {assignableStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    disabled={assignAllModal}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedStudentIds((prev) => [...prev, s.id]);
                      else setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-xs text-gray-500">{s.email}</span>
                </label>
              ))}
            </div>
            {allRegisteredStudents.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">{t('instructor.noStudentsToAssign')}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleAssignToStudents(
                    assigningAssignment.id,
                    selectedStudentIds,
                    assignDueDate || undefined
                  )
                }
                disabled={selectedStudentIds.length === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('instructor.sendAssignment')}
              </button>
              <button
                onClick={() => {
                  setAssigningAssignment(null);
                  setSelectedStudentIds([]);
                  setAssignAllModal(false);
                }}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                {t('instructor.cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Review Submission Modal */}
      {selectedSubmission && (
        <SubmissionReviewModal
          submission={selectedSubmission}
          assignment={getAssignmentById(selectedSubmission.assignmentId)}
          onClose={() => setSelectedSubmission(null)}
          onSave={(id, score, feedback, editedAi) => handleReviewSubmission(id, score, feedback, editedAi)}
          t={t}
        />
      )}
    </div>
  );
}

function SubmissionReviewModal({
  submission,
  assignment,
  onClose,
  onSave,
  t,
}: {
  submission: Submission;
  assignment?: Assignment;
  onClose: () => void;
  onSave: (id: string, score: number, feedback: string, editedAi?: AIFeedback) => void;
  t: (k: string) => string;
}) {
  const ai = submission.aiFeedback;
  const [score, setScore] = useState(submission.instructorScore ?? submission.aiScore ?? 0);
  const [feedback, setFeedback] = useState(submission.instructorFeedback ?? '');
  const [strengths, setStrengths] = useState(ai?.strengths?.join('\n') ?? '');
  const [improvements, setImprovements] = useState(ai?.improvements?.join('\n') ?? '');

  const handleSave = () => {
    const editedAi: AIFeedback | undefined = ai
      ? {
          ...ai,
          strengths: strengths.trim() ? strengths.split('\n').map((s) => s.trim()).filter(Boolean) : [],
          improvements: improvements.trim() ? improvements.split('\n').map((s) => s.trim()).filter(Boolean) : [],
        }
      : undefined;
    onSave(submission.id, score, feedback, editedAi);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('instructor.reviewSubmission')}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {submission.studentName} • {assignment?.title}
        </p>
        {submission.content && (
          <div className="mb-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('instructor.studentWork')}</p>
            <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
          </div>
        )}
        {submission.aiScore != null && (
          <p className="text-sm font-medium text-indigo-600 mb-2">
            {t('instructor.aiScore')}: {submission.aiScore}%
          </p>
        )}

        {/* Editable AI Feedback */}
        {ai && (
          <div className="mb-4 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">{t('instructor.editAiFeedback')}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('instructor.strengths')}</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder={t('instructor.strengthsPlaceholder')}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('instructor.improvements')}</label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder={t('instructor.improvementsPlaceholder')}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('instructor.yourScore')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(+e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('instructor.feedback')}</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-colors"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            {t('instructor.submitReview')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            {t('instructor.cancel')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
