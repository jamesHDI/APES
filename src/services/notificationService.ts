import { Notification, Evaluation, User, NotificationCategory, Role } from '../types';
import { saveNotificationToSupabase, saveNotificationsBatchToSupabase, generateUuid, fetchEmployeesFromSupabase } from './supabaseService';
import { triggerRealtimeBroadcast } from './supabaseClient';
import { matchIds, matchNames } from '../utils/supervisorMatching';
import { getStoredUsers } from './storage';

export const INITIAL_SEED_NOTIFICATIONS: Notification[] = [
  {
    id: '00000000-0000-4000-8000-000000000103',
    recipientRole: 'ALL',
    isAnnouncement: true,
    title: 'System Announcement: Performance Evaluation System Active',
    message: 'Welcome to the APES Performance Evaluation System. Please check your assigned scorecard and evaluation deadlines.',
    category: 'announcement',
    date: 'Active',
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

  const curAuthId = (currentUser as any)?.user_id;

  const filtered = notifications.filter((n) => {
    // ── 1. ADMINISTRATIVE & ACCOUNT GOVERNANCE ─────────────────────────────
    // Alerts regarding new user registration, system events, or approval requests
    // must ONLY be visible to System Administrator, HR Administrator, or POD.
    const isAdminAlert =
      n.category === 'account' ||
      n.category === 'system' ||
      n.status === 'pending_approval' ||
      (n.recipientRole as string) === 'ALL_ADMINS';

    if (isAdminAlert) {
      return currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod';
    }

    // ── 2. GLOBAL & BROADCAST ANNOUNCEMENTS ────────────────────────────────
    // Announcements for all employees must never leak confidential reviews.
    if (n.isAnnouncement || n.category === 'announcement' || (n.recipientRole as string) === 'ALL') {
      if (n.recipientDepartment && n.recipientDepartment.trim().length > 0) {
        return Boolean(
          currentUser.departmentName &&
          n.recipientDepartment.trim().toLowerCase() === currentUser.departmentName.trim().toLowerCase()
        );
      }
      return true;
    }

    // ── 3. PRIVATE TARGETED NOTIFICATIONS (userId is explicitly specified) ─
    // When a notification is directed to a specific user (e.g. employee's evaluation returned,
    // scorecard deployed to an employee, private template review feedback), STRICT privacy applies:
    if (n.userId && n.userId.trim().length > 0) {
      // Direct recipient match: currentUser IS the targeted user
      const isDirectMatch =
        matchIds(n.userId, currentUser.id) ||
        (curAuthId && matchIds(n.userId, curAuthId)) ||
        matchIds(n.userId, currentUser.employeeNumber);

      if (isDirectMatch) {
        return true;
      }

      // Reviewer Exception:
      // If the notification represents an action required by a supervisor/reviewer,
      // allow ONLY if currentUser is the verified Immediate Superior or Department Head
      // of the employee who submitted the evaluation or template.
      const isReviewAction = n.type === 'action_required' && (
        n.status === 'submitted_to_is' ||
        n.status === 'is_review' ||
        n.status === 'pending_supervisor' ||
        n.status === 'pending_dept_head' ||
        n.status === 'pending_president'
      );

      if (isReviewAction) {
        if (n.status === 'pending_president') {
          return currentUser.role === 'president';
        }

        const isReviewerRole = currentUser.role === 'supervisor' || currentUser.role === 'dept_head' || currentUser.role === 'president';
        if (isReviewerRole && (n.senderName || n.employeeName)) {
          try {
            const allUsers = getStoredUsers();
            const senderReport = (allUsers || []).find(u =>
              matchNames(u.name, n.senderName) || matchNames(u.name, n.employeeName)
            );

            if (senderReport) {
              const supId = senderReport.immediateSuperiorId || (senderReport as any).immediateSupervisorId;
              const supName = senderReport.immediateSuperiorName || (senderReport as any).immediateSupervisorName;

              // Check if currentUser is the explicit Immediate Supervisor
              if (
                matchIds(supId, currentUser.id) ||
                (curAuthId && matchIds(supId, curAuthId)) ||
                matchNames(supName, currentUser.name)
              ) {
                return true;
              }

              // Check if currentUser is the explicit Department Head
              if (currentUser.role === 'dept_head' && (
                matchIds(senderReport.departmentHeadId, currentUser.id) ||
                (curAuthId && matchIds(senderReport.departmentHeadId, curAuthId)) ||
                matchNames(senderReport.departmentHeadName, currentUser.name)
              )) {
                return true;
              }
            }
          } catch {}
        }
      }

      // PRIVACY BOUNDARY: If targeted to someone else and currentUser is not their authorized reviewer,
      // DO NOT DISPLAY under any circumstances.
      return false;
    }

    // ── 4. BROADCAST ROLE-BASED NOTIFICATIONS (NO target userId) ───────────
    // Only genuine broadcasts that have NO specific userId (e.g. general notice to department heads)
    if (!n.userId && n.recipientRole && n.recipientRole === currentUser.role) {
      // Employees should NEVER receive role-broadcast evaluation alerts without a userId
      if (currentUser.role === 'employee' && n.category === 'approval') {
        return false;
      }

      if (n.recipientDepartment && n.recipientDepartment.trim().length > 0) {
        return Boolean(
          currentUser.departmentName &&
          n.recipientDepartment.trim().toLowerCase() === currentUser.departmentName.trim().toLowerCase()
        );
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
    userId: targetUserId || evaluation.employeeId || (evaluation as any).userId,
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

/**
 * Change 1 — Triggers database-persisted notifications for Evaluation Template workflow actions
 * (Submission to POD, Returning for Revision, POD Approval, and Deployment).
 */
export const triggerTemplateWorkflowNotification = async ({
  targetUserId,
  recipientRole,
  recipientDepartment,
  templateId,
  templateTitle,
  departmentName,
  senderName,
  title,
  message,
  type = 'action_required',
  status = 'submitted_to_pod',
}: {
  targetUserId?: string;
  recipientRole?: Role | 'ALL' | 'ALL_ADMINS';
  recipientDepartment?: string;
  templateId: string;
  templateTitle: string;
  departmentName: string;
  senderName: string;
  title: string;
  message: string;
  type?: 'action_required' | 'info' | 'success' | 'alert';
  status?: string;
}): Promise<boolean> => {
  const newNotif: Notification = {
    id: generateUuid(),
    userId: targetUserId,
    recipientRole,
    recipientDepartment,
    title,
    message,
    category: 'approval',
    date: 'Just now',
    read: false,
    type,
    departmentName,
    status,
    senderName,
    dateTime: new Date().toLocaleString(),
    templateId,
  };

  const saved = await saveNotificationToSupabase(newNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'template_workflow', templateId, status });
  return saved;
};

export const triggerCampaignAccessRequestNotification = async (
  requester: User,
  campaignTitle: string,
  reason: 'closed' | 'overdue' | string,
  userNote?: string,
  deadline?: string,
  evaluationId?: string
): Promise<boolean> => {
  const notifId = generateUuid();
  const reasonText = reason === 'overdue' ? 'Campaign Deadline Expired' : 'Campaign Closed by POD';
  const newNotif: Notification = {
    id: notifId,
    recipientRole: 'pod',
    recipientDepartment: 'People Operations',
    title: `Campaign Access Request: ${requester.name}`,
    message: `${requester.name} (${requester.position || 'Employee'}, ${requester.departmentName || 'Department'}) is requesting access/reactivation for campaign "${campaignTitle}". Status: ${reasonText}.${deadline ? ` Deadline: ${deadline}.` : ''}${userNote ? ` User Note: "${userNote}"` : ''}`,
    category: 'system',
    date: 'Just now',
    read: false,
    type: 'action_required',
    employeeName: requester.name,
    departmentName: requester.departmentName,
    appraisalPeriod: campaignTitle,
    status: 'access_requested',
    senderName: requester.name,
    dateTime: new Date().toLocaleString(),
    evaluationId
  };

  const saved = await saveNotificationToSupabase(newNotif);
  triggerRealtimeBroadcast('data_changed', { type: 'campaign_access_request', userId: requester.id, evaluationId });
  return saved;
};
