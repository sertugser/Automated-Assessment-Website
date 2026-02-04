// Assignment Management System

export type AssignmentType = 'writing' | 'speaking' | 'listening' | 'quiz';
export type AssignmentStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'pending' | 'evaluating' | 'completed' | 'reviewed';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: AssignmentType;
  courseId: string;
  instructorId: string;
  status: AssignmentStatus;
  dueDate?: string;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  instructions?: string;
  rubric?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  submittedAt: string;
  content?: string; // For writing
  audioUrl?: string; // For speaking
  imageUrl?: string; // For handwriting
  ocrText?: string; // Extracted text from handwriting
  aiScore?: number;
  aiFeedback?: AIFeedback;
  instructorScore?: number;
  instructorFeedback?: string;
  reviewedAt?: string;
}

export interface AIFeedback {
  overallScore: number;
  grammar?: {
    score: number;
    errors: Array<{
      type: string;
      message: string;
      suggestion: string;
      position?: { start: number; end: number };
    }>;
  };
  vocabulary?: {
    score: number;
    suggestions: string[];
    levelAnalysis: string;
    detailedAnalysis?: string;
    wordUsageExamples?: Array<{
      word: string;
      context: string;
      suggestion?: string;
      reason: string;
    }>;
    diversityAnalysis?: string;
  };
  coherence?: {
    score: number;
    feedback: string;
    paragraphStructure?: string;
    transitionsAnalysis?: string;
    flowAnalysis?: string;
    specificExamples?: Array<{
      issue: string;
      location: string;
      suggestion: string;
    }>;
  };
  pronunciation?: {
    score: number;
    errors: Array<{
      word: string;
      expected: string;
      actual: string;
    }>;
  };
  fluency?: {
    score: number;
    wordsPerMinute: number;
    pauseAnalysis: string;
  };
  strengths: string[];
  improvements: string[];
}

const ASSIGNMENTS_KEY = 'aafs_assignments';
const SUBMISSIONS_KEY = 'aafs_submissions';
const ASSIGNED_KEY = 'aafs_assigned';

export interface AssignedAssignment {
  assignmentId: string;
  studentId: string;
  assignedAt: string;
  dueDate?: string;
}

function getAssigned(): AssignedAssignment[] {
  const raw = localStorage.getItem(ASSIGNED_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setAssigned(items: AssignedAssignment[]) {
  localStorage.setItem(ASSIGNED_KEY, JSON.stringify(items));
}

export const assignToStudents = (assignmentId: string, studentIds: string[], dueDate?: string): void => {
  const assigned = getAssigned();
  const filtered = assigned.filter(a => a.assignmentId !== assignmentId);
  const now = new Date().toISOString();
  for (const sid of studentIds) {
    filtered.push({ assignmentId, studentId: sid, assignedAt: now, dueDate });
  }
  setAssigned(filtered);
};

export const getAssignedStudents = (assignmentId: string): string[] => {
  return getAssigned()
    .filter(a => a.assignmentId === assignmentId)
    .map(a => a.studentId);
};

export const getAssignmentsForStudent = (studentId: string): AssignedAssignment[] => {
  return getAssigned().filter(a => a.studentId === studentId);
};

export const getAssignment = (id: string): Assignment | undefined => {
  return getAssignments().find(a => a.id === id);
};

// Instructor roster - students the instructor has added to their class
const ROSTER_KEY = 'aafs_instructor_roster';

function getRosterData(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setRosterData(data: Record<string, string[]>) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(data));
}

export const getInstructorRoster = (instructorId: string): string[] => {
  const data = getRosterData();
  return data[instructorId] || [];
};

export const addStudentsToRoster = (instructorId: string, studentIds: string[]): void => {
  const data = getRosterData();
  const current = data[instructorId] || [];
  const added = new Set([...current]);
  for (const id of studentIds) added.add(id);
  data[instructorId] = Array.from(added);
  setRosterData(data);
};

export const removeStudentFromRoster = (instructorId: string, studentId: string): void => {
  const data = getRosterData();
  const current = data[instructorId] || [];
  data[instructorId] = current.filter(id => id !== studentId);
  setRosterData(data);
};

// Get all assignments
export const getAssignments = (): Assignment[] => {
  const assignments = localStorage.getItem(ASSIGNMENTS_KEY);
  return assignments ? JSON.parse(assignments) : [];
};

// Get assignments by instructor
export const getAssignmentsByInstructor = (instructorId: string): Assignment[] => {
  return getAssignments().filter(a => a.instructorId === instructorId);
};

// Get assignments by course
export const getAssignmentsByCourse = (courseId: string): Assignment[] => {
  return getAssignments().filter(a => a.courseId === courseId && a.status === 'published');
};

// Create assignment
export const createAssignment = (assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Assignment => {
  const assignments = getAssignments();
  const newAssignment: Assignment = {
    ...assignment,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  assignments.push(newAssignment);
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  
  return newAssignment;
};

// Update assignment
export const updateAssignment = (id: string, updates: Partial<Assignment>): boolean => {
  const assignments = getAssignments();
  const index = assignments.findIndex(a => a.id === id);
  
  if (index === -1) return false;

  assignments[index] = {
    ...assignments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  return true;
};

// Delete assignment
export const deleteAssignment = (id: string): boolean => {
  const assignments = getAssignments();
  const filtered = assignments.filter(a => a.id !== id);
  
  if (filtered.length === assignments.length) return false;

  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(filtered));
  return true;
};

// Get all submissions
export const getSubmissions = (): Submission[] => {
  const submissions = localStorage.getItem(SUBMISSIONS_KEY);
  return submissions ? JSON.parse(submissions) : [];
};

// Get submissions by student
export const getSubmissionsByStudent = (studentId: string): Submission[] => {
  return getSubmissions().filter(s => s.studentId === studentId);
};

// Get submissions by assignment
export const getSubmissionsByAssignment = (assignmentId: string): Submission[] => {
  return getSubmissions().filter(s => s.assignmentId === assignmentId);
};

// Get submissions by instructor (all submissions to instructor's assignments)
export const getSubmissionsByInstructor = (instructorId: string): Submission[] => {
  const assignmentIds = getAssignmentsByInstructor(instructorId).map(a => a.id);
  return getSubmissions().filter(s => assignmentIds.includes(s.assignmentId));
};

// Get unique students who have submitted to instructor's assignments
export const getStudentsByInstructor = (instructorId: string): { studentId: string; studentName: string }[] => {
  const subs = getSubmissionsByInstructor(instructorId);
  const seen = new Set<string>();
  return subs
    .filter(s => !seen.has(s.studentId) && seen.add(s.studentId))
    .map(s => ({ studentId: s.studentId, studentName: s.studentName }));
};

// Create submission
export const createSubmission = (submission: Omit<Submission, 'id' | 'submittedAt'>): Submission => {
  const submissions = getSubmissions();
  const newSubmission: Submission = {
    ...submission,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
  };
  
  submissions.push(newSubmission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  
  return newSubmission;
};

// Update submission
export const updateSubmission = (id: string, updates: Partial<Submission>): boolean => {
  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.id === id);
  
  if (index === -1) return false;

  submissions[index] = { ...submissions[index], ...updates };
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  
  return true;
};
