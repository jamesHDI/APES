import { User, Evaluation, EvaluationWorkflowType, EvaluationStatus } from '../types';

export interface ReviewerInfo {
  reviewerName: string;
  reviewerRole: string;
  currentStatusLabel: string;
  nextStepLabel: string;
  dateSubmitted?: string;
  lastUpdated: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  actorName?: string;
  actorRole?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

/**
 * Determines whether a user is classified as a Department Head.
 */
export const isUserDepartmentHead = (user?: User): boolean => {
  if (!user) return false;
  if (user.isDepartmentHead) return true;
  if (user.role === 'dept_head') return true;
  const pos = (user.position || '').toLowerCase();
  return pos.includes('department head') || pos.includes('dept head') || pos.includes('dept. head');
};

/**
 * Automatically determines the appropriate workflow type for a given user.
 */
export const determineWorkflowType = (user?: User): EvaluationWorkflowType => {
  if (isUserDepartmentHead(user)) {
    return 'WORKFLOW_DEPT_HEAD';
  }
  return 'WORKFLOW_REGULAR';
};

/**
 * Checks if an evaluation cycle is completed and archived.
 */
export const isEvaluationCompleted = (evaluation?: Evaluation | null): boolean => {
  if (!evaluation) return false;
  return evaluation.status === 'pod_validated' || evaluation.status === 'archived';
};

const getEvaluationTimestamp = (e: Evaluation): number => {
  if (!e) return 0;
  let baseTime = 0;

  if ((e as any).releasedAt) {
    const t = new Date((e as any).releasedAt).getTime();
    if (!isNaN(t) && t > 0) baseTime = t;
  }
  if (!baseTime && e.auditTrail && e.auditTrail.length > 0) {
    const firstAudit = e.auditTrail[0]?.timestamp;
    if (firstAudit) {
      const t = new Date(firstAudit).getTime();
      if (!isNaN(t) && t > 0) baseTime = t;
    }
  }
  if (!baseTime && e.updatedAt) {
    const t = new Date(e.updatedAt).getTime();
    if (!isNaN(t) && t > 0) baseTime = t;
  }
  if (!baseTime && e.createdAt) {
    const t = new Date(e.createdAt).getTime();
    if (!isNaN(t) && t > 0) baseTime = t;
  }
  if (!baseTime && e.appraisalDate) {
    const t = new Date(e.appraisalDate).getTime();
    if (!isNaN(t) && t > 0) baseTime = t;
  }
  if (!baseTime) {
    const raw = e.appraisalPeriod || '';
    const yearMatch = String(raw).match(/20\d\d/);
    if (yearMatch) baseTime = new Date(`${yearMatch[0]}-01-01`).getTime();
  }

  let tieBreaker = 0;
  if (e.id) {
    const match = e.id.match(/\d{10,13}/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > 1000000000) tieBreaker = parsed;
    }
  }

  return (baseTime * 1000) + (tieBreaker % 100000000);
};

export const getUserActiveEvaluation = (user: User, evaluations: Evaluation[] = []): Evaluation | null => {
  if (!user) return null;
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanName = (user.name || '').trim().toLowerCase();
  const userEmpNo = (user.employeeNumber || '').trim().toLowerCase();

  const userEvals = evaluations.filter((e) => {
    if (!e || e.status === ('superseded' as any)) return false;
    const eUserId = (e as any).userId;
    const eEmpId = e.employeeId;
    const eEmail = (e.employeeEmail || '').trim().toLowerCase();
    const eName = (e.employeeName || '').trim().toLowerCase();

    const matchesId = (eUserId && eUserId === user.id) || (eEmpId && eEmpId === user.id);
    const matchesEmpNo = userEmpNo && ((eUserId && eUserId.toLowerCase() === userEmpNo) || (eEmpId && eEmpId.toLowerCase() === userEmpNo));
    const matchesEmail = cleanEmail && eEmail && eEmail === cleanEmail;
    const matchesName = cleanName && eName && eName === cleanName;

    return matchesId || matchesEmpNo || matchesEmail || matchesName;
  });

  const sortedEvals = [...userEvals].sort((a, b) => getEvaluationTimestamp(b) - getEvaluationTimestamp(a));
  const activeEval = sortedEvals.find((e) => !isEvaluationCompleted(e));
  return activeEval || sortedEvals[0] || null;
};

export const getUserLatestEvaluation = (user: User, evaluations: Evaluation[] = []): Evaluation | null => {
  if (!user) return null;
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanName = (user.name || '').trim().toLowerCase();
  const userEmpNo = (user.employeeNumber || '').trim().toLowerCase();

  const userEvals = evaluations.filter((e) => {
    if (!e || e.status === ('superseded' as any)) return false;
    const eUserId = (e as any).userId;
    const eEmpId = e.employeeId;
    const eEmail = (e.employeeEmail || '').trim().toLowerCase();
    const eName = (e.employeeName || '').trim().toLowerCase();

    const matchesId = (eUserId && eUserId === user.id) || (eEmpId && eEmpId === user.id);
    const matchesEmpNo = userEmpNo && ((eUserId && eUserId.toLowerCase() === userEmpNo) || (eEmpId && eEmpId.toLowerCase() === userEmpNo));
    const matchesEmail = cleanEmail && eEmail && eEmail === cleanEmail;
    const matchesName = cleanName && eName && eName === cleanName;

    return matchesId || matchesEmpNo || matchesEmail || matchesName;
  });

  if (userEvals.length === 0) return null;
  return [...userEvals].sort((a, b) => getEvaluationTimestamp(b) - getEvaluationTimestamp(a))[0];
};

/**
 * Gets details about the current reviewer and status for an evaluation.
 */
export const getCurrentReviewerInfo = (evaluation: Evaluation, allUsers: User[] = []): ReviewerInfo => {
  const isDeptHeadTrack = evaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || evaluation.isDepartmentHead;
  const lastUpdated = evaluation.updatedAt ? new Date(evaluation.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'Recently';

  const dateSubmitted = evaluation.signatures?.employee?.signedAt || evaluation.signatures?.deptHead?.signedAt || 
    (evaluation.auditTrail && evaluation.auditTrail.find(a => a.actionPerformed.includes('Submit'))?.timestamp);

  const formattedSubmitted = dateSubmitted ? new Date(dateSubmitted).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'Not submitted yet';

  if (isDeptHeadTrack) {
    switch (evaluation.status) {
      case 'draft':
      case 'reopened':
        return {
          reviewerName: evaluation.employeeName,
          reviewerRole: 'Department Head (Self)',
          currentStatusLabel: evaluation.status === 'reopened' ? 'Returned for Revision' : 'Self-Evaluation In Progress',
          nextStepLabel: 'President Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'employee_submitted':
      case 'department_head_submitted':
      case 'pending_president':
        const presidentUser = allUsers.find(u => u.role === 'president') || { name: 'President & CEO' };
        return {
          reviewerName: presidentUser.name || 'President & CEO',
          reviewerRole: 'President & CEO',
          currentStatusLabel: 'Under President Review',
          nextStepLabel: 'POD Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'president_completed':
      case 'pending_pod':
        const podUserDH = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { name: 'Malene Pellazo' };
        return {
          reviewerName: podUserDH.name || 'Malene Pellazo',
          reviewerRole: 'Department Head - People Operations (POD)',
          currentStatusLabel: 'Under POD Review',
          nextStepLabel: 'Final Completion & Archive',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'pod_validated':
      case 'archived':
        return {
          reviewerName: 'System Archive',
          reviewerRole: 'Completed',
          currentStatusLabel: 'Evaluation Completed',
          nextStepLabel: 'None (Completed)',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      default:
        return {
          reviewerName: 'President & CEO',
          reviewerRole: 'Executive Reviewer',
          currentStatusLabel: 'Under Executive Review',
          nextStepLabel: 'POD Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
    }
  } else {
    // Regular Employee Workflow
    switch (evaluation.status) {
      case 'draft':
      case 'reopened':
        return {
          reviewerName: evaluation.employeeName,
          reviewerRole: 'Employee (Self)',
          currentStatusLabel: evaluation.status === 'reopened' ? 'Returned for Revision' : 'Self-Evaluation In Progress',
          nextStepLabel: 'Department Head Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'employee_submitted':
      case 'pending_supervisor':
      case 'pending_dept_head':
        const deptHeadUser = allUsers.find(
          u => (u.role === 'dept_head' && u.departmentName === evaluation.departmentName) ||
               (u.isDepartmentHead && u.departmentName === evaluation.departmentName) ||
               u.id === 'usr_dh_sls'
        );
        return {
          reviewerName: deptHeadUser ? deptHeadUser.name : `${evaluation.departmentName} Department Head`,
          reviewerRole: 'Department Head / Supervisor',
          currentStatusLabel: 'Under Department Head Review',
          nextStepLabel: 'POD Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'supervisor_completed':
      case 'department_head_submitted':
      case 'pending_pod':
        const podUserReg = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { name: 'Malene Pellazo' };
        return {
          reviewerName: podUserReg.name || 'Malene Pellazo',
          reviewerRole: 'Department Head - People Operations (POD)',
          currentStatusLabel: 'Under POD Review',
          nextStepLabel: 'Final Completion & Archive',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      case 'pod_validated':
      case 'archived':
        return {
          reviewerName: 'System Archive',
          reviewerRole: 'Completed',
          currentStatusLabel: 'Evaluation Completed',
          nextStepLabel: 'None (Completed)',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
      default:
        return {
          reviewerName: 'Department Head',
          reviewerRole: 'Immediate Supervisor',
          currentStatusLabel: 'Under Review',
          nextStepLabel: 'POD Review',
          dateSubmitted: formattedSubmitted,
          lastUpdated
        };
    }
  }
};

/**
 * Builds chronological timeline events for an evaluation from audit trail logs.
 */
export const getEvaluationTimelineEvents = (evaluation: Evaluation, allUsers: User[] = []): TimelineEvent[] => {
  const isDeptHeadTrack = evaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || evaluation.isDepartmentHead;
  const events: TimelineEvent[] = [];

  const auditTrail = evaluation.auditTrail || [];

  // Helper to format timestamps cleanly
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Pending';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  // 1. Step 1: Self Evaluation
  const submitAudit = auditTrail.find(a => a.actionPerformed.includes('Submitted') || a.newStatus.includes('pending'));
  const isStep1Done = evaluation.status !== 'draft' && evaluation.status !== 'reopened';
  const isStep1Current = evaluation.status === 'draft' || evaluation.status === 'reopened';

  events.push({
    id: 'step_1_self',
    date: formatDate(submitAudit?.timestamp || evaluation.createdAt),
    title: isDeptHeadTrack ? 'Department Head completed Self-Evaluation' : 'Employee completed Self-Evaluation',
    description: isStep1Done 
      ? `Submitted by ${evaluation.employeeName}` 
      : 'Currently in draft. Awaiting submission.',
    actorName: evaluation.employeeName,
    actorRole: isDeptHeadTrack ? 'Department Head' : 'Employee',
    isCompleted: isStep1Done,
    isCurrent: isStep1Current,
  });

  // 2. Step 2: Next Approver Review (Dept Head or President)
  if (isDeptHeadTrack) {
    const presidentAudit = auditTrail.find(a => a.newStatus === 'pending_pod' || a.actionPerformed.includes('President'));
    const isPresDone = evaluation.status === 'pending_pod' || evaluation.status === 'pod_validated' || evaluation.status === 'archived';
    const isPresCurrent = evaluation.status === 'pending_president' || evaluation.status === 'department_head_submitted';

    const presUser = allUsers.find(u => u.role === 'president');

    events.push({
      id: 'step_2_president',
      date: isPresDone ? formatDate(presidentAudit?.timestamp) : isPresCurrent ? 'Currently Active' : 'Pending',
      title: isPresDone ? 'President completed Executive Review' : 'Submitted to President',
      description: isPresDone 
        ? `Executive review finalized by ${presUser?.name || 'President'}`
        : isPresCurrent 
        ? 'Currently awaiting President Review' 
        : 'Awaiting President review step',
      actorName: presUser?.name || 'President & CEO',
      actorRole: 'President',
      isCompleted: isPresDone,
      isCurrent: isPresCurrent,
    });
  } else {
    // Regular Employee Track
    const deptHeadAudit = auditTrail.find(a => a.newStatus === 'pending_pod' || a.actionPerformed.includes('Department Head'));
    const isDeptDone = evaluation.status === 'pending_pod' || evaluation.status === 'pod_validated' || evaluation.status === 'archived';
    const isDeptCurrent = evaluation.status === 'pending_dept_head' || evaluation.status === 'employee_submitted' || evaluation.status === 'pending_supervisor';

    const deptHeadUser = allUsers.find(
      u => (u.role === 'dept_head' && u.departmentName === evaluation.departmentName) ||
           (u.isDepartmentHead && u.departmentName === evaluation.departmentName)
    );

    events.push({
      id: 'step_2_depthead',
      date: isDeptDone ? formatDate(deptHeadAudit?.timestamp) : isDeptCurrent ? 'Currently Active' : 'Pending',
      title: isDeptDone ? 'Department Head completed review' : 'Submitted to Department Head',
      description: isDeptDone
        ? `Review completed by ${deptHeadUser?.name || 'Department Head'}`
        : isDeptCurrent
        ? 'Currently awaiting Department Head Review'
        : 'Awaiting Department Head review step',
      actorName: deptHeadUser?.name || `${evaluation.departmentName} Department Head`,
      actorRole: 'Department Head',
      isCompleted: isDeptDone,
      isCurrent: isDeptCurrent,
    });
  }

  // 3. Step 3: POD Review
  const podAudit = auditTrail.find(a => a.newStatus === 'archived' || a.actionPerformed.includes('POD'));
  const isPodDone = evaluation.status === 'pod_validated' || evaluation.status === 'archived';
  const isPodCurrent = evaluation.status === 'pending_pod';

  const podUser = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { name: 'Malene Pellazo' };

  events.push({
    id: 'step_3_pod',
    date: isPodDone ? formatDate(podAudit?.timestamp) : isPodCurrent ? 'Currently Active' : 'Pending',
    title: isPodDone ? 'POD Review & Validation Completed' : 'Awaiting POD Review',
    description: isPodDone
      ? `Validated by ${podUser?.name || 'Malene Pellazo'}`
      : isPodCurrent
      ? 'Currently awaiting POD review by Malene Pellazo (Department Head - People Operations)'
      : 'Pending POD team final audit',
    actorName: podUser?.name || 'Malene Pellazo',
    actorRole: 'Department Head - People Operations (POD)',
    isCompleted: isPodDone,
    isCurrent: isPodCurrent,
  });

  // 4. Step 4: Completion
  events.push({
    id: 'step_4_completed',
    date: isPodDone ? formatDate(podAudit?.timestamp || evaluation.updatedAt) : 'Pending',
    title: 'Evaluation Completed & Archived',
    description: isPodDone
      ? 'Final rating locked and added to employee performance record.'
      : 'Pending completion of prior approval stages.',
    actorName: 'System Archive',
    actorRole: 'Archive',
    isCompleted: isPodDone,
    isCurrent: false,
  });

  return events;
};
