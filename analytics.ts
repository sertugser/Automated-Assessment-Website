// Analytics and Performance Tracking

import { getSubmissionsByStudent } from './assignments';
import type { Submission } from './assignments';

export interface PerformanceMetrics {
  overallScore: number;
  grammarScore: number;
  vocabularyScore: number;
  coherenceScore: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  totalSubmissions: number;
  completedSubmissions: number;
  averageScore: number;
  improvement: number; // Percentage improvement over time
}

export interface SkillProgress {
  skill: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSeriesData {
  date: string;
  score: number;
  submissionType: string;
}

/**
 * Calculate performance metrics for a student
 */
export const calculateStudentMetrics = (studentId: string): PerformanceMetrics => {
  const submissions = getSubmissionsByStudent(studentId);
  const completedSubmissions = submissions.filter(s => s.status === 'completed');

  if (completedSubmissions.length === 0) {
    return {
      overallScore: 0,
      grammarScore: 0,
      vocabularyScore: 0,
      coherenceScore: 0,
      totalSubmissions: submissions.length,
      completedSubmissions: 0,
      averageScore: 0,
      improvement: 0,
    };
  }

  const scores = completedSubmissions.map(s => s.aiFeedback);
  
  // Include quiz scores if available (aiScore field)
  const allOverallScores = completedSubmissions
    .map(s => s.aiFeedback?.overallScore ?? s.aiScore ?? 0)
    .filter(score => score > 0);
  
  const grammarScores = scores
    .filter(s => s?.grammar)
    .map(s => s!.grammar!.score);
  
  const vocabularyScores = scores
    .filter(s => s?.vocabulary)
    .map(s => s!.vocabulary!.score);
  
  const coherenceScores = scores
    .filter(s => s?.coherence)
    .map(s => s!.coherence!.score);
  
  const pronunciationScores = scores
    .filter(s => s?.pronunciation)
    .map(s => s!.pronunciation!.score);
  
  const fluencyScores = scores
    .filter(s => s?.fluency)
    .map(s => s!.fluency!.score);
  
  const overallScores = allOverallScores;

  const average = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Calculate improvement (compare first half vs second half of submissions)
  const midPoint = Math.floor(overallScores.length / 2);
  const firstHalfAvg = average(overallScores.slice(0, midPoint));
  const secondHalfAvg = average(overallScores.slice(midPoint));
  const improvement = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

  return {
    overallScore: average(overallScores),
    grammarScore: average(grammarScores),
    vocabularyScore: average(vocabularyScores),
    coherenceScore: average(coherenceScores),
    pronunciationScore: pronunciationScores.length > 0 ? average(pronunciationScores) : undefined,
    fluencyScore: fluencyScores.length > 0 ? average(fluencyScores) : undefined,
    totalSubmissions: submissions.length,
    completedSubmissions: completedSubmissions.length,
    averageScore: average(overallScores),
    improvement: Math.round(improvement),
  };
};

/**
 * Get skill progress over time
 */
export const getSkillProgress = (studentId: string): SkillProgress[] => {
  const submissions = getSubmissionsByStudent(studentId).filter(s => s.status === 'completed');
  
  if (submissions.length < 2) {
    return [];
  }

  // Sort by date
  const sorted = submissions.sort((a, b) => 
    new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  const midPoint = Math.floor(sorted.length / 2);
  const recent = sorted.slice(midPoint);
  const previous = sorted.slice(0, midPoint);

  const calculateAvgScore = (subs: Submission[], field: keyof NonNullable<Submission['aiFeedback']>) => {
    const scores = subs
      .filter(s => s.aiFeedback && field in s.aiFeedback)
      .map(s => {
        const value = s.aiFeedback![field];
        return typeof value === 'object' && 'score' in value ? value.score : 0;
      })
      .filter(score => score > 0);
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  const skills: SkillProgress[] = [];

  const addSkill = (name: string, field: keyof NonNullable<Submission['aiFeedback']>) => {
    const currentAvg = calculateAvgScore(recent, field);
    const previousAvg = calculateAvgScore(previous, field);
    
    if (currentAvg > 0 || previousAvg > 0) {
      skills.push({
        skill: name,
        current: Math.round(currentAvg),
        previous: Math.round(previousAvg),
        trend: currentAvg > previousAvg + 2 ? 'up' : currentAvg < previousAvg - 2 ? 'down' : 'stable',
      });
    }
  };

  addSkill('Grammar', 'grammar');
  addSkill('Vocabulary', 'vocabulary');
  addSkill('Coherence', 'coherence');
  addSkill('Pronunciation', 'pronunciation');
  addSkill('Fluency', 'fluency');

  return skills;
};

/**
 * Get time series data for charts
 */
export const getTimeSeriesData = (studentId: string, days: number = 30): TimeSeriesData[] => {
  const submissions = getSubmissionsByStudent(studentId)
    .filter(s => s.status === 'completed' && s.aiFeedback)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  return submissions.map(s => ({
    date: new Date(s.submittedAt).toLocaleDateString(),
    score: s.aiFeedback?.overallScore || 0,
    submissionType: s.assignmentId,
  }));
};

/**
 * Get class-wide analytics (for instructors)
 */
export const getClassAnalytics = (studentIds: string[]) => {
  const allMetrics = studentIds.map(id => calculateStudentMetrics(id));
  
  const average = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    averageOverallScore: average(allMetrics.map(m => m.overallScore)),
    averageGrammarScore: average(allMetrics.map(m => m.grammarScore)),
    averageVocabularyScore: average(allMetrics.map(m => m.vocabularyScore)),
    totalSubmissions: allMetrics.reduce((sum, m) => sum + m.totalSubmissions, 0),
    totalStudents: studentIds.length,
    studentsImproving: allMetrics.filter(m => m.improvement > 0).length,
  };
};
