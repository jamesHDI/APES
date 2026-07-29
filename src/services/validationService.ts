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

  // Rule 5: All required sections of the evaluation are complete
  // Check if all KPIs have self ratings
  const unratedKpis = evaluation.kpiRatings.filter(k => k.selfRating === undefined || k.selfRating === null || k.selfRating === 0);
  if (unratedKpis.length > 0) {
    errors.push(`Form incomplete: ${unratedKpis.length} KPI indicator(s) require self-ratings before submission.`);
  }

  // Check if Core Values have mandatory narrative comments
  const missingCvComments = evaluation.coreValueRatings.filter(cv => !cv.comments || cv.comments.trim().length === 0);
  if (missingCvComments.length > 0) {
    errors.push('Form incomplete: Core Values Practice section requires narrative comments for all entries.');
  }

  // Digital Signature Check
  if (currentUser.role === 'employee' && !evaluation.signatures.employee) {
    warnings.push('Digital signature by Appraisee is strongly recommended before final submission.');
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

