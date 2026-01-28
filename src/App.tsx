import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthPage } from './components/auth-page';
import { LandingPage } from './components/landing-page';
import { AssessmentPlatform } from './components/assessment-platform';
import { PlacementTest } from './components/placement-test';
import { getCurrentUser, logout, type User, type UserRole, type CEFRLevel } from './lib/auth';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'placement' | 'platform'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentPage(user.placementTestCompleted ? 'platform' : 'placement');
    }
  }, []);

  const handleAuthSuccess = (userId: string, role: UserRole) => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentPage(user.placementTestCompleted ? 'platform' : 'placement');
    }
  };

  const handlePlacementComplete = (cefrLevel: CEFRLevel) => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser({ ...user, cefrLevel, placementTestCompleted: true });
    }
    setCurrentPage('platform');
  };

  const handleGetStarted = () => {
    setCurrentPage('auth');
  };

  const handleBackToLanding = () => {
    logout();
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  const handleBackFromAuth = () => {
    setCurrentPage('landing');
  };

  if (currentPage === 'landing') {
    return (
      <>
        <LandingPage onGetStarted={handleGetStarted} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (currentPage === 'auth') {
    return (
      <>
        <AuthPage onAuthSuccess={handleAuthSuccess} onBack={handleBackFromAuth} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (currentPage === 'placement' && currentUser) {
    return (
      <>
        <PlacementTest
          user={currentUser}
          onComplete={handlePlacementComplete}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <AssessmentPlatform onBack={handleBackToLanding} user={currentUser} />
      <Toaster position="top-right" richColors />
    </>
  );
}