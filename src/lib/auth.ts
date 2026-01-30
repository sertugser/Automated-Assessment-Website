// Authentication and User Management System

export type UserRole = 'student' | 'instructor' | 'admin';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  enrolledCourses?: string[];
  avatar?: string;
  /** CEFR level from placement test (A1–C2). */
  cefrLevel?: CEFRLevel | null;
  /** Has completed the initial placement test. */
  placementTestCompleted?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

const USERS_KEY = 'aafs_users';
const CURRENT_USER_KEY = 'aafs_current_user';

// Initialize with demo users
const initializeDemoUsers = () => {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    const demoUsers: User[] = [
      {
        id: '1',
        email: 'student@demo.com',
        name: 'Demo Student',
        role: 'student',
        createdAt: new Date().toISOString(),
        enrolledCourses: ['grammar', 'vocabulary'],
      },
      {
        id: '2',
        email: 'instructor@demo.com',
        name: 'Demo Instructor',
        role: 'instructor',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-001',
        email: 'admin@aafs.com',
        name: 'System Administrator',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    
    // Set admin password
    const passwords = { 'admin@aafs.com': 'Admin@2026!' };
    localStorage.setItem('aafs_passwords', JSON.stringify(passwords));
  }
};

// Get all users
export const getUsers = (): User[] => {
  initializeDemoUsers();
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

// Register new user
export const register = (
  email: string,
  password: string,
  name: string,
  role: UserRole = 'student'
): { success: boolean; user?: User; error?: string } => {
  const users = getUsers();
  
  // Check if email already exists
  if (users.find(u => u.email === email)) {
    throw new Error('Email already registered');
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    role,
    createdAt: new Date().toISOString(),
    enrolledCourses: role === 'student' ? [] : undefined,
    placementTestCompleted: false,
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Store password separately (in real app, this would be hashed)
  const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
  passwords[email] = password;
  localStorage.setItem('aafs_passwords', JSON.stringify(passwords));

  // Set current user
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

  return { success: true, user: newUser };
};

// Login
export const login = (
  email: string,
  password: string
): { success: boolean; user?: User; error?: string } => {
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    throw new Error('User not found');
  }

  // Check password
  const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
  if (passwords[email] !== password) {
    throw new Error('Invalid password');
  }

  // Set current user
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

  return { success: true, user };
};

// Get current user
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Logout
export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Update user
export const updateUser = (userId: string, updates: Partial<User>): boolean => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  
  if (index === -1) return false;

  users[index] = { ...users[index], ...updates };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Update current user if it's the same
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[index]));
  }

  return true;
};

// Change password
export const changePassword = (
  email: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } => {
  const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
  
  // Check current password
  if (passwords[email] !== currentPassword) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Update password
  passwords[email] = newPassword;
  localStorage.setItem('aafs_passwords', JSON.stringify(passwords));

  return { success: true };
};

// Delete user (admin only)
export const deleteUser = (userId: string): boolean => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  
  if (filtered.length === users.length) return false;

  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  return true;
};