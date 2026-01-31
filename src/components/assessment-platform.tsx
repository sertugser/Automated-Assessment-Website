import { useState, useEffect } from 'react';
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
import { generatePersonalizedRecommendations, getLearningDifficultyAnalysis, type LearningDifficultyAnalysis } from '../lib/ai-services';
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
  const [initialSpeakingActivityId, setInitialSpeakingActivityId] = useState<string | null>(null);
  const [initialWritingActivityId, setInitialWritingActivityId] = useState<string | null>(null);
  const [initialWritingAssignmentId, setInitialWritingAssignmentId] = useState<string | null>(null);
  const [initialQuizActivityId, setInitialQuizActivityId] = useState<string | null>(null);
  const [initialQuizAssignmentId, setInitialQuizAssignmentId] = useState<string | null>(null);
  const [resultsFromHistory, setResultsFromHistory] = useState(false);
  const [studyPlanHovered, setStudyPlanHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [difficultyRefreshTrigger, setDifficultyRefreshTrigger] = useState(0);

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

  // Load AI-generated recommendations and learning difficulty analysis
  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
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
      } catch (error) {
        console.error('Error loading recommendations:', error);
        // Fallback to default recommendations
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
      setLoadingDifficulty(true);
      try {
        const stats = getUserStats();
        const recentActivities = getRecentActivities(10);
        const weaknessAnalysis = analyzeUserWeaknesses();
        const mistakeCounts = getMistakeCountsByTopic();
        const wrongAnswerDetails = getWrongAnswerDetails(20);
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
      } catch (error) {
        console.error('Error loading learning difficulty analysis:', error);
        setLearningDifficulty(null);
      } finally {
        setLoadingDifficulty(false);
      }
    };

    loadRecommendations();
    loadDifficultyAnalysis();
    
    // Refresh recommendations and difficulty analysis when on dashboard
    const interval = setInterval(() => {
      if (currentScreen === 'dashboard') {
        loadRecommendations();
        loadDifficultyAnalysis();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentScreen, currentUser?.cefrLevel, difficultyRefreshTrigger]);

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

  const handleQuizComplete = (results: QuizResult) => {
    setResultsFromHistory(false);
    setQuizResults(results);

    // Generate simple feedback based on results
    const feedback = {
      strongAreas: results.score >= 70 ? 'You demonstrated excellent understanding of core concepts. Your response time shows confidence in the material.' : '',
      areasForImprovement: results.score < 90 ? 'Review advanced topics and practice more challenging questions to reach mastery level.' : '',
      recommendation: results.score >= 90 
        ? 'Try an advanced course to continue challenging yourself!'
        : 'Review the material and retry to improve your score. Practice makes perfect!',
    };

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
      setDifficultyRefreshTrigger(prev => prev + 1);
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
                  className={`flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium transition-all rounded-lg ${
                    notificationPanelOpen
                      ? 'text-purple-700 bg-purple-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={t('nav.notificationCenter')}
                >
                  <Bell className="w-5 h-5" />
                </button>
                {notificationPanelOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">{t('nav.notificationCenter')}</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-gray-500 text-center">{t('nav.noNotifications')}</p>
                    </div>
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
          />
        )}
        {currentScreen === 'progress' && (
          <ProgressSection />
        )}
        {currentScreen === 'speaking' && (
          <SpeakingSection initialActivityId={initialSpeakingActivityId} />
        )}
        {currentScreen === 'listening' && (
          <ListeningSection cefrLevel={currentUser?.cefrLevel ?? null} />
        )}
        {currentScreen === 'writing' && (
          <WritingSection
            initialActivityId={initialWritingActivityId}
            assignmentId={initialWritingAssignmentId}
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
                navigateToScreen('speaking');
              } else {
                navigateToScreen(type === 'writing' ? 'writing' : type === 'quiz' ? 'quiz' : 'speaking');
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