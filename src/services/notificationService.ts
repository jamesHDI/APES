import { Notification, Evaluation, User } from '../types';
import { saveNotificationToSupabase } from './supabaseService';

const NOTIF_KEY = 'apes_notifications_v3';

export const getStoredNotifications = (userId?: string): Notification[] => {
  const data = localStorage.getItem(NOTIF_KEY);
  let all: Notification[] = data ? JSON.parse(data) : [
    {
      id: 'notif_01',
      userId: 'usr_sup_01',
      title: 'Action Required: Employee Self-Evaluation Submitted',
      message: 'Maritess Bacle has submitted her Sales Performance Scorecard for your review.',
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
      title: 'Action Required: Department Head Scorecard Review',
      message: 'Elena Rostova (Head of Sales) has submitted her self-assessment for Presidential Executive Review.',
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
    }
  ];

  if (userId) {
    return all.filter((n) => n.userId === userId || n.userId === 'ALL' || n.userId === 'ALL_ADMINS' || n.userId === 'usr_default_admin');
  }
  return all;
};

export const triggerWorkflowNotification = (
  targetUserId: string,
  evaluation: Evaluation,
  title: string,
  message: string,
  senderName: string,
  type: 'action_required' | 'info' | 'success' | 'alert' = 'action_required'
) => {
  const notifications = getStoredNotifications();
  const newNotif: Notification = {
    id: `notif_${Date.now()}`,
    userId: targetUserId,
    title,
    message,
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
    userId: 'usr_default_admin', // Target default admin and admin accounts
    title: 'New Employee Registration Pending Approval',
    message: `${newUser.name} (${newUser.email}) registered for ${newUser.position} in ${newUser.departmentName} and requires HR/Admin approval.`,
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

export const markNotificationAsRead = (notifId: string) => {
  const notifications = getStoredNotifications();
  const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  const target = updated.find(n => n.id === notifId);
  if (target) {
    saveNotificationToSupabase(target);
  }
};
