export type Role = 
  | 'employee' 
  | 'supervisor' 
  | 'dept_head' 
  | 'president' 
  | 'pod' 
  | 'hr_admin' 
  | 'system_admin';

export type EmploymentStatus = 'Regular' | 'Probationary' | 'Contractual' | 'Project-based';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  employeeNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string; // Full name
  email: string;
  contactNumber?: string;
  role: Role;
  departmentId: string;
  departmentName: string;
  position: string;
  employmentStatus?: EmploymentStatus;
  dateHired?: string;
  avatarUrl?: string;
  immediateSuperiorId?: string;
  immediateSuperiorName?: string;
  departmentHeadId?: string;
  departmentHeadName?: string;
  defaultTemplateId?: string;
  username?: string;
  isActive?: boolean;
  isApproved?: boolean;
  approvalStatus?: ApprovalStatus;
  hrRejectionRemarks?: string;
  isDepartmentHead?: boolean;
  // Profile & Auth extras
  personalEmail?: string;
  password?: string;                  // local demo auth only
  requiresPasswordChange?: boolean;   // force change on first login
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headId?: string;
  headName: string;
  defaultTemplateId?: string;
  employeeCount: number;
  isActive?: boolean;
}

export interface Position {
  id: string;
  title: string;
  departmentId: string;
  level: 'Staff' | 'Associate' | 'Officer' | 'Supervisor' | 'Department Head' | 'Executive';
}

export interface RatingStandard {
  rating: 1 | 2 | 3 | 4;
  label: string; 
  description: string;
}

export interface KPITemplateItem {
  id: string;
  kraId: string;
  kraName: string;
  name: string;
  description: string;
  weightPercent: number;
  standards: RatingStandard[];
  evidenceRequired: boolean;
}

export interface KRACategory {
  id: string;
  name: string;
  categoryWeightPercent: number;
  kpis: KPITemplateItem[];
}

export interface EvaluationTemplate {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  evaluationPeriod: string;
  kraCategories: KRACategory[];
  formulaConfig: {
    eligibilityWeight: number;
    coreValuesWeight: number;
  };
  classificationRanges: {
    min: number;
    max: number;
    label: string;
    code: string;
    color: string;
  }[];
  isActive: boolean;
  createdAt: string;
}

export type DeploymentStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';
export type AssignmentType = 'all' | 'departments' | 'employees';

export interface EvaluationDeployment {
  id: string;
  title: string;
  period: string;
  year: number | string;
  templateId: string;
  templateTitle?: string;
  description?: string;
  startDate: string;
  endDate: string; // Deadline
  assignmentType: AssignmentType;
  targetDepartmentIds?: string[];
  targetEmployeeIds?: string[];
  status: DeploymentStatus;
  totalAssigned: number;
  completedCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCycle {
  id: string;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'closed' | 'archived';
  totalAssigned: number;
  completedCount: number;
}

export interface KPIRating {
  kpiId: string;
  kraId: string;
  kraName: string;
  name: string;
  weightPercent: number;
  selfRating: number;
  supervisorRating: number;
  presidentRating?: number;
  weightedScore: number;
  comments: string;
  standards: RatingStandard[];
  evidenceRequired: boolean;
}

export interface CoreValue {
  id: string;
  name: string;
  description: string;
}

export interface CoreValueRating {
  coreValueId: string;
  name: string;
  description: string;
  podRating: number;   
  peerRating: number;  
  isRating: number;    
  avgRating: number;   
  weightedScore: number; 
  comments: string;
}

export interface LearningNeed {
  id: string;
  program: string;
  targetDate: string;
  responsiblePerson: string;
  progressPercent: number;
}

export interface DevelopmentPlan {
  strengths: string;
  areasForImprovement: string;
  learningNeeds: LearningNeed[];
}

export type ActionType = 
  | 'promotion'
  | 'salary_adjustment'
  | 'regularization'
  | 'transfer'
  | 'pip'
  | 'termination'
  | 'no_action';

export interface PersonnelAction {
  actionType: ActionType;
  newPosition?: string;
  effectiveDate?: string;
  remarks?: string;
  recommendedBy?: string;
  recommendedDate?: string;
  isApproved?: boolean;
}

export interface DigitalSignature {
  role: 'employee' | 'supervisor' | 'dept_head' | 'president' | 'pod' | 'hr';
  signerName: string;
  signatureDataUrl: string;
  signedAt: string;
  ipAddress?: string;
  employeeId?: string;
  position?: string;
  department?: string;
  dateSigned?: string;
  timeSigned?: string;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  url: string;
}

export type EvaluationWorkflowType = 
  | 'WORKFLOW_REGULAR' 
  | 'WORKFLOW_NO_IS' 
  | 'WORKFLOW_DEPT_HEAD' 
  | 'WORKFLOW_A' 
  | 'WORKFLOW_B';

export type EvaluationStatus = 
  | 'draft'
  | 'employee_submitted'
  | 'department_head_submitted'
  | 'pending_supervisor'
  | 'pending_dept_head'
  | 'pending_president'
  | 'pending_pod'
  | 'supervisor_completed'
  | 'president_completed'
  | 'pod_validated'
  | 'archived'
  | 'reopened';

export interface EvaluationStepHistory {
  stepId: string;
  stepLabel: string;
  approverName: string;
  approverRole: string;
  completedAt: string;
}

export interface EvaluationAuditTrailEntry {
  id: string;
  timestamp: string;
  performedBy: string;
  performedByRole: string;
  assignedTo: string;
  actionPerformed: string;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  ipAddress?: string;
}

export interface Evaluation {
  id: string;
  cycleId: string;
  templateId: string;
  workflowType: EvaluationWorkflowType;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  position: string;
  isDepartmentHead?: boolean;
  appraisalPeriod: string;
  appraisalDate: string;
  deploymentId?: string;
  deadline?: string;
  returnReason?: string;
  returnedBy?: string;
  returnedByRole?: string;
  status: EvaluationStatus;
  
  // Real-time Calculated Metrics
  eligibilityScore: number;
  coreValuesScore: number; 
  totalEligibilityWeightedRating: number;
  totalCoreValuesWeightedRating: number; 
  finalRating: number;
  ratingClassification: string;

  kpiRatings: KPIRating[];
  coreValueRatings: CoreValueRating[];
  developmentPlan: DevelopmentPlan;
  personnelAction: PersonnelAction;
  signatures: {
    employee?: DigitalSignature;
    supervisor?: DigitalSignature;
    deptHead?: DigitalSignature;
    president?: DigitalSignature;
    pod?: DigitalSignature;
    hr?: DigitalSignature;
  };
  evidenceFiles: EvidenceFile[];
  stepHistory?: EvaluationStepHistory[];
  auditTrail?: EvaluationAuditTrailEntry[];
  appraiseeSummaryComment?: string;
  supervisorSummaryComment?: string;
  presidentSummaryComment?: string;
  podValidationComment?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationCategory = 'evaluation' | 'account' | 'approval' | 'system' | 'announcement';

export interface Notification {
  id: string;
  userId?: string;
  recipientRole?: Role | 'ALL' | 'ALL_ADMINS';
  recipientDepartment?: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  date: string;
  read: boolean;
  link?: string;
  actionLink?: string;
  type: 'info' | 'action_required' | 'success' | 'alert';
  isAnnouncement?: boolean;
  expirationDate?: string;
  employeeName?: string;
  departmentName?: string;
  appraisalPeriod?: string;
  status?: string;
  senderName?: string;
  dateTime?: string;
  evaluationId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress?: string;
}
