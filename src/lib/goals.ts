// Learning Goals Management

export interface LearningGoal {
  id: string;
  studentId: string;
  title: string;
  description: string;
  targetMetric: 'grammar' | 'vocabulary' | 'speaking' | 'writing' | 'overall';
  currentValue: number;
  targetValue: number;
  deadline?: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string;
}

const GOALS_KEY = 'aafs_goals';

export const getGoals = (): LearningGoal[] => {
  const goals = localStorage.getItem(GOALS_KEY);
  return goals ? JSON.parse(goals) : [];
};

export const getGoalsByStudent = (studentId: string): LearningGoal[] => {
  return getGoals().filter(g => g.studentId === studentId);
};

export const createGoal = (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'completed'>): LearningGoal => {
  const goals = getGoals();
  const newGoal: LearningGoal = {
    ...goal,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    completed: false,
  };
  
  goals.push(newGoal);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  
  return newGoal;
};

export const updateGoal = (id: string, updates: Partial<LearningGoal>): boolean => {
  const goals = getGoals();
  const index = goals.findIndex(g => g.id === id);
  
  if (index === -1) return false;

  goals[index] = { ...goals[index], ...updates };
  
  // Check if goal is completed
  if (goals[index].currentValue >= goals[index].targetValue && !goals[index].completed) {
    goals[index].completed = true;
    goals[index].completedAt = new Date().toISOString();
  }
  
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  return true;
};

export const deleteGoal = (id: string): boolean => {
  const goals = getGoals();
  const filtered = goals.filter(g => g.id !== id);
  
  if (filtered.length === goals.length) return false;

  localStorage.setItem(GOALS_KEY, JSON.stringify(filtered));
  return true;
};
