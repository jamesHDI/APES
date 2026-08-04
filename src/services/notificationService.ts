import { Notification, Evaluation, User, NotificationCategory, Role } from '../types';
import { saveNotificationToSupabase, saveNotificationsBatchToSupabase, generateUuid, fetchEmployeesFromSupabase } from './supabaseService';
import { triggerRealtimeBroadcast } from './supabaseClient';

export const INITIAL_SEED_NOTIFICATIONS: Notification[] = [
  {
    id: '00000000-0000-4000-8000-000000000102',
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
    id: '00000000-0000-4000-8000-000000000103',
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

export const getStoredNotifications = (): Notification[] => INITIAL_SEED_NOTIFICATIONS;
export const mergeRemoteNotifications = (remoteNotifs: Notification[]): Notification[] => remoteNotifs;

/**
 * Checks whether a specific notification has been read by the given user.
 * Evaluated strictly against database-persisted readByUsers array or direct user assignment.
 */
export const isNotificationReadForUser = (notif: Notification, userId?: string): boolean => {
  if (!userId || !notif) return notif?.read || false;

  if (notif.readByUsers && Array.isArray(notif.readByUsers) && notif.readByUsers.includes(userId)) {
    return true;
  }

  // Direct user assignment check
  if (notif.userId === userId && notif.read) {
    return true;
  }

  return false;
};

/**
 * Filter notifications according to recipient rules & security policies,
 * and dynamically evaluate the read status for the specified logged-in user.
 * Supports flexible parameters: getRoleBasedNotifications(currentUser) or getRoleBasedNotifications(notifications, currentUser)
 */
export const getRoleBasedNotifications = (
  arg1?: Notification[] | User | null,
  arg2?: User | null
): Notification[] => {
  let notifications: Notification[] = [];
  let currentUser: User | null = null;

  if (Array.isArray(arg1)) {
    notifications = arg1;
    currentUser = arg2 || null;
  } else {
    notifications = INITIAL_SEED_NOTIFICATIONS;
    currentUser = (arg1 as User) || null;
  }

  if (!currentUser || !notifications) return [];

  const filtered = notifications.filter((n) => {
    // 1. Administrative / Account / System Alerts (STRICTLY for System Admin or HR Admin)
    if (
      n.category === 'account' || 
      n.category === 'system' || 
      n.status === 'pending_approval'
    ) {
      return currentUser.role === 'system_admin' || currentUser.role === 'hr_admin';
    }

    // 2. Direct User ID match (Private alert targeted to specific user)
    if (n.userId && (n.userId === currentUser.id || n.userId === currentUser.employeeNumber)) {
      return true;
    }

    // 3. Organization-Wide Announcements to ALL
    if ((n.recipientRole as string) === 'ALL' || (n.isAnnouncement && (!n.recipientRole || (n.recipientRole as string) === 'ALL'))) {
      return true;
    }

    // 4. Admin Broadcast target
    if ((n.recipientRole as string) === 'ALL_ADMINS') {
      return currentUser.role === 'system_admin' || currentUser.role === 'hr_admin';
    }

    // 5. Targeted Role Broadcast or Workflow match
    if (n.recipientRole && n.recipientRole === currentUser.role) {
      if (n.recipientDepartment && currentUser.role === 'dept_head') {
        return n.recipientDepartment.toLowerCase() === currentUser.departmentName.toLowerCase();
      }
      return true;
    }

    return false;
  });

  // Dynamically attach user-specific read status
  return filtered.map((n) => ({
    ...n,
    read: isNotificationReadForUser(n, currentUser.id)
  }));
};

/**
 * Marks a notification as READ for the specified user ONLY, keeping read status independent per user in Supabase.
 */
export const markNotificationAsRead = async (notif: Notification, currentUserId?: string): Promise<boolean> => {
  if (!notif) return false;

  const readByUsers = Array.from(new Set([...(notif.readByUsers || []), ...(currentUserId ? [currentUserId] : [])]));
  const isTargetedDirect = currentUserId && notif.userId === currentUserId;

  const updatedNotif: Notification = {
    ...notif,
    readByUsers,
    read: isTargetedDirect ? true : notif.read
  };

  const saved = await saveNotificationToSupabase(updatedNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'notification_read', notifId: notif.id, userId: currentUserId });
  return saved;
};

/**
 * Marks all notifications as READ for the logged in user in Supabase.
 */
export const markAllNotificationsAsReadForUser = async (notifications: Notification[], currentUser: User): Promise<boolean> => {
  const userNotifs = getRoleBasedNotifications(notifications, currentUser);
  const updatedNotifs = userNotifs.map(n => {
    const readByUsers = Array.from(new Set([...(n.readByUsers || []), currentUser.id]));
    const isTargetedDirect = n.userId === currentUser.id;
    return {
      ...n,
      readByUsers,
      read: isTargetedDirect ? true : n.read
    };
  });

  const saved = await saveNotificationsBatchToSupabase(updatedNotifs);
  triggerRealtimeBroadcast('data_changed', { type: 'notifications_read_all', userId: currentUser.id });
  return saved;
};

export const triggerWorkflowNotification = async (
  targetUserId: string,
  evaluation: Evaluation,
  title: string,
  message: string,
  senderName: string,
  type: 'action_required' | 'info' | 'success' | 'alert' = 'action_required',
  recipientRole?: Role
): Promise<boolean> => {
  const category: NotificationCategory = evaluation.status.includes('pending') ? 'approval' : 'evaluation';

  const newNotif: Notification = {
    id: generateUuid(),
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

  const saved = await saveNotificationToSupabase(newNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'workflow', evaluationId: evaluation.id });
  return saved;
};

export const triggerRegistrationNotification = async (newUser: User): Promise<boolean> => {
  const notifId = generateUuid();

  const newNotif: Notification = {
    id: notifId,
    recipientRole: 'system_admin',
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

  const saved = await saveNotificationToSupabase(newNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'registration', userId: newUser.id });
  return saved;
};

export const triggerAnnouncementNotification = async (
  title: string,
  message: string,
  senderName: string,
  recipientRole: string = 'ALL',
  expirationDate?: string
): Promise<boolean> => {
  console.log(`[Broadcast Debug] Broadcast announcement triggered. Target Audience: ${recipientRole}, Title: "${title}"`);

  // Generate a single clean broadcast announcement record for Supabase
  const globalNotif: Notification = {
    id: generateUuid(),
    recipientRole: (recipientRole || 'ALL') as any,
    isAnnouncement: true,
    title,
    message,
    category: 'announcement',
    date: 'Just now',
    read: false,
    type: 'info',
    senderName,
    expirationDate,
    dateTime: new Date().toLocaleString()
  };

  const saved = await saveNotificationToSupabase(globalNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'announcement', title });
  return saved;
};
