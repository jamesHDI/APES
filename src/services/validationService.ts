import { Evaluation, User } from '../types';
import { triggerWorkflowNotification } from './notificationService';

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

  // Rule 1: The employee is assigned to a department
  if (!currentUser.departmentName || currentUser.departmentName === 'Unassigned') {
    errors.push('Employee is missing an assigned Department. Submission blocked. Contact HR Administrator.');
  }

  // Rule 2 & 3: Department Head assignment & Active status check
  const deptName = currentUser.departmentName || evaluation.departmentName;
  const deptHeadUser = allUsers.find(
    u => (u.id === currentUser.departmentHeadId) || 
         (u.role === 'dept_head' && u.departmentName === deptName) ||
         (u.isDepartmentHead && u.departmentName === deptName)
  );

  if (!deptHeadUser) {
    errors.push(`No assigned Department Head found for department "${deptName}". Submission blocked.`);
  } else if (deptHeadUser.isActive === false) {
    errors.push(`Assigned Department Head (${deptHeadUser.name}) for "${deptName}" is currently inactive/archived. Submission blocked.`);
  }

  // Rule 4: The evaluation template is assigned
  if (!evaluation.templateId) {
    errors.push('No evaluation template is assigned to this scorecard. Contact HR Administrator.');
  }

  // Stage-specific validation checks
  const isSelfEvalStage = (evaluation.status === 'draft' || evaluation.status === 'reopened') && (currentUser.id === evaluation.employeeId || currentUser.role === 'employee');
  const isDeptHeadReviewerStage = (currentUser.role === 'dept_head' || Boolean(currentUser.isDepartmentHead)) && 
    currentUser.id !== evaluation.employeeId && 
    (evaluation.status === 'pending_dept_head' || evaluation.status === 'employee_submitted' || evaluation.status === 'pending_supervisor');
  const isPresidentStage = currentUser.role === 'president' && (evaluation.status === 'pending_president' || evaluation.status === 'department_head_submitted');
  const isPODStage = (currentUser.role === 'pod' || currentUser.role === 'hr_admin') && evaluation.status === 'pending_pod';

  if (isSelfEvalStage) {
    const unratedKpis = evaluation.kpiRatings.filter(k => !k.selfRating || k.selfRating === 0);
    if (unratedKpis.length > 0) {
      errors.push(`Employee Section Incomplete: ${unratedKpis.length} KPI indicator(s) require self-ratings before submission.`);
    }

    const missingCvComments = evaluation.coreValueRatings.filter(cv => !cv.comments || cv.comments.trim().length === 0);
    if (missingCvComments.length > 0) {
      errors.push('Employee Section Incomplete: Core Values Practice section requires narrative comments for all entries.');
    }

    const hasEmpSig = evaluation.signatures.employee || evaluation.signatures.deptHead || (evaluation.signatures as any).dept_head;
    if (!hasEmpSig) {
      errors.push('Employee Digital Signature Required: Please sign the Employee Self Evaluation section before submitting.');
    }
  }

  if (isDeptHeadReviewerStage) {
    const unratedIsKpis = evaluation.kpiRatings.filter(k => !k.supervisorRating || k.supervisorRating === 0);
    if (unratedIsKpis.length > 0) {
      errors.push(`Department Head Section Incomplete: ${unratedIsKpis.length} KPI indicator(s) require Department Head ratings before submission.`);
    }

    const hasDhSig = evaluation.signatures.deptHead || (evaluation.signatures as any).dept_head || evaluation.signatures.supervisor;
    if (!hasDhSig) {
      errors.push('Department Head Digital Signature Required: Please add your digital signature before forwarding to the next stage.');
    }
  }

  if (isPresidentStage && (evaluation.status === 'pending_president' || evaluation.status === 'department_head_submitted')) {
    if (!evaluation.signatures.president) {
      errors.push('President Digital Signature Required: Executive digital signature must be appended before submitting to POD.');
    }
  }

  if (isPODStage && evaluation.status === 'pending_pod') {
    if (!evaluation.signatures.pod && !evaluation.signatures.hr) {
      errors.push('POD Digital Signature Required: POD digital signature is mandatory before completing and archiving the evaluation.');
    }
  }

  // If configuration validations (Rules 1-4) fail, automatically notify HR Administrator
  const configErrors = errors.filter(e => 
    e.includes('Department') || e.includes('Department Head') || e.includes('template') || e.includes('HR')
  );

  if (configErrors.length > 0) {
    const hrAdmin = allUsers.find(u => u.role === 'hr_admin' || u.role === 'system_admin');
    if (hrAdmin) {
      triggerWorkflowNotification(
        hrAdmin.id,
        evaluation,
        'Action Required: Missing Organizational Configuration',
        `Evaluation submission failed for ${currentUser.name} (${deptName}): ${configErrors.join(' ')}`,
        'System Validator',
        'alert'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

