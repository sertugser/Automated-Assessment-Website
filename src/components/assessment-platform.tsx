import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Trophy, Zap, Target, User, LogOut, Home, 
  BarChart3, Mic, Edit, Brain, BookOpen, MessageSquare, Headphones,
  FileText, Briefcase, GraduationCap
} from 'lucide-react';
import { ModernDashboard } from './modern-dashboard';
import { ProgressSection } from './progress-section';
import { SpeakingSection } from './speaking-section';
import { ListeningSection } from './listening-section';
import { WritingSection } from './writing-section';
import { QuizSection, quizCategories } from './quiz-section';
import { QuizHistory } from './quiz-history';
import { QuizDetail } from './quiz-detail';
import { PlacementTest } from './placement-test';
import { QuizInterface } from './quiz-interface';
import { ResultsScreen } from './results-screen';
import { ProfilePage } from './profile-page';
import { type User as UserType, updateUser, getCurrentUser } from '../lib/auth';
import { getUserStats, getRecentActivities, saveActivity, analyzeUserWeaknesses, getActivitiesByType, type UserActivity } from '../lib/user-progress';
import { generatePersonalizedRecommendations } from '../lib/ai-services';
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

export type Screen = 'dashboard' | 'progress' | 'speaking' | 'listening' | 'writing' | 'quiz' | 'placement' | 'course-quiz' | 'results' | 'profile' | 'quiz-history' | 'quiz-detail';

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
  const [initialSpeakingActivityId, setInitialSpeakingActivityId] = useState<string | null>(null);
  const [initialWritingActivityId, setInitialWritingActivityId] = useState<string | null>(null);
  const [initialQuizActivityId, setInitialQuizActivityId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Persist last visited screen so refresh returns the user to the same tab
  useEffect(() => {
    const saved = localStorage.getItem('assessai_current_screen') as Screen | null;
    if (saved && typeof saved === 'string') {
      const allowed: Screen[] = ['dashboard', 'progress', 'speaking', 'listening', 'writing', 'quiz', 'quiz-history', 'profile'];
      if (allowed.includes(saved)) {
        setCurrentScreen(saved);
        setScreenHistory([saved]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('assessai_current_screen', currentScreen);
  }, [currentScreen]);

  // Load AI-generated recommendations
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

    loadRecommendations();
    
    // Refresh recommendations when screen or CEFR changes
    const interval = setInterval(() => {
      if (currentScreen === 'dashboard') loadRecommendations();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentScreen, currentUser?.cefrLevel]);

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
    navigateToScreen('course-quiz');
  };

  const handleNewCourse = () => {
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
      setSelectedQuizId(activityId);
      navigateToScreen('quiz-detail');
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
              {currentScreen === 'course-quiz' && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">AssessAI</span>
              </div>
              
              {/* Navigation Tabs - Only show when not in course-quiz or results */}
              {!['course-quiz', 'results', 'profile', 'placement'].includes(currentScreen) && (
                <nav className="flex items-center justify-center flex-1 ml-6">
                  <div className="flex items-center w-full max-w-3xl">
                  {[
                    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
                    { id: 'progress', label: t('nav.progress'), icon: BarChart3 },
                    { id: 'speaking', label: t('nav.speaking'), icon: Mic },
                    { id: 'listening', label: t('nav.listening'), icon: Headphones },
                    { id: 'writing', label: t('nav.writing'), icon: Edit },
                    { id: 'quiz', label: t('nav.quiz'), icon: Brain }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => navigateToScreen(tab.id as Screen)}
                      className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 font-medium transition-all relative rounded-lg ${
                        currentScreen === tab.id
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                  </div>
                </nav>
              )}
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-2">
              {/* Profile Button */}
              <button
                onClick={() => navigateToScreen('profile')}
                className={`p-2 rounded-lg transition-all ${
                  currentScreen === 'profile' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={t('profile')}
              >
                <User className="w-5 h-5" />
              </button>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg transition-all hover:bg-red-50 text-gray-600 hover:text-red-600"
                title={t('signOut')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {currentScreen === 'dashboard' && (
          <ModernDashboard 
            userName={user?.name}
            cefrLevel={currentUser?.cefrLevel ?? null}
            onRetakePlacement={() => navigateToScreen('placement')}
            recommendations={recommendations}
            onOpenActivity={handleOpenActivityFromDashboard}
          />
        )}
        {currentScreen === 'progress' && (
          <ProgressSection />
        )}
        {currentScreen === 'speaking' && (
          <SpeakingSection initialActivityId={initialSpeakingActivityId} />
        )}
        {currentScreen === 'listening' && (
          <ListeningSection />
        )}
        {currentScreen === 'writing' && (
          <WritingSection initialActivityId={initialWritingActivityId} />
        )}
        {currentScreen === 'quiz' && (
          <QuizSection 
            onCourseSelect={handleCourseSelect} 
            cefrLevel={currentUser?.cefrLevel ?? null}
            onViewAllQuizzes={() => navigateToScreen('quiz-history')}
            initialQuizActivityId={initialQuizActivityId}
            onQuizClick={(quizId) => {
              setSelectedQuizId(quizId);
              navigateToScreen('quiz-detail');
            }}
          />
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
              setSelectedQuizId(quizId);
              navigateToScreen('quiz-detail');
            }}
          />
        )}
        {currentScreen === 'quiz-detail' && selectedQuizId && (
          <QuizDetail 
            quizId={selectedQuizId}
            onBack={() => navigateToScreen('quiz-history')}
          />
        )}
        {currentScreen === 'quiz-detail' && selectedQuizId && (
          <QuizDetail 
            quizId={selectedQuizId}
            onBack={() => navigateToScreen('quiz-history')}
          />
        )}
      </main>
    </div>
  );
}