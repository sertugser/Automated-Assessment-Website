// User Progress Tracking System
// Stores and calculates real user statistics

export interface UserActivity {
  id: string;
  type: 'quiz' | 'writing' | 'speaking';
  score: number;
  date: string; // ISO date string
  courseId?: string;
  courseTitle?: string;
  wordCount?: number; // For writing activities
  duration?: number; // For speaking activities (in seconds)
  correctAnswers?: number; // For quiz activities
  totalQuestions?: number; // For quiz activities
  cefrLevel?: string; // CEFR level when quiz was taken
  // Optional extra data for writing activities
  essayText?: string;
  correctedText?: string;
  // Optional saved analysis payloads (so Recent Essays can restore results without re-analyzing)
  writingSimpleAnalysis?: any;
  writingDetailedFeedback?: any;
}

export interface UserStats {
  level: number;
  streak: number;
  totalPoints: number;
  averageScore: number;
  totalActivities: number;
  lastActivityDate: string | null;
}

const STORAGE_KEY = 'user_progress_activities';
const STREAK_KEY = 'user_streak_data';

/**
 * Save user activity (quiz, writing, or speaking result)
 */
export const saveActivity = (activity: Omit<UserActivity, 'id' | 'date'>): void => {
  const activities = getActivities();
  const newActivity: UserActivity = {
    ...activity,
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString(),
  };
  
  activities.push(newActivity);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  
  // Update streak
  updateStreak();
};

/**
 * Get all user activities
 */
export const getActivities = (): UserActivity[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Calculate user level based on total points
 * Level formula: sqrt(points / 50) + 1, rounded down
 */
export const calculateLevel = (totalPoints: number): number => {
  if (totalPoints <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(totalPoints / 50) + 1));
};

/**
 * Calculate total points from activities
 * Points formula:
 * - Quiz: score * 10 (e.g., 85% = 850 points)
 * - Writing: score * 15 (e.g., 90% = 1350 points)
 * - Speaking: score * 12 (e.g., 80% = 960 points)
 */
export const calculateTotalPoints = (activities: UserActivity[]): number => {
  return activities.reduce((total, activity) => {
    let points = 0;
    switch (activity.type) {
      case 'quiz':
        points = activity.score * 10;
        break;
      case 'writing':
        points = activity.score * 15;
        break;
      case 'speaking':
        points = activity.score * 12;
        break;
    }
    return total + points;
  }, 0);
};

/**
 * Calculate average score from all activities
 */
export const calculateAverageScore = (activities: UserActivity[]): number => {
  if (activities.length === 0) return 0;
  const sum = activities.reduce((total, activity) => total + activity.score, 0);
  return Math.round(sum / activities.length);
};

/**
 * Calculate current streak (consecutive days with activity)
 */
export const calculateStreak = (activities: UserActivity[]): number => {
  if (activities.length === 0) return 0;
  
  // Sort activities by date (newest first)
  const sorted = [...activities].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Get streak data from localStorage
  const streakData = getStreakData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivityDate = sorted[0] ? new Date(sorted[0].date) : null;
  if (!lastActivityDate) return 0;
  
  lastActivityDate.setHours(0, 0, 0, 0);
  
  // If last activity was today or yesterday, continue streak
  const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Activity today - check if we should continue or start new streak
    return streakData.currentStreak > 0 ? streakData.currentStreak : 1;
  } else if (daysDiff === 1) {
    // Activity yesterday - continue streak
    return streakData.currentStreak > 0 ? streakData.currentStreak + 1 : 1;
  } else {
    // Gap in streak - reset to 1 if activity was today, otherwise 0
    return daysDiff === 0 ? 1 : 0;
  }
};

/**
 * Update streak data
 */
const updateStreak = (): void => {
  const activities = getActivities();
  const streak = calculateStreak(activities);
  const today = new Date().toISOString().split('T')[0];
  
  const streakData = {
    currentStreak: streak,
    lastActivityDate: today,
    longestStreak: Math.max(streak, getStreakData().longestStreak),
  };
  
  localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
};

/**
 * Get streak data from localStorage
 */
const getStreakData = (): { currentStreak: number; lastActivityDate: string | null; longestStreak: number } => {
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Check if streak should be reset (more than 1 day gap)
      const lastDate = data.lastActivityDate ? new Date(data.lastActivityDate) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
          // Streak broken
          return { currentStreak: 0, lastActivityDate: null, longestStreak: data.longestStreak || 0 };
        }
      }
      
      return data;
    }
  } catch {
    // Ignore errors
  }
  
  return { currentStreak: 0, lastActivityDate: null, longestStreak: 0 };
};

/**
 * Get comprehensive user statistics
 */
export const getUserStats = (userId?: string): UserStats => {
  const activities = getActivities();
  
  // Filter by userId if provided (for future multi-user support)
  const userActivities = userId 
    ? activities.filter(a => (a as any).userId === userId)
    : activities;
  
  const totalPoints = calculateTotalPoints(userActivities);
  const level = calculateLevel(totalPoints);
  const averageScore = calculateAverageScore(userActivities);
  const streak = calculateStreak(userActivities);
  
  const lastActivity = userActivities.length > 0
    ? [...userActivities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  
  return {
    level,
    streak,
    totalPoints,
    averageScore,
    totalActivities: userActivities.length,
    lastActivityDate: lastActivity?.date || null,
  };
};

/**
 * Get recent activities (last N activities)
 */
export const getRecentActivities = (limit: number = 5): UserActivity[] => {
  const activities = getActivities();
  return [...activities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

/**
 * Get activities by type
 */
export const getActivitiesByType = (type: 'quiz' | 'writing' | 'speaking'): UserActivity[] => {
  return getActivities().filter(a => a.type === type);
};

/**
 * Get writing statistics
 */
export const getWritingStats = () => {
  const writingActivities = getActivitiesByType('writing');
  const totalEssays = writingActivities.length;
  const avgScore = totalEssays > 0 
    ? Math.round(writingActivities.reduce((sum, a) => sum + a.score, 0) / totalEssays)
    : 0;
  
  // Calculate total words from actual word counts or estimate
  const totalWords = writingActivities.reduce((sum, a) => {
    return sum + (a.wordCount || 150); // Use actual word count or default to 150
  }, 0);
  
  return {
    totalEssays,
    avgScore,
    totalWords,
  };
};

/**
 * Get speaking statistics
 */
export const getSpeakingStats = () => {
  const speakingActivities = getActivitiesByType('speaking');
  const totalRecordings = speakingActivities.length;
  
  // Calculate average pronunciation score (using overall score as proxy)
  const avgPronunciation = totalRecordings > 0
    ? Math.round(speakingActivities.reduce((sum, a) => sum + a.score, 0) / totalRecordings)
    : 0;
  
  // Estimate speaking time (average 2 minutes per recording)
  const totalMinutes = totalRecordings * 2;
  
  // Calculate average fluency (using overall score as proxy)
  const avgFluency = avgPronunciation;
  
  return {
    totalRecordings,
    avgPronunciation,
    totalMinutes,
    avgFluency,
  };
};

/**
 * Get quiz statistics
 */
export const getQuizStats = () => {
  const quizActivities = getActivitiesByType('quiz');
  const totalQuizzes = quizActivities.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(quizActivities.reduce((sum, a) => sum + a.score, 0) / totalQuizzes)
    : 0;
  
  const bestScore = quizActivities.length > 0
    ? Math.max(...quizActivities.map(a => a.score))
    : 0;
  
  const perfectScores = quizActivities.filter(a => a.score === 100).length;
  
  return {
    totalQuizzes,
    avgScore,
    bestScore,
    perfectScores,
  };
};

/**
 * Get quiz statistics by course
 */
export const getQuizStatsByCourse = () => {
  const quizActivities = getActivitiesByType('quiz');
  const courseStats: Record<string, { 
    completed: boolean; 
    bestScore: number; 
    attempts: number;
    lastAttempt?: string;
  }> = {};
  
  quizActivities.forEach(activity => {
    const courseId = activity.courseId || activity.courseTitle || 'unknown';
    if (!courseStats[courseId]) {
      courseStats[courseId] = {
        completed: false,
        bestScore: 0,
        attempts: 0,
      };
    }
    
    courseStats[courseId].completed = true;
    courseStats[courseId].bestScore = Math.max(courseStats[courseId].bestScore, activity.score);
    courseStats[courseId].attempts += 1;
    
    if (!courseStats[courseId].lastAttempt || activity.date > courseStats[courseId].lastAttempt!) {
      courseStats[courseId].lastAttempt = activity.date;
    }
  });
  
  return courseStats;
};

/**
 * Get recent quiz activities
 */
export const getRecentQuizzes = (limit: number = 5) => {
  const quizActivities = getActivitiesByType('quiz');
  return [...quizActivities]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map(activity => ({
      id: activity.id,
      title: activity.courseTitle || 'Quiz',
      date: activity.date,
      score: activity.score,
    }));
};

/**
 * Get weekly progress data (last 7 days)
 */
export const getWeeklyProgressData = () => {
  const activities = getActivities();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate last 7 days including today
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === date.getTime();
    });
    
    // Lessons completed count (all activity types)
    const lessonsCompleted = dayActivities.length;
    
    // Average score for the day (only if there are activities)
    const averageScore = dayActivities.length > 0
      ? Math.round(dayActivities.reduce((sum, a) => sum + a.score, 0) / dayActivities.length)
      : 0;
    
    // Get day name abbreviation
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    
    weeklyData.push({
      day: dayName,
      lessonsCompleted,
      averageScore,
    });
  }
  
  return weeklyData;
};

/**
 * Get monthly completion data (last 6 months)
 */
export const getMonthlyData = () => {
  const activities = getActivities();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Generate last 6 months including current month
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    const monthActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      return activityDate.getMonth() === monthIndex && activityDate.getFullYear() === year;
    });
    
    monthlyData.push({
      month: months[monthIndex],
      completed: monthActivities.length,
    });
  }
  
  return monthlyData;
};

/**
 * Get skills breakdown from activities
 * Each skill is calculated ONLY from activities specific to that skill
 * If no activities exist for a skill, it shows 0%
 */
export const getSkillsBreakdown = () => {
  const activities = getActivities();
  
  // Group by activity type
  const quizActivities = getActivitiesByType('quiz');
  const writingActivities = getActivitiesByType('writing');
  const speakingActivities = getActivitiesByType('speaking');
  
  // Helper function to calculate average
  const calculateAvg = (acts: UserActivity[]) => 
    acts.length > 0 ? Math.round(acts.reduce((sum, a) => sum + a.score, 0) / acts.length) : 0;
  
  // Grammar: ONLY grammar-related quizzes (no fallback to other activities)
  const grammarQuizzes = quizActivities.filter(a => {
    const courseId = (a.courseId || '').toLowerCase();
    const courseTitle = (a.courseTitle || '').toLowerCase();
    return courseId.includes('grammar') || courseTitle.includes('grammar');
  });
  const grammarScore = grammarQuizzes.length > 0 ? calculateAvg(grammarQuizzes) : 0;
  
  // Vocabulary: ONLY vocabulary-related quizzes (no fallback)
  const vocabQuizzes = quizActivities.filter(a => {
    const courseId = (a.courseId || '').toLowerCase();
    const courseTitle = (a.courseTitle || '').toLowerCase();
    return courseId.includes('vocabulary') || courseTitle.includes('vocabulary');
  });
  const vocabScore = vocabQuizzes.length > 0 ? calculateAvg(vocabQuizzes) : 0;
  
  // Reading: ONLY reading comprehension quizzes (no fallback)
  const readingQuizzes = quizActivities.filter(a => {
    const courseId = (a.courseId || '').toLowerCase();
    const courseTitle = (a.courseTitle || '').toLowerCase();
    return courseId.includes('reading') || courseTitle.includes('reading');
  });
  const readingScore = readingQuizzes.length > 0 ? calculateAvg(readingQuizzes) : 0;
  
  // Listening: ONLY listening quizzes (no fallback)
  const listeningQuizzes = quizActivities.filter(a => {
    const courseId = (a.courseId || '').toLowerCase();
    const courseTitle = (a.courseTitle || '').toLowerCase();
    return courseId.includes('listening') || courseTitle.includes('listening');
  });
  const listeningScore = listeningQuizzes.length > 0 ? calculateAvg(listeningQuizzes) : 0;
  
  // Speaking: ONLY from speaking activities
  const speakingScore = speakingActivities.length > 0 ? calculateAvg(speakingActivities) : 0;
  
  // Writing: ONLY from writing activities
  const writingScore = writingActivities.length > 0 ? calculateAvg(writingActivities) : 0;
  
  return [
    { name: 'Grammar', value: grammarScore, color: '#3b82f6' },
    { name: 'Vocabulary', value: vocabScore, color: '#10b981' },
    { name: 'Reading', value: readingScore, color: '#8b5cf6' },
    { name: 'Listening', value: listeningScore, color: '#f59e0b' },
    { name: 'Speaking', value: speakingScore, color: '#ec4899' },
    { name: 'Writing', value: writingScore, color: '#6366f1' },
  ];
};

/**
 * Get activity type distribution (for pie chart)
 */
export const getActivityTypeDistribution = () => {
  const activities = getActivities();
  
  if (activities.length === 0) {
    return [
      { name: 'Quiz', value: 0, color: '#3b82f6' },
      { name: 'Writing', value: 0, color: '#6366f1' },
      { name: 'Speaking', value: 0, color: '#ec4899' },
    ];
  }
  
  const quizCount = activities.filter(a => a.type === 'quiz').length;
  const writingCount = activities.filter(a => a.type === 'writing').length;
  const speakingCount = activities.filter(a => a.type === 'speaking').length;
  
  const total = activities.length;
  
  return [
    { 
      name: 'Quiz', 
      value: total > 0 ? Math.round((quizCount / total) * 100) : 0, 
      color: '#3b82f6' 
    },
    { 
      name: 'Writing', 
      value: total > 0 ? Math.round((writingCount / total) * 100) : 0, 
      color: '#6366f1' 
    },
    { 
      name: 'Speaking', 
      value: total > 0 ? Math.round((speakingCount / total) * 100) : 0, 
      color: '#ec4899' 
    },
  ];
};

/**
 * Analyze user weaknesses and areas that need improvement
 */
export interface WeaknessAnalysis {
  weakAreas: Array<{
    skill: string;
    score: number;
    recommendation: string;
  }>;
  weakQuizTopics: Array<{
    topic: string;
    avgScore: number;
    attempts: number;
  }>;
  improvementSuggestions: string[];
}

export const analyzeUserWeaknesses = (): WeaknessAnalysis => {
  const activities = getActivities();
  const quizActivities = getActivitiesByType('quiz');
  const writingActivities = getActivitiesByType('writing');
  const speakingActivities = getActivitiesByType('speaking');
  
  // Calculate skill scores
  const skillsBreakdown = getSkillsBreakdown();
  
  // Identify weak areas (score < 70)
  const weakAreas = skillsBreakdown
    .filter(skill => skill.value < 70 && skill.value > 0)
    .map(skill => {
      let recommendation = '';
      switch (skill.name) {
        case 'Grammar':
          recommendation = 'Focus on grammar exercises and quizzes to improve your understanding of English grammar rules.';
          break;
        case 'Vocabulary':
          recommendation = 'Practice vocabulary building exercises and learn new words daily to expand your word bank.';
          break;
        case 'Reading':
          recommendation = 'Practice reading comprehension exercises and read English texts regularly to improve understanding.';
          break;
        case 'Listening':
          recommendation = 'Listen to English audio materials and practice listening comprehension exercises.';
          break;
        case 'Speaking':
          recommendation = 'Practice speaking exercises regularly to improve pronunciation and fluency.';
          break;
        case 'Writing':
          recommendation = 'Write more essays and practice writing exercises to improve grammar, vocabulary, and coherence.';
          break;
        default:
          recommendation = `Focus on improving your ${skill.name.toLowerCase()} skills through targeted practice.`;
      }
      
      return {
        skill: skill.name,
        score: skill.value,
        recommendation,
      };
    })
    .sort((a, b) => a.score - b.score); // Sort by weakest first
  
  // Analyze quiz performance by topic
  const quizByTopic: Record<string, { scores: number[]; attempts: number }> = {};
  quizActivities.forEach(activity => {
    const topic = activity.courseTitle || activity.courseId || 'General';
    if (!quizByTopic[topic]) {
      quizByTopic[topic] = { scores: [], attempts: 0 };
    }
    quizByTopic[topic].scores.push(activity.score);
    quizByTopic[topic].attempts += 1;
  });
  
  const weakQuizTopics = Object.entries(quizByTopic)
    .map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
      attempts: data.attempts,
    }))
    .filter(topic => topic.avgScore < 70)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5); // Top 5 weakest topics
  
  // Generate improvement suggestions
  const improvementSuggestions: string[] = [];
  
  if (weakAreas.length > 0) {
    const weakestSkill = weakAreas[0];
    improvementSuggestions.push(`Your ${weakestSkill.skill} score is ${weakestSkill.score}%. ${weakestSkill.recommendation}`);
  }
  
  if (weakQuizTopics.length > 0) {
    const weakestTopic = weakQuizTopics[0];
    improvementSuggestions.push(`You scored ${weakestTopic.avgScore}% on "${weakestTopic.topic}" quizzes. Consider reviewing this topic and practicing more.`);
  }
  
  if (writingActivities.length === 0) {
    improvementSuggestions.push('You haven\'t completed any writing exercises yet. Try writing exercises to improve your grammar and vocabulary.');
  } else {
    const avgWritingScore = Math.round(writingActivities.reduce((sum, a) => sum + a.score, 0) / writingActivities.length);
    if (avgWritingScore < 70) {
      improvementSuggestions.push(`Your writing average is ${avgWritingScore}%. Practice more writing exercises to improve grammar, vocabulary, and coherence.`);
    }
  }
  
  if (speakingActivities.length === 0) {
    improvementSuggestions.push('You haven\'t completed any speaking exercises yet. Practice speaking to improve pronunciation and fluency.');
  } else {
    const avgSpeakingScore = Math.round(speakingActivities.reduce((sum, a) => sum + a.score, 0) / speakingActivities.length);
    if (avgSpeakingScore < 70) {
      improvementSuggestions.push(`Your speaking average is ${avgSpeakingScore}%. Practice more speaking exercises to improve pronunciation and fluency.`);
    }
  }
  
  if (quizActivities.length === 0) {
    improvementSuggestions.push('Start taking quizzes to assess your knowledge and identify areas for improvement.');
  }
  
  return {
    weakAreas,
    weakQuizTopics,
    improvementSuggestions,
  };
};

/**
 * Achievement definitions
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Icon name for display
  color: string; // Gradient color classes
  unlocked: boolean;
  progress: number; // 0-100
  requirement: number; // Target value
  current: number; // Current value
}

/**
 * Get user achievements based on their progress
 */
export const getAchievements = (): Achievement[] => {
  const stats = getUserStats();
  const activities = getActivities();
  const quizActivities = getActivitiesByType('quiz');
  const writingActivities = getActivitiesByType('writing');
  const speakingActivities = getActivitiesByType('speaking');
  
  // Calculate achievement progress
  const achievements: Achievement[] = [
    {
      id: 'streak-7',
      title: '7-Day Streak',
      description: 'Complete 7 days in a row',
      icon: 'Flame',
      color: 'from-orange-500 to-red-500',
      unlocked: stats.streak >= 7,
      progress: Math.min(100, (stats.streak / 7) * 100),
      requirement: 7,
      current: stats.streak,
    },
    {
      id: 'streak-30',
      title: '30-Day Streak',
      description: 'Complete 30 days in a row',
      icon: 'Flame',
      color: 'from-orange-500 to-red-500',
      unlocked: stats.streak >= 30,
      progress: Math.min(100, (stats.streak / 30) * 100),
      requirement: 30,
      current: stats.streak,
    },
    {
      id: 'grammar-master',
      title: 'Grammar Master',
      description: 'Score 90+ on grammar tests',
      icon: 'BookOpen',
      color: 'from-blue-500 to-blue-600',
      unlocked: quizActivities.length > 0 && quizActivities.some(a => a.score >= 90),
      progress: quizActivities.length > 0 
        ? Math.min(100, (quizActivities.filter(a => a.score >= 90).length / Math.max(1, quizActivities.length)) * 100)
        : 0,
      requirement: 90,
      current: quizActivities.length > 0 
        ? Math.max(...quizActivities.map(a => a.score))
        : 0,
    },
    {
      id: 'quiz-50',
      title: 'Quiz Champion',
      description: 'Complete 50 quizzes',
      icon: 'Target',
      color: 'from-purple-500 to-pink-500',
      unlocked: quizActivities.length >= 50,
      progress: Math.min(100, (quizActivities.length / 50) * 100),
      requirement: 50,
      current: quizActivities.length,
    },
    {
      id: 'speaking-pro',
      title: 'Speaking Pro',
      description: 'Complete 25 speaking tasks',
      icon: 'Trophy',
      color: 'from-green-500 to-emerald-500',
      unlocked: speakingActivities.length >= 25,
      progress: Math.min(100, (speakingActivities.length / 25) * 100),
      requirement: 25,
      current: speakingActivities.length,
    },
    {
      id: 'writing-master',
      title: 'Writing Master',
      description: 'Complete 20 writing exercises',
      icon: 'Edit',
      color: 'from-indigo-500 to-purple-500',
      unlocked: writingActivities.length >= 20,
      progress: Math.min(100, (writingActivities.length / 20) * 100),
      requirement: 20,
      current: writingActivities.length,
    },
    {
      id: 'points-1000',
      title: 'Point Collector',
      description: 'Earn 1000 total points',
      icon: 'Award',
      color: 'from-yellow-500 to-orange-500',
      unlocked: stats.totalPoints >= 1000,
      progress: Math.min(100, (stats.totalPoints / 1000) * 100),
      requirement: 1000,
      current: stats.totalPoints,
    },
    {
      id: 'points-5000',
      title: 'Point Master',
      description: 'Earn 5000 total points',
      icon: 'Award',
      color: 'from-yellow-500 to-orange-500',
      unlocked: stats.totalPoints >= 5000,
      progress: Math.min(100, (stats.totalPoints / 5000) * 100),
      requirement: 5000,
      current: stats.totalPoints,
    },
    {
      id: 'high-score',
      title: 'High Achiever',
      description: 'Score 95+ on any activity',
      icon: 'Star',
      color: 'from-pink-500 to-rose-500',
      unlocked: activities.some(a => a.score >= 95),
      progress: activities.length > 0
        ? Math.min(100, (activities.filter(a => a.score >= 95).length / activities.length) * 100)
        : 0,
      requirement: 95,
      current: activities.length > 0 ? Math.max(...activities.map(a => a.score)) : 0,
    },
  ];
  
  return achievements;
};

/**
 * Clear all user progress (for testing/reset)
 */
export const clearUserProgress = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STREAK_KEY);
};
