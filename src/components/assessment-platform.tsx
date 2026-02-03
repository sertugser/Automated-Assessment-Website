import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Trophy, Zap, Target, User, LogOut, Home, 
  BarChart3, Mic, Edit, Brain, BookOpen, MessageSquare, Headphones,
  FileText, Briefcase, GraduationCap, ChevronDown, BookMarked, Bell
} from 'lucide-react';
import { ModernDashboard } from './modern-dashboard';
import { ProgressSection } from './progress-section';
import { SpeakingSection } from './speaking-section';
import { ListeningSection } from './listening-section';
import { WritingSection } from './writing-section';
import { QuizSection, quizCategories } from './quiz-section';
import { QuizHistory } from './quiz-history';
import { PlacementTest } from './placement-test';
import { QuizInterface } from './quiz-interface';
import { ResultsScreen } from './results-screen';
import { ProfilePage } from './profile-page';
import { DictionarySection } from './dictionary-section';
import { HomeworkSection } from './homework-section';
import { type User as UserType, updateUser, getCurrentUser } from '../lib/auth';
import { getUserStats, getRecentActivities, saveActivity, analyzeUserWeaknesses, getMistakeCountsByTopic, getWrongAnswerDetails, getActivitiesByType, getActivities, type UserActivity } from '../lib/user-progress';
import { generatePersonalizedRecommendations, getLearningDifficultyAnalysis, getCommonMistakesAnalysis, generateQuizPerformanceAnalysis, type LearningDifficultyAnalysis, type CommonMistakeAnalysis } from '../lib/ai-services';
import { getAssignment } from '../lib/assignments';
import { getNotificationsForStudent, markNotificationRead, deleteNotification, markAllNotificationsRead, type AssignmentNotification } from '../lib/notifications';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/fbaa49f59eaf54473f226d88f4a207918ca971f2.png';

interface AssessmentPlatformProps {
  onBack: () => void;
  user: UserType | null;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
  color: string;
}

export type Screen = 'dashboard' | 'progress' | 'speaking' | 'listening' | 'writing' | 'quiz' | 'homework' | 'dictionary' | 'placement' | 'course-quiz' | 'results' | 'profile' | 'quiz-history' | 'quiz-detail';

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  courseTitle: string;
  questions?: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    topic: string;
    section?: 1 | 2 | 3;
  }>;
  userAnswers?: (number | null)[];
  readingPassage?: string;
  feedback?: any;
}

// Icon mapping for recommendations
const iconMap: Record<string, any> = {
  BookOpen,
  MessageSquare,
  FileText,
  Headphones,
  Mic,
  Edit,
  Briefcase,
  GraduationCap,
  Target,
  Brain,
};

export function AssessmentPlatform({ onBack, user }: AssessmentPlatformProps) {
  const { t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [screenHistory, setScreenHistory] = useState<Screen[]>(['dashboard']);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(user);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [learningDifficulty, setLearningDifficulty] = useState<LearningDifficultyAnalysis | null>(null);
  const [loadingDifficulty, setLoadingDifficulty] = useState(true);
  const [commonMistakes, setCommonMistakes] = useState<CommonMistakeAnalysis[]>([]);
  const [loadingCommonMistakes, setLoadingCommonMistakes] = useState(true);
  const [initialSpeakingActivityId, setInitialSpeakingActivityId] = useState<string | null>(null);
  const [initialSpeakingAssignmentId, setInitialSpeakingAssignmentId] = useState<string | null>(null);
  const [initialListeningAssignmentId, setInitialListeningAssignmentId] = useState<string | null>(null);
  const [initialWritingActivityId, setInitialWritingActivityId] = useState<string | null>(null);
  const [initialWritingAssignmentId, setInitialWritingAssignmentId] = useState<string | null>(null);
  const [initialQuizActivityId, setInitialQuizActivityId] = useState<string | null>(null);
  const [initialQuizAssignmentId, setInitialQuizAssignmentId] = useState<string | null>(null);
  const [resultsFromHistory, setResultsFromHistory] = useState(false);
  const [studyPlanHovered, setStudyPlanHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [difficultyRefreshTrigger, setDifficultyRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close study plan dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (studyPlanHovered && !target.closest('.relative.flex.flex-1')) {
        setStudyPlanHovered(false);
      }
    };
    
    if (studyPlanHovered) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [studyPlanHovered]);

  // Close profile dropdown and notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (profileDropdownOpen && !target.closest('[data-profile-dropdown]')) {
        setProfileDropdownOpen(false);
      }
      if (notificationPanelOpen && !target.closest('[data-notification-panel]')) {
        setNotificationPanelOpen(false);
      }
    };
    if (profileDropdownOpen || notificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen, notificationPanelOpen]);

  const refreshNotifications = () => {
    if (!currentUser?.id) return;
    const items = getNotificationsForStudent(currentUser.id);
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.readAt).length);
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 2000);
    const handleStorage = () => refreshNotifications();
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser?.id]);

  // Persist last visited screen so refresh returns the user to the same tab
  useEffect(() => {
    const saved = localStorage.getItem('assessai_current_screen') as Screen | null;
    if (saved && typeof saved === 'string') {
      const allowed: Screen[] = ['dashboard', 'progress', 'speaking', 'listening', 'writing', 'quiz', 'homework', 'dictionary', 'quiz-history', 'profile'];
      if (allowed.includes(saved)) {
        setCurrentScreen(saved);
        setScreenHistory([saved]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('assessai_current_screen', currentScreen);
  }, [currentScreen]);

  // Clear assignment context when leaving writing (so next visit gets fresh state)
  useEffect(() => {
    if (currentScreen !== 'writing') {
      setInitialWritingAssignmentId(null);
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen !== 'speaking') {
      setInitialSpeakingAssignmentId(null);
    }
  }, [currentScreen]);

  // Sync currentUser with localStorage when screen changes or periodically
  useEffect(() => {
    const syncUser = () => {
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        // Only update if user ID matches or if it's a different user
        if (!currentUser || updatedUser.id === currentUser.id) {
          setCurrentUser(updatedUser);
        }
      }
    };
    
    // Sync immediately when screen changes to dashboard
    if (currentScreen === 'dashboard') {
      syncUser();
    }
    
    // Also sync periodically to catch any updates
    const interval = setInterval(syncUser, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [currentScreen]);

  // Load saved analysis data from localStorage on mount
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const savedDifficulty = localStorage.getItem(`assessai_learning_difficulty_${currentUser.id}`);
        const savedCommonMistakes = localStorage.getItem(`assessai_common_mistakes_${currentUser.id}`);
        
        if (savedDifficulty) {
          const parsed = JSON.parse(savedDifficulty);
          // Check if data is not too old (24 hours)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setLearningDifficulty(parsed.data);
            setLoadingDifficulty(false);
          }
        }
        
        if (savedCommonMistakes) {
          const parsed = JSON.parse(savedCommonMistakes);
          // Check if data is not too old (24 hours)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setCommonMistakes(parsed.data);
            setLoadingCommonMistakes(false);
          }
        }
      } catch (error) {
        console.error('Error loading saved analysis:', error);
      }
    }
  }, [currentUser?.id]);

  // Save analysis data to localStorage when it changes
  useEffect(() => {
    if (currentUser?.id && learningDifficulty !== null) {
      try {
        localStorage.setItem(`assessai_learning_difficulty_${currentUser.id}`, JSON.stringify({
          data: learningDifficulty,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error saving learning difficulty:', error);
      }
    }
  }, [learningDifficulty, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && commonMistakes.length > 0) {
      try {
        localStorage.setItem(`assessai_common_mistakes_${currentUser.id}`, JSON.stringify({
          data: commonMistakes,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error saving common mistakes:', error);
      }
    }
  }, [commonMistakes, currentUser?.id]);

  // Load AI-generated recommendations and learning difficulty analysis (no 30s interval - saves tokens)
  const RECOMMENDATIONS_CACHE_KEY = currentUser?.id ? `assessai_recommendations_${currentUser.id}` : null;
  const RECOMMENDATIONS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        // Use cache if valid (avoid repeated API calls)
        if (RECOMMENDATIONS_CACHE_KEY) {
          try {
            const cached = localStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
            if (cached) {
              const { timestamp, data } = JSON.parse(cached);
              if (timestamp && data && Array.isArray(data) && Date.now() - timestamp < RECOMMENDATIONS_CACHE_TTL_MS) {
                const mapped: Recommendation[] = (data as Recommendation[]).map(rec => ({
                  ...rec,
                  icon: iconMap[rec.icon] || BookOpen,
                }));
                setRecommendations(mapped);
                setLoadingRecommendations(false);
                return;
              }
            }
          } catch (_) { /* ignore invalid cache */ }
        }

        const stats = getUserStats();
        const recentActivities = getRecentActivities(10);
        const weaknessAnalysis = analyzeUserWeaknesses();

        const aiRecommendations = await generatePersonalizedRecommendations(
          {
            streak: stats.streak,
            totalPoints: stats.totalPoints,
            averageScore: stats.averageScore,
            totalActivities: stats.totalActivities,
            cefrLevel: currentUser?.cefrLevel ?? null,
          },
          recentActivities.map(a => ({
            type: a.type,
            score: a.score,
            courseTitle: a.courseTitle,
          })),
          weaknessAnalysis
        );

        // Map AI recommendations to component format with icon components
        const mappedRecommendations: Recommendation[] = aiRecommendations.map(rec => ({
          ...rec,
          icon: iconMap[rec.icon] || BookOpen,
        }));

        setRecommendations(mappedRecommendations);

        // Cache for 30 minutes to reduce token usage
        if (RECOMMENDATIONS_CACHE_KEY && mappedRecommendations.length > 0) {
          try {
            localStorage.setItem(RECOMMENDATIONS_CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              data: mappedRecommendations.map(({ icon, ...rest }) => rest),
            }));
          } catch (_) { /* ignore */ }
        }
      } catch (error) {
        console.error('Error loading recommendations:', error);
        setRecommendations([
          {
            id: 'default-1',
            title: 'Start Your Learning Journey',
            description: 'Begin with basic exercises to build a strong foundation.',
            action: 'Get Started',
            priority: 'high',
            icon: BookOpen,
            color: 'from-blue-500 to-blue-600'
          }
        ]);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    const loadDifficultyAnalysis = async () => {
      // Only load if we don't have cached data or it's too old
      const hasCachedDifficulty = currentUser?.id && localStorage.getItem(`assessai_learning_difficulty_${currentUser.id}`);
      const hasCachedMistakes = currentUser?.id && localStorage.getItem(`assessai_common_mistakes_${currentUser.id}`);
      
      if (hasCachedDifficulty && hasCachedMistakes) {
        try {
          const savedDifficulty = JSON.parse(hasCachedDifficulty);
          const savedMistakes = JSON.parse(hasCachedMistakes);
          // If data is less than 24 hours old, use cache and skip API
          if (savedDifficulty.timestamp && savedMistakes.timestamp &&
              Date.now() - savedDifficulty.timestamp < 24 * 60 * 60 * 1000 &&
              Date.now() - savedMistakes.timestamp < 24 * 60 * 60 * 1000) {
            setLearningDifficulty(savedDifficulty.data ?? null);
            setCommonMistakes(Array.isArray(savedMistakes.data) ? savedMistakes.data : []);
            setLoadingDifficulty(false);
            setLoadingCommonMistakes(false);
            return;
          }
        } catch (e) {
          // Continue to load fresh data
        }
      }

      setLoadingDifficulty(true);
      setLoadingCommonMistakes(true);
      try {
        const stats = getUserStats();
        const recentActivities = getRecentActivities(10);
        const weaknessAnalysis = analyzeUserWeaknesses();
        const mistakeCounts = getMistakeCountsByTopic();
        const wrongAnswerDetails = getWrongAnswerDetails(20);
        
        // Load learning difficulty analysis
        const analysis = await getLearningDifficultyAnalysis(
          {
            streak: stats.streak,
            totalPoints: stats.totalPoints,
            averageScore: stats.averageScore,
            totalActivities: stats.totalActivities,
            cefrLevel: currentUser?.cefrLevel ?? null,
          },
          recentActivities.map(a => ({
            type: a.type,
            score: a.score,
            courseTitle: a.courseTitle,
          })),
          weaknessAnalysis,
          mistakeCounts,
          wrongAnswerDetails
        );
        setLearningDifficulty(analysis);
        
        // Load common mistakes analysis
        const commonMistakesAnalysis = await getCommonMistakesAnalysis(mistakeCounts, wrongAnswerDetails);
        setCommonMistakes(commonMistakesAnalysis);
      } catch (error) {
        console.error('Error loading learning difficulty analysis:', error);
        setLearningDifficulty(null);
        setCommonMistakes([]);
      } finally {
        setLoadingDifficulty(false);
        setLoadingCommonMistakes(false);
      }
    };

    // Only fetch when on dashboard to avoid wasting tokens on other screens
    if (currentScreen === 'dashboard') {
      loadRecommendations();
      loadDifficultyAnalysis();
    }
  }, [currentScreen, currentUser?.cefrLevel, currentUser?.id, difficultyRefreshTrigger]);

  // Notify dashboard to refresh when user completes speaking, writing, listening, or quiz
  const handleActivitySaved = useCallback(() => {
    if (currentUser?.id) {
      try {
        localStorage.removeItem(`assessai_recommendations_${currentUser.id}`);
        localStorage.removeItem(`assessai_learning_difficulty_${currentUser.id}`);
        localStorage.removeItem(`assessai_common_mistakes_${currentUser.id}`);
      } catch (_) { /* ignore */ }
    }
    setDifficultyRefreshTrigger(prev => prev + 1);
  }, [currentUser?.id]);

  const generateRecommendationsFromQuiz = (results: QuizResult) => {
    const newRecs: Recommendation[] = [];
    const score = results.score;

    // Grammar recommendations
    if (selectedCourse === 'grammar-basics' && score < 80) {
      newRecs.push({
        id: 'grammar-practice',
        title: 'Practice More Grammar Exercises',
        description: 'You scored ' + score + '% on Grammar. Focus on verb tenses and sentence structure.',
        action: 'Start Practice',
        priority: score < 60 ? 'high' : 'medium',
        icon: BookOpen,
        color: 'from-blue-500 to-blue-600'
      });
    }

    // Vocabulary recommendations
    if (selectedCourse === 'vocabulary' && score < 85) {
      newRecs.push({
        id: 'vocabulary-builder',
        title: 'Expand Your Vocabulary',
        description: 'Strengthen your word knowledge with daily practice and contextual learning.',
        action: 'Learn Words',
        priority: 'medium',
        icon: MessageSquare,
        color: 'from-green-500 to-green-600'
      });
    }

    // Listening recommendations
    if (selectedCourse === 'listening' && score < 75) {
      newRecs.push({
        id: 'listening-practice',
        title: 'Improve Listening Comprehension',
        description: 'Practice with native speakers and audio exercises to enhance your listening skills.',
        action: 'Practice Listening',
        priority: score < 60 ? 'high' : 'medium',
        icon: Headphones,
        color: 'from-orange-500 to-orange-600'
      });
    }

    return newRecs;
  };

  const navigateToScreen = (screen: Screen) => {
    setScreenHistory(prev => {
      // Don't add duplicate consecutive screens
      if (prev[prev.length - 1] !== screen) {
        return [...prev, screen];
      }
      return prev;
    });
    setCurrentScreen(screen);
    // Close study plan dropdown when navigating to a different screen
    setStudyPlanHovered(false);
  };

  const handleBack = () => {
    // If we have history and not on dashboard, go back to previous screen
    if (screenHistory.length > 1) {
      const currentScreenFromHistory = screenHistory[screenHistory.length - 1];
      const newHistory = [...screenHistory];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
      
      // Reset related state when going back from certain screens
      if (currentScreenFromHistory === 'course-quiz' || currentScreenFromHistory === 'results') {
        setSelectedCourse('');
        setQuizResults(null);
      }
    } else {
      // If no history or on dashboard, ask for confirmation before going back to landing page
      const confirmed = window.confirm('Do you want to sign out?');
      if (confirmed) {
        onBack();
      }
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    navigateToScreen('course-quiz');
  };

  const handleQuizComplete = async (results: QuizResult) => {
    setResultsFromHistory(false);

    // Real AI performance analysis (detailed, based on actual wrong answers and topics)
    let feedback: { strongAreas: string; areasForImprovement: string; recommendation: string };
    try {
      feedback = await generateQuizPerformanceAnalysis({
        score: results.score,
        totalQuestions: results.totalQuestions,
        correctAnswers: results.correctAnswers,
        timeSpent: results.timeSpent,
        courseTitle: results.courseTitle,
        questions: results.questions,
        userAnswers: results.userAnswers,
      });
    } catch (e) {
      console.warn('Quiz AI analysis failed, using fallback', e);
      feedback = {
        strongAreas: results.score >= 70 ? 'You demonstrated good understanding of core concepts. Your response time shows confidence in the material.' : '',
        areasForImprovement: results.score < 90 ? 'Review advanced topics and practice more challenging questions to reach mastery level.' : '',
        recommendation: results.score >= 90 ? 'Try an advanced course to continue challenging yourself!' : 'Review the material and retry to improve your score. Practice makes perfect!',
      };
    }

    const resultsWithFeedback: QuizResult = { ...results, feedback };
    setQuizResults(resultsWithFeedback);

    try {
      saveActivity({
        type: 'quiz',
        score: results.score,
        courseId: selectedCourse,
        courseTitle: results.courseTitle,
        correctAnswers: results.correctAnswers,
        totalQuestions: results.totalQuestions,
        duration: results.timeSpent,
        cefrLevel: currentUser?.cefrLevel || undefined,
        quizQuestions: results.questions,
        quizUserAnswers: results.userAnswers,
        quizReadingPassage: results.readingPassage,
        quizFeedback: feedback,
      });
      handleActivitySaved();
      const newRecs = generateRecommendationsFromQuiz(results);
      if (newRecs.length > 0) {
        setRecommendations(prev => {
          const filtered = prev.filter(rec => !newRecs.find(nr => nr.id === rec.id));
          return [...filtered, ...newRecs];
        });
      }
    } catch (e) {
      console.warn('Quiz complete: save/recommendations failed', e);
    }

    navigateToScreen('results');
  };

  const handleRetry = () => {
    if (resultsFromHistory) {
      navigateToScreen('quiz-history');
      setResultsFromHistory(false);
    } else {
      navigateToScreen('course-quiz');
    }
  };

  const handleNewCourse = () => {
    setResultsFromHistory(false);
    navigateToScreen('dashboard');
    setSelectedCourse('');
  };

  const handleOpenActivityFromDashboard = (activityId: string, type: 'speaking' | 'writing' | 'quiz') => {
    if (type === 'speaking') {
      setInitialSpeakingActivityId(activityId);
      navigateToScreen('speaking');
    } else if (type === 'writing') {
      setInitialWritingActivityId(activityId);
      navigateToScreen('writing');
    } else if (type === 'quiz') {
      const activities = getActivities();
      const activity = activities.find(a => a.id === activityId && a.type === 'quiz');
      if (activity) {
        const correct = activity.correctAnswers ?? 0;
        const total = activity.totalQuestions ?? activity.quizQuestions?.length ?? 0;
        setQuizResults({
          score: activity.score,
          totalQuestions: total || 1,
          correctAnswers: correct,
          timeSpent: activity.duration ?? 0,
          courseTitle: activity.courseTitle || activity.courseId || 'Quiz',
          questions: activity.quizQuestions,
          userAnswers: activity.quizUserAnswers,
          readingPassage: activity.quizReadingPassage,
          feedback: activity.quizFeedback,
        });
        setResultsFromHistory(false); // Dashboard'dan geldi -> Geri = Dashboard
        navigateToScreen('results');
      }
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Do you want to sign out?');
    if (confirmed) {
      onBack();
    }
  };

  const handleOpenNotification = (notif: AssignmentNotification) => {
    if (currentUser?.id) {
      markAllNotificationsRead(currentUser.id);
    } else {
      markNotificationRead(notif.id);
    }
    refreshNotifications();
    setNotificationPanelOpen(false);

    const assignment = getAssignment(notif.assignmentId);
    const type = notif.assignmentType || assignment?.type;
    const courseId = notif.courseId || assignment?.courseId;

    if (type === 'writing') {
      setInitialWritingAssignmentId(notif.assignmentId);
      setInitialWritingActivityId(null);
      navigateToScreen('writing');
      return;
    }
    if (type === 'listening') {
      setInitialListeningAssignmentId(notif.assignmentId);
      navigateToScreen('listening');
      return;
    }
    if (type === 'quiz' && courseId) {
      setInitialQuizAssignmentId(notif.assignmentId);
      handleCourseSelect(courseId);
      return;
    }
    if (type === 'speaking') {
      setInitialSpeakingAssignmentId(notif.assignmentId);
      navigateToScreen('speaking');
      return;
    }
    navigateToScreen('homework');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Combined Header and Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Back button (only during quiz), Logo and Navigation Tabs */}
            <div className="flex items-center gap-4 flex-1">
              {['course-quiz', 'results', 'quiz-history'].includes(currentScreen) && (
                <button
                  onClick={
                    currentScreen === 'results'
                      ? (resultsFromHistory ? () => navigateToScreen('quiz-history') : () => navigateToScreen('dashboard'))
                      : currentScreen === 'quiz-history'
                        ? () => navigateToScreen('quiz')
                        : handleBack
                  }
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('back')}
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateToScreen('dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
              >
                AssessAI
              </button>

              {/* Navigation Tabs - Only hide on quiz, placement */}
              {!['course-quiz', 'placement'].includes(currentScreen) && (
                <nav className="flex items-center justify-center flex-1 ml-6">
                  <div className="flex items-center w-full max-w-4xl gap-0">
                    {/* Dashboard */}
                    <button
                      onClick={() => navigateToScreen('dashboard')}
                      className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                        currentScreen === 'dashboard'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>{t('nav.dashboard')}</span>
                    </button>

                    {/* Progress */}
                    <button
                      onClick={() => navigateToScreen('progress')}
                      className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                        currentScreen === 'progress'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>{t('nav.progress')}</span>
                    </button>

                    {/* Study Plan Dropdown */}
                    <div
                      className="relative flex flex-1"
                    >
                      <button
                        onClick={() => setStudyPlanHovered(!studyPlanHovered)}
                        className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                          ['speaking', 'listening', 'writing', 'quiz'].includes(currentScreen)
                            ? 'text-purple-700 bg-purple-100'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>{t('nav.studyPlan')}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${studyPlanHovered ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {studyPlanHovered && (
                        <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50" style={{ marginTop: '34px' }}>
                          {[
                            { id: 'speaking', label: t('nav.speaking'), icon: Mic },
                            { id: 'listening', label: t('nav.listening'), icon: Headphones },
                            { id: 'writing', label: t('nav.writing'), icon: Edit },
                            { id: 'quiz', label: t('nav.quiz'), icon: Brain }
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                navigateToScreen(item.id as Screen);
                                setStudyPlanHovered(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                                currentScreen === item.id
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Homework */}
                    <button
                      onClick={() => navigateToScreen('homework')}
                      className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                        currentScreen === 'homework'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{t('nav.homework')}</span>
                    </button>

                    {/* Dictionary */}
                    <button
                      onClick={() => navigateToScreen('dictionary')}
                      className={`flex flex-1 items-center justify-center gap-1 px-2.5 py-2 text-sm font-medium transition-all relative rounded-lg ${
                        currentScreen === 'dictionary'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <BookMarked className="w-4 h-4" />
                      <span>{t('nav.dictionary')}</span>
                    </button>
                  </div>
                </nav>
              )}
            </div>

            {/* Right: Notification panel + Profile */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Bildirim paneli */}
              <div className="relative" data-notification-panel>
                <button
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className={`relative flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${
                    notificationPanelOpen
                      ? 'text-purple-700 bg-purple-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={t('nav.notificationCenter')}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
                {notificationPanelOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{t('nav.notificationCenter')}</h3>
                        {notifications.some(n => !n.readAt) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser?.id) markAllNotificationsRead(currentUser.id);
                              refreshNotifications();
                            }}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {t('nav.markAllRead')}
                          </button>
                        )}
                      </div>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-6">
                        <p className="text-sm text-gray-500 text-center">{t('nav.noNotifications')}</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 ${n.readAt ? 'bg-white' : 'bg-indigo-50/40'}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenNotification(n)}
                              className="flex-1 text-left"
                            >
                              <div className="text-sm font-semibold text-gray-900">
                                {t('nav.assignmentAssigned')}
                              </div>
                              <div className="text-xs text-gray-600 truncate">{n.assignmentTitle}</div>
                              <div className="text-[11px] text-gray-400 mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </div>
                            </button>
                            <div className="flex flex-col gap-1 text-xs shrink-0">
                              {!n.readAt && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markNotificationRead(n.id);
                                    refreshNotifications();
                                  }}
                                  className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  {t('nav.markRead')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  deleteNotification(n.id);
                                  refreshNotifications();
                                }}
                                className="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                              >
                                {t('nav.delete')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profil - nav bar temasıyla uyumlu */}
              <div className="relative" data-profile-dropdown>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`flex items-center justify-center gap-1 px-2.5 py-2.5 text-sm font-medium transition-all rounded-lg ${
                    currentScreen === 'profile'
                      ? 'text-purple-700 bg-purple-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={t('profile')}
                >
                  {currentUser?.avatar ? (
                    <div 
                      className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0"
                      style={{ backgroundImage: `url(${currentUser.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      role="img"
                      aria-label={currentUser.name}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </button>
              {/* Dropdown on click */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[200px]">
                    <button
                      onClick={() => {
                        navigateToScreen('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      <User className="w-4 h-4 shrink-0" />
                      {t('nav.viewProfile')}
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors whitespace-nowrap"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      {t('signOut')}
                    </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
         {currentScreen === 'dashboard' && (
           <ModernDashboard 
             userName={currentUser?.name || user?.name}
             cefrLevel={currentUser?.cefrLevel ?? null}
             recommendations={recommendations}
             onOpenActivity={handleOpenActivityFromDashboard}
             onRetakeTest={() => navigateToScreen('placement')}
             learningDifficulty={learningDifficulty}
             loadingDifficulty={loadingDifficulty}
             commonMistakes={commonMistakes}
             loadingCommonMistakes={loadingCommonMistakes}
          />
        )}
        {currentScreen === 'progress' && (
          <ProgressSection />
        )}
        {currentScreen === 'speaking' && (
          <SpeakingSection
            initialActivityId={initialSpeakingActivityId}
            assignmentId={initialSpeakingAssignmentId}
            onActivitySaved={handleActivitySaved}
          />
        )}
        {currentScreen === 'listening' && (
          <ListeningSection
            cefrLevel={currentUser?.cefrLevel ?? null}
            onActivitySaved={handleActivitySaved}
            assignmentId={initialListeningAssignmentId}
          />
        )}
        {currentScreen === 'writing' && (
          <WritingSection
            initialActivityId={initialWritingActivityId}
            assignmentId={initialWritingAssignmentId}
            onActivitySaved={handleActivitySaved}
          />
        )}
        {currentScreen === 'quiz' && (
          <QuizSection 
            onCourseSelect={handleCourseSelect} 
            cefrLevel={currentUser?.cefrLevel ?? null}
            onViewAllQuizzes={() => navigateToScreen('quiz-history')}
            initialQuizActivityId={initialQuizActivityId}
            onQuizClick={(quizId) => {
              const activities = getActivities();
              const activity = activities.find(a => a.id === quizId && a.type === 'quiz');
              if (activity) {
                const correct = activity.correctAnswers ?? 0;
                const total = activity.totalQuestions ?? activity.quizQuestions?.length ?? 0;
                setQuizResults({
                  score: activity.score,
                  totalQuestions: total || 1,
                  correctAnswers: correct,
                  timeSpent: activity.duration ?? 0,
                  courseTitle: activity.courseTitle || activity.courseId || 'Quiz',
                  questions: activity.quizQuestions,
                  userAnswers: activity.quizUserAnswers,
                  readingPassage: activity.quizReadingPassage,
                  feedback: activity.quizFeedback,
                });
                setResultsFromHistory(true);
                navigateToScreen('results');
              }
            }}
          />
        )}
        {currentScreen === 'homework' && (
          <HomeworkSection
            onStartAssignment={(assignmentId, type, courseId) => {
              if (type === 'writing') {
                setInitialWritingAssignmentId(assignmentId);
                setInitialWritingActivityId(null);
                navigateToScreen('writing');
              } else if (type === 'quiz' && courseId) {
                setInitialQuizAssignmentId(assignmentId);
                handleCourseSelect(courseId);
              } else if (type === 'speaking') {
                setInitialSpeakingActivityId(null);
                setInitialSpeakingAssignmentId(assignmentId);
                navigateToScreen('speaking');
              } else if (type === 'listening') {
                setInitialListeningAssignmentId(assignmentId);
                navigateToScreen('listening');
              } else {
                navigateToScreen('speaking');
              }
            }}
          />
        )}
        {currentScreen === 'dictionary' && (
          <DictionarySection />
        )}
        {currentScreen === 'placement' && currentUser && (
          <PlacementTest
            user={currentUser}
            isRetake
            onBack={() => navigateToScreen('dashboard')}
            onComplete={(cefrLevel) => {
              const u = getCurrentUser();
              if (u) updateUser(u.id, { cefrLevel, placementTestCompleted: true });
              setCurrentUser((prev) => prev ? { ...prev, cefrLevel, placementTestCompleted: true } : null);
              navigateToScreen('dashboard');
            }}
          />
        )}
        {currentScreen === 'course-quiz' && (() => {
          const quizCategory = quizCategories.find(cat => cat.courseId === selectedCourse);
          return (
            <QuizInterface
              courseId={selectedCourse}
              onComplete={handleQuizComplete}
              onBack={handleNewCourse}
              questionCount={quizCategory?.questions}
              duration={quizCategory?.duration}
              cefrLevel={currentUser?.cefrLevel ?? null}
            />
          );
        })()}
        {currentScreen === 'results' && quizResults && (
          <ResultsScreen
            results={quizResults}
            onRetry={handleRetry}
            onNewCourse={handleNewCourse}
            onBack={resultsFromHistory ? () => navigateToScreen('quiz-history') : () => navigateToScreen('dashboard')}
          />
        )}
        {currentScreen === 'profile' && currentUser && (
          <ProfilePage 
            user={currentUser} 
            onLogout={onBack}
            onUpdateUser={setCurrentUser}
          />
        )}
        {currentScreen === 'quiz-history' && (
          <QuizHistory 
            onBack={() => navigateToScreen('quiz')}
            onQuizClick={(quizId) => {
              const activities = getActivities();
              const activity = activities.find(a => a.id === quizId && a.type === 'quiz');
              if (activity) {
                const correct = activity.correctAnswers ?? 0;
                const total = activity.totalQuestions ?? activity.quizQuestions?.length ?? 0;
                setQuizResults({
                  score: activity.score,
                  totalQuestions: total || 1,
                  correctAnswers: correct,
                  timeSpent: activity.duration ?? 0,
                  courseTitle: activity.courseTitle || activity.courseId || 'Quiz',
                  questions: activity.quizQuestions,
                  userAnswers: activity.quizUserAnswers,
                  readingPassage: activity.quizReadingPassage,
                  feedback: activity.quizFeedback,
                });
                setResultsFromHistory(true);
                navigateToScreen('results');
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
