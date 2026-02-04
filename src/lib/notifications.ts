import type { AssignmentType } from './assignments';

export interface AssignmentNotification {
  id: string;
  kind?: 'assignment' | 'feedback';
  studentId: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: AssignmentType;
  courseId?: string;
  createdAt: string;
  readAt?: string;
}

const NOTIFICATIONS_KEY = 'aafs_notifications';

function getAllNotifications(): AssignmentNotification[] {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setAllNotifications(items: AssignmentNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
}

export function addAssignmentNotifications(params: {
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: AssignmentType;
  courseId?: string;
  studentIds: string[];
}): void {
  const now = new Date().toISOString();
  const existing = getAllNotifications();
  const next = [...existing];

  for (const studentId of params.studentIds) {
    next.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: 'assignment',
      studentId,
      assignmentId: params.assignmentId,
      assignmentTitle: params.assignmentTitle,
      assignmentType: params.assignmentType,
      courseId: params.courseId,
      createdAt: now,
    });
  }

  setAllNotifications(next);
}

export function addFeedbackNotification(params: {
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: AssignmentType;
  courseId?: string;
  studentId: string;
  reviewedAt?: string;
}): void {
  const now = params.reviewedAt || new Date().toISOString();
  const existing = getAllNotifications();
  const next = [
    ...existing,
    {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: 'feedback',
      studentId: params.studentId,
      assignmentId: params.assignmentId,
      assignmentTitle: params.assignmentTitle,
      assignmentType: params.assignmentType,
      courseId: params.courseId,
      createdAt: now,
    },
  ];

  setAllNotifications(next);
}

export function getNotificationsForStudent(studentId: string): AssignmentNotification[] {
  return getAllNotifications()
    .filter(n => n.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadCount(studentId: string): number {
  return getAllNotifications().filter(n => n.studentId === studentId && !n.readAt).length;
}

export function markNotificationRead(id: string): void {
  const items = getAllNotifications();
  const idx = items.findIndex(n => n.id === id);
  if (idx === -1) return;
  if (!items[idx].readAt) {
    items[idx] = { ...items[idx], readAt: new Date().toISOString() };
    setAllNotifications(items);
  }
}

export function markAllNotificationsRead(studentId: string): void {
  const items = getAllNotifications();
  let changed = false;
  const next = items.map(n => {
    if (n.studentId === studentId && !n.readAt) {
      changed = true;
      return { ...n, readAt: new Date().toISOString() };
    }
    return n;
  });
  if (changed) setAllNotifications(next);
}

export function deleteNotification(id: string): void {
  const items = getAllNotifications().filter(n => n.id !== id);
  setAllNotifications(items);
}
