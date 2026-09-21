import { Evaluation, EvaluationDeployment, User } from '../types';
import { getStoredDeployments } from '../services/storage';

export interface DeploymentAccessResult {
  isBlocked: boolean;
  reason?: 'closed' | 'overdue' | 'archived';
  title?: string;
  deadline?: string;
  message?: string;
  deployment?: EvaluationDeployment;
}

/**
 * Evaluates whether an evaluation's campaign is closed, archived, or past deadline.
 * If blocked, intended recipients cannot open, access, or edit the evaluation or template.
 * POD and System Admin roles retain administrative access.
 */
export const checkEvaluationAccess = (
  evaluation: Evaluation | null | undefined,
  currentUser: User | null | undefined,
  cachedDeployments?: EvaluationDeployment[]
): DeploymentAccessResult => {
  if (!evaluation) return { isBlocked: false };

  // Governance roles (POD Governance & System Admin) have administrative oversight
  if (currentUser?.role === 'pod' || currentUser?.role === 'system_admin') {
    return { isBlocked: false };
  }

  const deployments = cachedDeployments || getStoredDeployments();

  // Find matching deployment by ID, or by matching appraisal period / title
  const matchingDeployment = evaluation.deploymentId
    ? deployments.find(d => d.id === evaluation.deploymentId)
    : deployments.find(d =>
        (d.period && evaluation.appraisalPeriod && d.period.toLowerCase().trim() === evaluation.appraisalPeriod.toLowerCase().trim()) ||
        (d.title && evaluation.title && d.title.toLowerCase().trim() === evaluation.title.toLowerCase().trim())
      );

  if (matchingDeployment) {
    // 1. Explicitly closed or archived by POD
    if (matchingDeployment.status === 'closed' || matchingDeployment.status === 'archived') {
      return {
        isBlocked: true,
        reason: matchingDeployment.status as 'closed' | 'archived',
        title: matchingDeployment.title,
        deadline: matchingDeployment.endDate,
        deployment: matchingDeployment,
        message: `This Evaluation Deployment Campaign ("${matchingDeployment.title}") has been closed by the People Operations Department (POD). Intended recipients cannot open, access, or edit this evaluation unless POD activates it again.`
      };
    }

    // 2. Deployment status is not active (e.g. draft, scheduled)
    if (matchingDeployment.status !== 'active') {
      return {
        isBlocked: true,
        reason: 'closed',
        title: matchingDeployment.title,
        deadline: matchingDeployment.endDate,
        deployment: matchingDeployment,
        message: `This Evaluation Deployment Campaign is currently ${matchingDeployment.status.toUpperCase()}. Intended recipients cannot access this evaluation until POD activates it.`
      };
    }

    // 3. Overdue / deadline has passed (unless POD set a new deadline or reactivated it)
    const effectiveDeadline = matchingDeployment.endDate || evaluation.deadline;
    if (effectiveDeadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(effectiveDeadline);
      if (!isNaN(deadlineDate.getTime())) {
        deadlineDate.setHours(23, 59, 59, 999);
        if (today.getTime() > deadlineDate.getTime()) {
          return {
            isBlocked: true,
            reason: 'overdue',
            title: matchingDeployment.title,
            deadline: effectiveDeadline,
            deployment: matchingDeployment,
            message: `The deadline (${effectiveDeadline}) for this Evaluation Deployment Campaign ("${matchingDeployment.title}") has passed. Intended recipients cannot open, access, or edit this evaluation unless POD reactivates it or extends the deadline.`
          };
        }
      }
    }
  } else if (evaluation.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(evaluation.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      deadlineDate.setHours(23, 59, 59, 999);
      if (today.getTime() > deadlineDate.getTime()) {
        return {
          isBlocked: true,
          reason: 'overdue',
          title: evaluation.title,
          deadline: evaluation.deadline,
          message: `The deadline (${evaluation.deadline}) for this evaluation has passed. Intended recipients cannot open, access, or edit this evaluation unless POD extends the deadline or reactivates it.`
        };
      }
    }
  }

  return { isBlocked: false };
};
