import { Notification, Evaluation, User, NotificationCategory, Role } from '../types';
import { saveNotificationToSupabase } from './supabaseService';

const NOTIF_KEY = 'apes_notifications_v3';

export const INITIAL_SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_01',
    userId: 'usr_sup_01',
    recipientRole: 'supervisor',
    recipientDepartment: 'Sales',
    title: 'Action Required: Employee Self-Evaluation Submitted',
    message: 'Maritess Bacle has submitted her Sales Performance Scorecard for your review.',
    category: 'evaluation',
    date: '10 mins ago',
    read: false,
    type: 'action_required',
    employeeName: 'Maritess Bacle',
    departmentName: 'Sales',
    appraisalPeriod: 'January-September 2025',
    status: 'pending_supervisor',
    senderName: 'Maritess Bacle',
    dateTime: new Date().toLocaleString(),
    evaluationId: 'eval_maritess_2025'
  },
  {
    id: 'notif_02',
    userId: 'usr_pres_01',
    recipientRole: 'president',
    title: 'Action Required: Department Head Scorecard Review',
    message: 'Elena Rostova (Head of Sales) has submitted her self-assessment for Presidential Executive Review.',
    category: 'approval',
    date: '1 hour ago',
    read: false,
    type: 'action_required',
    employeeName: 'Elena Rostova',
    departmentName: 'Sales',
    appraisalPeriod: 'January-September 2025',
    status: 'pending_president',
    senderName: 'Elena Rostova',
    dateTime: new Date().toLocaleString(),
    evaluationId: 'eval_elena_depthead_2025'
  },
  {
    id: 'notif_announcement_01',
    recipientRole: 'ALL',
    isAnnouncement: true,
    title: 'System Announcement: 2026 Q3 Performance Appraisal Cycle Launched',
    message: 'Welcome to the APES v3.0 Performance Evaluation Cycle. All regular employees are requested to complete self-evaluations.',
    category: 'announcement',
    date: '1 day ago',
    read: false,
    type: 'info',
    senderName: 'People Operations & POD',
    dateTime: new Date().toLocaleString()
  }
];

export const getStoredNotifications = (): Notification[] => {
  const data = localStorage.getItem(NOTIF_KEY);
  if (!data) return INITIAL_SEED_NOTIFICATIONS;
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_SEED_NOTIFICATIONS;
  }
};

/**
 * Filter notifications strictly according to recipient rules & security policies:
 * 1. Company-wide announcements (isAnnouncement === true or recipientRole === 'ALL') -> visible to ALL logged-in users.
 * 2. Targeted by exact User ID -> visible ONLY to that user.
 * 3. Targeted by System Admin / HR Admin roles -> visible ONLY to system_admin / hr_admin.
 * 4. Targeted by Department Head / Supervisor / President / POD roles -> visible ONLY to users matching that role and department.
 */
export const getRoleBasedNotifications = (currentUser?: User | null): Notification[] => {
  const all = getStoredNotifications();
  if (!currentUser) return [];

  return all.filter((n) => {
    // Rule A: Organization-Wide Announcements (Explicitly marked as announcement or ALL)
    if (n.isAnnouncement || n.recipientRole === 'ALL') {
      return true;
    }

    // Rule B: Administrative / Account / System Alerts (STRICTLY for System Admin or HR Admin)
    if (
      n.category === 'account' || 
      n.category === 'system' || 
      n.recipientRole === 'ALL_ADMINS' || 
      n.recipientRole === 'system_admin' ||
      n.recipientRole === 'hr_admin'
    ) {
      return currentUser.role === 'system_admin' || currentUser.role === 'hr_admin';
    }

    // Rule C: Direct User ID match (Private to specific user)
    if (n.userId && (n.userId === currentUser.id || n.userId === currentUser.employeeNumber)) {
      return true;
    }

    // Rule D: Role-Based Workflow match
    if (n.recipientRole && n.recipientRole === currentUser.role) {
      // If a department constraint is present, check department match
      if (n.recipientDepartment && currentUser.role === 'dept_head') {
        return n.recipientDepartment.toLowerCase() === currentUser.departmentName.toLowerCase();
      }
      return true;
    }

    return false;
  });
};

export const triggerWorkflowNotification = (
  targetUserId: string,
  evaluation: Evaluation,
  title: string,
  message: string,
  senderName: string,
  type: 'action_required' | 'info' | 'success' | 'alert' = 'action_required',
  recipientRole?: Role
) => {
  const notifications = getStoredNotifications();
  const category: NotificationCategory = evaluation.status.includes('pending') ? 'approval' : 'evaluation';

  const newNotif: Notification = {
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: targetUserId,
    recipientRole,
    recipientDepartment: evaluation.departmentName,
    title,
    message,
    category,
    date: 'Just now',
    read: false,
    type,
    employeeName: evaluation.employeeName,
    departmentName: evaluation.departmentName,
    appraisalPeriod: evaluation.appraisalPeriod,
    status: evaluation.status,
    senderName,
    dateTime: new Date().toLocaleString(),
    evaluationId: evaluation.id
  };

  notifications.unshift(newNotif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  saveNotificationToSupabase(newNotif);
};

export const triggerRegistrationNotification = (newUser: User) => {
  const notifications = getStoredNotifications();
  const newNotif: Notification = {
    id: `notif_reg_${Date.now()}`,
    recipientRole: 'system_admin', // Target System Admins & HR Admins ONLY
    recipientDepartment: newUser.departmentName,
    title: 'New Employee Registration Pending Approval',
    message: `${newUser.name} (${newUser.email}) registered for ${newUser.position} in ${newUser.departmentName} and requires HR/Admin approval.`,
    category: 'account',
    date: 'Just now',
    read: false,
    type: 'action_required',
    employeeName: newUser.name,
    departmentName: newUser.departmentName,
    appraisalPeriod: 'Registration Request',
    status: 'pending_approval',
    senderName: newUser.name,
    dateTime: new Date().toLocaleString(),
  };

  notifications.unshift(newNotif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  saveNotificationToSupabase(newNotif);
};

export const triggerAnnouncementNotification = (
  title: string,
  message: string,
  senderName: string,
  expirationDate?: string
) => {
  const notifications = getStoredNotifications();
  const newNotif: Notification = {
    id: `notif_announcement_${Date.now()}`,
    recipientRole: 'ALL',
    isAnnouncement: true,
    title,
    message,
    category: 'announcement',
    date: 'Just now',
    read: false,
    type: 'info',
    senderName,
    expirationDate,
    dateTime: new Date().toLocaleString(),
  };

  notifications.unshift(newNotif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  saveNotificationToSupabase(newNotif);
};

export const markNotificationAsRead = (notifId: string) => {
  const notifications = getStoredNotifications();
  const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  const target = updated.find(n => n.id === notifId);
  if (target) {
    saveNotificationToSupabase(target);
  }
};

