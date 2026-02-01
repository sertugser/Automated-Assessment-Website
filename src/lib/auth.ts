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

// Admin credentials - loaded from environment variables
// Default values for development if not set in .env
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@aafs.com';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@2026!';

// Demo account passwords (ensure they always exist for login)
const DEMO_PASSWORDS: Record<string, string> = {
  'student@demo.com': 'Student@123',
  'instructor@demo.com': 'Instructor@123',
  [ADMIN_EMAIL]: ADMIN_PASSWORD,
};

const ensureDemoPasswords = () => {
  const stored = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
  let updated = false;
  for (const [email, pwd] of Object.entries(DEMO_PASSWORDS)) {
    if (!stored[email]) {
      stored[email] = pwd;
      updated = true;
    }
  }
  if (updated) localStorage.setItem('aafs_passwords', JSON.stringify(stored));
};

// Initialize with demo users
const initializeDemoUsers = () => {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    // First time - create demo users with current date
    const now = new Date().toISOString();
    const demoUsers: User[] = [
      {
        id: '1',
        email: 'student@demo.com',
        name: 'Demo Student',
        role: 'student',
        createdAt: now,
        enrolledCourses: ['grammar', 'vocabulary'],
      },
      {
        id: '2',
        email: 'instructor@demo.com',
        name: 'Demo Instructor',
        role: 'instructor',
        createdAt: now,
      },
      {
        id: 'admin-001',
        email: 'admin@aafs.com',
        name: 'System Administrator',
        role: 'admin',
        createdAt: now,
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    ensureDemoPasswords();
  } else {
    // Users already exist - preserve their original createdAt dates
    const users = JSON.parse(existingUsers) as User[];
    let updated = false;
    const now = new Date().toISOString();
    
    users.forEach((u, index) => {
      // Only set createdAt if it's completely missing or invalid
      if (!u.createdAt || typeof u.createdAt !== 'string' || !u.createdAt.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // Use current date only if createdAt is truly missing/invalid
        users[index].createdAt = now;
        updated = true;
      }
    });
    
    // Ensure demo users exist (in case they were deleted)
    const demoEmails = ['student@demo.com', 'instructor@demo.com', ADMIN_EMAIL];
    demoEmails.forEach((email, idx) => {
      if (!users.find(u => u.email === email)) {
        const demoUser: User = {
          id: idx === 2 ? 'admin-001' : (idx + 1).toString(),
          email,
          name: idx === 0 ? 'Demo Student' : idx === 1 ? 'Demo Instructor' : 'System Administrator',
          role: idx === 0 ? 'student' : idx === 1 ? 'instructor' : 'admin',
          createdAt: now,
          enrolledCourses: idx === 0 ? ['grammar', 'vocabulary'] : undefined,
        };
        users.push(demoUser);
        updated = true;
      }
    });
    
    if (updated) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    ensureDemoPasswords();
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

  // Prevent admin role registration - only ADMIN_EMAIL can be admin
  if (role === 'admin') {
    throw new Error('Admin role cannot be registered. Only system administrators can have admin access.');
  }

  // If someone tries to register with admin email, force student role
  const finalRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'student' : role;

  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    role: finalRole,
    createdAt: new Date().toISOString(),
    enrolledCourses: finalRole === 'student' ? [] : undefined,
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
  let user = users.find(u => u.email === email);

  // If admin email is used, ensure user exists and has admin role
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
    if (passwords[ADMIN_EMAIL] !== ADMIN_PASSWORD) {
      passwords[ADMIN_EMAIL] = ADMIN_PASSWORD;
      localStorage.setItem('aafs_passwords', JSON.stringify(passwords));
    }

    // Check password first
    if (password !== ADMIN_PASSWORD) {
      throw new Error('Invalid password');
    }

    // If user doesn't exist or is not admin, create/update admin user
    if (!user || user.role !== 'admin') {
      if (!user) {
        // Check if admin user exists with different ID
        const existingAdmin = users.find(u => u.email === ADMIN_EMAIL);
        if (existingAdmin) {
          // Use existing admin user but update role - preserve original createdAt
          user = { ...existingAdmin, role: 'admin' };
          const index = users.findIndex(u => u.id === existingAdmin.id);
          if (index !== -1) {
            users[index] = user;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
          }
        } else {
          // Create new admin user - use current date
          user = {
            id: 'admin-001',
            email: ADMIN_EMAIL,
            name: 'System Administrator',
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          users.push(user);
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
      } else {
        // Update existing user to admin - preserve original createdAt
        const originalCreatedAt = user.createdAt;
        user.role = 'admin';
        // Always preserve original createdAt
        if (originalCreatedAt) {
          user.createdAt = originalCreatedAt;
        }
        const index = users.findIndex(u => u.id === user!.id);
        if (index !== -1) {
          users[index] = user;
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
      }
    }
  } else {
    // Regular user login
    if (!user) {
      throw new Error('User not found');
    }

    // Check password
    const passwords = JSON.parse(localStorage.getItem('aafs_passwords') || '{}');
    if (passwords[email] !== password) {
      throw new Error('Invalid password');
    }
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