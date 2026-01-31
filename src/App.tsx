import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthPage } from './components/auth-page';
import { LandingPage } from './components/landing-page';
import { AssessmentPlatform } from './components/assessment-platform';
import { InstructorPlatform } from './components/instructor-platform';
import { PlacementTest } from './components/placement-test';
import { getCurrentUser, logout, updateUser, type User, type UserRole, type CEFRLevel } from './lib/auth';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'placement' | 'platform'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      
      // Öğrenci ise ve placement test tamamlanmamışsa, placement test sayfasına yönlendir
      if (user.role === 'student' && !user.placementTestCompleted) {
        setCurrentPage('placement');
        return;
      }
    }

    // Son ziyaret edilen ana sayfayı (landing/auth/placement/platform) geri yükle
    try {
      const savedPage = localStorage.getItem('assessai_current_page');
      const allowedPages: Array<'landing' | 'auth' | 'placement' | 'platform'> = [
        'landing',
        'auth',
        'placement',
        'platform',
      ];

      if (savedPage && allowedPages.includes(savedPage as any)) {
        // Kullanıcı yoksa, korumalı sayfalara otomatik gitme
        if (!user && (savedPage === 'placement' || savedPage === 'platform')) {
          setCurrentPage('landing');
        } 
        // Öğrenci ise ve placement test tamamlanmamışsa, placement test sayfasına yönlendir
        else if (user && user.role === 'student' && !user.placementTestCompleted) {
          setCurrentPage('placement');
        } 
        else {
          setCurrentPage(savedPage as any);
        }
      }
    } catch {
      // localStorage erişilemezse varsayılan landing'de kal
    }
  }, []);

  // Her sayfa değiştiğinde son konumu kaydet
  useEffect(() => {
    try {
      localStorage.setItem('assessai_current_page', currentPage);
    } catch {
      // Sessizce yoksay
    }
  }, [currentPage]);

  const handleAuthSuccess = (userId: string, role: UserRole) => {
    // Login olduktan sonra dashboard'da başlamak için
    // önce son ziyaret edilen platform sekmesini temizliyoruz
    try {
      localStorage.removeItem('assessai_current_screen');
    } catch {
      // localStorage erişilemezse sessizce devam et
    }

    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      
      // Öğrenci ise ve placement test tamamlanmamışsa, önce placement test sayfasına yönlendir
      if (role === 'student' && !user.placementTestCompleted) {
        setCurrentPage('placement');
      } else {
        // Diğer durumlarda (instructor, admin veya placement test tamamlanmış öğrenci) platform'a git
        setCurrentPage('platform');
      }
    }
  };

  const handlePlacementComplete = (cefrLevel: CEFRLevel) => {
    const user = getCurrentUser();
    if (user) {
      // Kullanıcı bilgisini localStorage'da güncelle
      updateUser(user.id, { cefrLevel, placementTestCompleted: true });
      // State'i de güncelle
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    }
    // Placement test tamamlandıktan sonra platform'a yönlendir
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
      {currentUser?.role === 'instructor' ? (
        <InstructorPlatform onBack={handleBackToLanding} user={currentUser} />
      ) : (
        <AssessmentPlatform onBack={handleBackToLanding} user={currentUser} />
      )}
      <Toaster position="top-right" richColors />
    </>
  );
}