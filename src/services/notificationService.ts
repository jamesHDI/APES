import { Notification, Evaluation, User, NotificationCategory, Role } from '../types';
import { saveNotificationToSupabase, saveNotificationsBatchToSupabase, generateUuid } from './supabaseService';
import { triggerRealtimeBroadcast } from './supabaseClient';
import { getStoredUsers } from './storage';

const NOTIF_KEY = 'apes_notifications_v3';
const READ_MAP_KEY = 'apes_user_read_map_v3';

export const INITIAL_SEED_NOTIFICATIONS: Notification[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
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
 * Merges remote notifications fetched from Supabase with local notifications store
 * so cross-device/cross-session notifications (like account registration alerts) are persisted locally.
 */
export const mergeRemoteNotifications = (remoteNotifs: Notification[]): Notification[] => {
  const local = getStoredNotifications();
  const map = new Map<string, Notification>();

  // Add existing local notifications
  local.forEach(n => map.set(n.id, n));

  // Merge remote notifications from Supabase
  remoteNotifs.forEach(rn => {
    const existing = map.get(rn.id);
    if (!existing) {
      map.set(rn.id, rn);
    } else {
      map.set(rn.id, {
        ...rn,
        read: existing.read || rn.read,
        readByUsers: Array.from(new Set([...(existing.readByUsers || []), ...(rn.readByUsers || [])]))
      });
    }
  });

  const merged = Array.from(map.values());
  localStorage.setItem(NOTIF_KEY, JSON.stringify(merged));
  return merged;
};

export const getUserReadMap = (): Record<string, Record<string, boolean>> => {
  const data = localStorage.getItem(READ_MAP_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
};

export const saveUserReadMap = (map: Record<string, Record<string, boolean>>) => {
  localStorage.setItem(READ_MAP_KEY, JSON.stringify(map));
};

/**
 * Checks whether a specific notification has been read by the given user.
 */
export const isNotificationReadForUser = (notif: Notification, userId?: string): boolean => {
  if (!userId) return notif.read || false;

  const readMap = getUserReadMap();
  if (readMap[userId]?.[notif.id]) {
    return true;
  }

  if (notif.readByUsers && notif.readByUsers.includes(userId)) {
    return true;
  }

  // If directly targeted to single user ID and marked read
  if (notif.userId === userId && notif.read) {
    return true;
  }

  return false;
};

/**
 * Filter notifications strictly according to recipient rules & security policies,
 * and dynamically evaluate the read status for the specified logged-in user.
 */
export const getRoleBasedNotifications = (currentUser?: User | null): Notification[] => {
  const all = getStoredNotifications();
  if (!currentUser) return [];

  const filtered = all.filter((n) => {
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
 * Marks a notification as READ for the specified user ONLY, keeping read status independent per user.
 */
export const markNotificationAsRead = (notifId: string, currentUserId?: string) => {
  const notifications = getStoredNotifications();

  if (currentUserId) {
    const readMap = getUserReadMap();
    if (!readMap[currentUserId]) readMap[currentUserId] = {};
    readMap[currentUserId][notifId] = true;
    saveUserReadMap(readMap);
  }

  const updated = notifications.map((n) => {
    if (n.id === notifId) {
      const readByUsers = Array.from(new Set([...(n.readByUsers || []), ...(currentUserId ? [currentUserId] : [])]));
      const isTargetedDirect = currentUserId && n.userId === currentUserId;
      return {
        ...n,
        readByUsers,
        read: isTargetedDirect ? true : n.read
      };
    }
    return n;
  });

  localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));

  const target = updated.find(n => n.id === notifId);
  if (target) {
    saveNotificationToSupabase(target);
  }
};

/**
 * Marks all notifications as READ for the logged in user.
 */
export const markAllNotificationsAsReadForUser = (currentUser: User) => {
  const userNotifs = getRoleBasedNotifications(currentUser);
  userNotifs.forEach((n) => {
    markNotificationAsRead(n.id, currentUser.id);
  });
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
  const notifications = getStoredNotifications();
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

  notifications.unshift(newNotif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  const saved = await saveNotificationToSupabase(newNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'workflow', evaluationId: evaluation.id });
  return saved;
};

export const triggerRegistrationNotification = async (newUser: User): Promise<boolean> => {
  const notifications = getStoredNotifications();
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

  notifications.unshift(newNotif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
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
  console.log(`[Broadcast Debug] Broadcast button clicked. Audience: ${recipientRole}, Title: "${title}"`);

  const allUsers = getStoredUsers();
  
  // Filter eligible recipients based on target audience
  let targetUsers = allUsers;
  if (recipientRole === 'ALL' || !recipientRole) {
    targetUsers = allUsers;
  } else if (recipientRole === 'ALL_ADMINS') {
    targetUsers = allUsers.filter(u => u.role === 'system_admin' || u.role === 'hr_admin');
  } else {
    targetUsers = allUsers.filter(u => u.role === recipientRole);
  }

  console.log(`[Broadcast Debug] Target recipients count: ${targetUsers.length}`);

  const notifsToCreate: Notification[] = targetUsers.map(user => ({
    id: generateUuid(),
    userId: user.id,
    recipientRole: user.role,
    recipientDepartment: user.departmentName,
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
  }));

  // Create fallback global notification record with userId = undefined
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
  notifsToCreate.push(globalNotif);

  const notifications = getStoredNotifications();
  notifsToCreate.forEach(n => notifications.unshift(n));
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));

  const saved = await saveNotificationsBatchToSupabase(notifsToCreate);
  console.log(`[Broadcast Debug] Firing Realtime broadcast event across WebSocket channels...`);
  triggerRealtimeBroadcast('data_changed', { type: 'announcement', title, count: notifsToCreate.length });
  return saved;
};
