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
import { PlacementTest } from './placement-test';
import { QuizInterface } from './quiz-interface';
import { ResultsScreen } from './results-screen';
import { ProfilePage } from './profile-page';
import { type User as UserType, updateUser, getCurrentUser } from '../lib/auth';
import { getUserStats, getRecentActivities, saveActivity, analyzeUserWeaknesses } from '../lib/user-progress';
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

export type Screen = 'dashboard' | 'progress' | 'speaking' | 'listening' | 'writing' | 'quiz' | 'placement' | 'course-quiz' | 'results' | 'profile' | 'quiz-history';

export interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  courseTitle: string;
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

  const handleLogout = () => {
    const confirmed = window.confirm('Do you want to sign out?');
    if (confirmed) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <img src={logo} alt="AssessAI Logo" className="w-10 h-10" />
                <span className="text-xl font-bold text-gray-900">AssessAI</span>
              </div>
            </div>

            {/* User Actions */}
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

      {/* Navigation Tabs - Only show when not in course-quiz or results */}
      {!['course-quiz', 'results', 'profile', 'placement'].includes(currentScreen) && (
        <nav className="bg-white border-b border-gray-200 sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
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
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                    currentScreen === tab.id
                      ? 'text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {currentScreen === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main>
        {currentScreen === 'dashboard' && (
          <ModernDashboard 
            userName={user?.name}
            cefrLevel={currentUser?.cefrLevel ?? null}
            onRetakePlacement={() => navigateToScreen('placement')}
            recommendations={recommendations}
          />
        )}
        {currentScreen === 'progress' && (
          <ProgressSection />
        )}
        {currentScreen === 'speaking' && (
          <SpeakingSection />
        )}
        {currentScreen === 'listening' && (
          <ListeningSection />
        )}
        {currentScreen === 'writing' && (
          <WritingSection />
        )}
        {currentScreen === 'quiz' && (
          <QuizSection 
            onCourseSelect={handleCourseSelect} 
            cefrLevel={currentUser?.cefrLevel ?? null}
            onViewAllQuizzes={() => navigateToScreen('quiz-history')}
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
          <QuizHistory onBack={() => navigateToScreen('quiz')} />
        )}
      </main>
    </div>
  );
}