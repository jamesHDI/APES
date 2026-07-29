import { Evaluation, User } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEvaluationForSubmission(
  evaluation: Evaluation,
  currentUser: User,
  allUsers: User[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Organizational Hierarchy Validation
  if (!currentUser.departmentName || currentUser.departmentName === 'Unassigned') {
    errors.push('Employee is missing an assigned Department. Contact HR to complete organizational profile.');
  }

  if (!currentUser.position) {
    errors.push('Employee is missing an assigned Position.');
  }

  // Check reporting line based on workflow type
  if (evaluation.workflowType === 'WORKFLOW_REGULAR' || evaluation.workflowType === 'WORKFLOW_A') {
    if (!currentUser.immediateSuperiorId) {
      errors.push('Missing assigned Immediate Superior (IS) in reporting line. Contact HR to assign IS.');
    } else {
      const isUser = allUsers.find(u => u.id === currentUser.immediateSuperiorId);
      if (isUser && isUser.isActive === false) {
        errors.push(`Assigned Immediate Superior (${isUser.name}) is currently inactive/archived.`);
      }
    }
  } else if (evaluation.workflowType === 'WORKFLOW_NO_IS') {
    if (!currentUser.departmentHeadId && !currentUser.immediateSuperiorId) {
      errors.push('Missing assigned Department Head for reporting line.');
    }
  }

  // 2. Form Completeness Validation
  // Check if all KPIs have ratings
  const unratedKpis = evaluation.kpiRatings.filter(k => (!k.selfRating && !k.supervisorRating && !k.presidentRating));
  if (unratedKpis.length > 0) {
    errors.push(`${unratedKpis.length} KPI indicator(s) remain unrated.`);
  }

  // Check if Core Values have mandatory comments
  const missingCvComments = evaluation.coreValueRatings.filter(cv => !cv.comments || cv.comments.trim().length === 0);
  if (missingCvComments.length > 0) {
    errors.push('Core Values Practice section requires specific narrative comments.');
  }

  // Check if digital signature is attached for the current submitter
  const role = currentUser.role;
  if (role === 'employee' && !evaluation.signatures.employee) {
    warnings.push('Digital signature by Appraisee is recommended before submission.');
  } else if (role === 'supervisor' && !evaluation.signatures.supervisor) {
    warnings.push('Digital signature by Immediate Superior is recommended.');
  } else if (role === 'president' && !evaluation.signatures.president) {
    warnings.push('Digital signature by President is recommended.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
