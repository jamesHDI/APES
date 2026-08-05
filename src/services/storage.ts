import { User, Department, EvaluationTemplate, EvaluationCycle, EvaluationDeployment, Evaluation, AuditLog, Role } from '../types';
import { MASTER_SALES_EVALUATION_TEMPLATE } from '../constants/masterSalesTemplate';
import { 
  saveEmployeeToSupabase, 
  saveDepartmentToSupabase, 
  saveEvaluationToSupabase 
} from './supabaseService';

const USERS_KEY = 'apes_users_v3';
const CURRENT_USER_KEY = 'apes_current_user_v3';
const DEPARTMENTS_KEY = 'apes_departments_v3';
const TEMPLATES_KEY = 'apes_templates_v3';
const CYCLES_KEY = 'apes_cycles_v3';
const DEPLOYMENTS_KEY = 'apes_deployments_v3';
const EVALUATIONS_KEY = 'apes_evaluations_v3';
const AUDIT_LOGS_KEY = 'apes_audit_logs_v3';

// Initial Pre-seeded Enterprise Data
export const SEED_USERS: User[] = [
  // ── DEFAULT SYSTEM ADMINISTRATOR ─────────────────────────────────────────────
  {
    id: 'usr_default_admin',
    employeeNumber: 'ADMIN-001',
    firstName: 'System',
    middleName: '',
    lastName: 'Administrator',
    name: 'System Administrator',
    email: 'Admin.Systemad@hdiadventures.com',
    username: 'Admin.Systemad',
    password: 'ADMIN',
    contactNumber: '',
    role: 'system_admin',
    departmentId: 'dept_adm',
    departmentName: 'Admin',
    position: 'System Administrator',
    employmentStatus: 'Regular',
    dateHired: '2024-01-01',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    requiresPasswordChange: true,
  },
  // ── OFFICIAL DEPARTMENT HEADS ──────────────────────────────────────────────
  {
    id: 'usr_dh_acc',
    employeeNumber: 'DH-ACC-01',
    firstName: 'Mary Anne',
    lastName: 'Murphy',
    name: 'Mary Anne Murphy',
    email: 'maryanne.murphy@hdiadventures.com',
    username: 'maryanne.murphy',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_acc',
    departmentName: 'Accounting',
    position: 'Department Head - Accounting',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_adm',
    employeeNumber: 'DH-ADM-01',
    firstName: 'James Ivan',
    lastName: 'Abendan',
    name: 'James Ivan Abendan',
    email: 'james.abendan@hdiadventures.com',
    username: 'james.abendan',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_adm',
    departmentName: 'Admin',
    position: 'Department Head - Admin',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_bmc',
    employeeNumber: 'DH-BMC-01',
    firstName: 'Rara',
    lastName: 'Carrillo',
    name: 'Rara Carrillo',
    email: 'rara.carrillo@hdiadventures.com',
    username: 'rara.carrillo',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_bmc',
    departmentName: 'BMC',
    position: 'Department Head - BMC',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_fop',
    employeeNumber: 'DH-FOP-01',
    firstName: 'Emman',
    lastName: 'Buenaventura',
    name: 'Emman Buenaventura',
    email: 'emman.buenaventura@hdiadventures.com',
    username: 'emman.buenaventura',
    role: 'president',
    departmentId: 'dept_fop',
    departmentName: 'Finance / Office of the President',
    position: 'President & Department Head - Finance / Office of the President',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_gaw',
    employeeNumber: 'DH-GAW-01',
    firstName: 'Melette',
    lastName: 'Floresca',
    name: 'Melette Floresca',
    email: 'melette.floresca@hdiadventures.com',
    username: 'melette.floresca',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_gaw',
    departmentName: 'GA & World',
    position: 'Department Head - GA & World',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_leg',
    employeeNumber: 'DH-LGL-01',
    firstName: 'Jem',
    lastName: 'delos Santos',
    name: 'Jem delos Santos',
    email: 'jem.delossantos@hdiadventures.com',
    username: 'jem.delossantos',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_leg',
    departmentName: 'Legal',
    position: 'Department Head - Legal',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_mkt',
    employeeNumber: 'DH-MKT-01',
    firstName: 'Pam',
    lastName: 'Fernando',
    name: 'Pam Fernando',
    email: 'pam.fernando@hdiadventures.com',
    username: 'pam.fernando',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_mkt',
    departmentName: 'Marketing',
    position: 'Department Head - Marketing',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_ops',
    employeeNumber: 'DH-OPS-01',
    firstName: 'Jun',
    lastName: 'Embuido',
    name: 'Jun Embuido',
    email: 'jun.embuido@hdiadventures.com',
    username: 'jun.embuido',
    password: 'password',
    role: 'dept_head',
    departmentId: 'dept_ops',
    departmentName: 'Operations',
    position: 'Department Head - Operations',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr_dh_pohr',
    employeeNumber: 'DH-POHR-01',
    firstName: 'Malene',
    lastName: 'Pellazo',
    name: 'Malene Pellazo',
    email: 'malene.pellazo@hdiadventures.com',
    username: 'malene.pellazo',
    password: 'password',
    role: 'pod',
    departmentId: 'dept_pohr',
    departmentName: 'People Operations (HR)',
    position: 'Department Head - People Operations (HR)',
    isDepartmentHead: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  // ── DEMO REGULAR EMPLOYEES & SUPERVISORS ──────────────────────────────────────
  {
    id: 'usr_sup_sales_01',
    employeeNumber: 'SUP-SLS-01',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    name: 'Juan Dela Cruz',
    email: 'supervisor.sales@hdiadventures.com',
    username: 'supervisor.sales',
    password: 'password',
    contactNumber: '',
    role: 'supervisor',
    departmentId: 'dept_sls',
    departmentName: 'Sales',
    position: 'Sales Team Lead / Immediate Supervisor',
    employmentStatus: 'Regular',
    dateHired: '2023-05-10',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    requiresPasswordChange: false,
  }
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept_acc', name: 'Accounting', code: 'ACC', headId: 'usr_dh_acc', headName: 'Mary Anne Murphy', employeeCount: 10, isActive: true },
  { id: 'dept_adm', name: 'Admin', code: 'ADM', headId: 'usr_dh_adm', headName: 'James Ivan Abendan', employeeCount: 8, isActive: true },
  { id: 'dept_bmc', name: 'BMC', code: 'BMC', headId: 'usr_dh_bmc', headName: 'Rara Carrillo', employeeCount: 12, isActive: true },
  { id: 'dept_fop', name: 'Finance / Office of the President', code: 'FOP', headId: 'usr_dh_fop', headName: 'Emman Buenaventura', employeeCount: 15, isActive: true },
  { id: 'dept_gaw', name: 'GA & World', code: 'GAW', headId: 'usr_dh_gaw', headName: 'Melette Floresca', employeeCount: 14, isActive: true },
  { id: 'dept_leg', name: 'Legal', code: 'LGL', headId: 'usr_dh_leg', headName: 'Jem delos Santos', employeeCount: 6, isActive: true },
  { id: 'dept_mkt', name: 'Marketing', code: 'MKT', headId: 'usr_dh_mkt', headName: 'Pam Fernando', employeeCount: 16, isActive: true },
  { id: 'dept_ops', name: 'Operations', code: 'OPS', headId: 'usr_dh_ops', headName: 'Jun Embuido', employeeCount: 25, isActive: true },
  { id: 'dept_pohr', name: 'People Operations (HR)', code: 'POHR', headId: 'usr_dh_pohr', headName: 'Malene Pellazo', employeeCount: 9, isActive: true },
  { id: 'dept_sls', name: 'Sales', code: 'SLS', headId: 'usr_dh_sls', headName: 'Grazie Esguerra', employeeCount: 22, isActive: true },
];

export const SEED_CYCLES: EvaluationCycle[] = [
  {
    id: 'cycle_2025_annual',
    name: 'FY 2025 Annual Performance Evaluation',
    period: 'January 1, 2025 - December 31, 2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'active',
    totalAssigned: 137,
    completedCount: 42
  }
];

export const SEED_TEMPLATES: EvaluationTemplate[] = [
  MASTER_SALES_EVALUATION_TEMPLATE
];

export const SEED_EVALUATIONS: Evaluation[] = [];

export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (data) {
    try {
      const users: User[] = JSON.parse(data);
      if (users && users.length > 0) {
        return users.filter(u => u.name !== 'Maritess Bacle' && u.name !== 'Grazie Esguerra' && u.id !== 'usr_emp_sales_01' && u.id !== 'usr_dh_sls');
      }
    } catch {}
  }
  return SEED_USERS.filter(u => u.name !== 'Maritess Bacle' && u.name !== 'Grazie Esguerra' && u.id !== 'usr_emp_sales_01' && u.id !== 'usr_dh_sls');
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getStoredCurrentUser = (): User | null => {
  // 1. Try sessionStorage for tab-isolated active user
  const sessionData = sessionStorage.getItem(CURRENT_USER_KEY);
  if (sessionData) {
    try {
      const user: User = JSON.parse(sessionData);
      if (user && user.id) return user;
    } catch {}
  }

  // 2. Fall back to localStorage for single-tab or initial session restoration
  const localData = localStorage.getItem(CURRENT_USER_KEY);
  if (localData) {
    try {
      const user: User = JSON.parse(localData);
      if (user && user.id) {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
      }
    } catch {}
  }
  return null;
};

export const setCurrentUserStore = (user: User) => {
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const clearCurrentUserStore = () => {
  sessionStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getStoredDepartments = (): Department[] => {
  const data = localStorage.getItem(DEPARTMENTS_KEY);
  if (data) {
    try {
      const depts: Department[] = JSON.parse(data);
      const filtered = depts.filter(d => d.name !== 'HDI Adventures' && d.id !== 'dept_hdi');
      // Ensure key departments (Marketing, Operations) are always included
      const hasMkt = filtered.some(d => d.code === 'MKT' || d.name === 'Marketing');
      const hasOps = filtered.some(d => d.code === 'OPS' || d.name === 'Operations');
      if (hasMkt && hasOps && filtered.length >= 10) {
        return filtered;
      }
    } catch {}
  }
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(SEED_DEPARTMENTS));
  return SEED_DEPARTMENTS;
};

export const saveDepartments = (departments: Department[]) => {
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
};

export const getStoredTemplates = (): EvaluationTemplate[] => {
  const data = localStorage.getItem(TEMPLATES_KEY);
  if (data) {
    try {
      const parsed: EvaluationTemplate[] = JSON.parse(data);
      if (parsed && parsed.length > 0) return parsed;
    } catch {}
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(SEED_TEMPLATES));
  return SEED_TEMPLATES;
};

export const saveTemplates = (templates: EvaluationTemplate[]) => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

export const SEED_DEPLOYMENTS: EvaluationDeployment[] = [
  {
    id: 'deploy_2026_annual',
    title: 'FY 2026 Annual Performance Evaluation Cycle',
    period: 'January 1, 2026 - December 31, 2026',
    year: 2026,
    templateId: 'template_sales',
    templateTitle: 'Sales & Corporate Operations Template',
    description: 'Annual enterprise-wide performance evaluation cycle for all HDI departments.',
    startDate: '2026-01-15',
    endDate: '2026-12-31',
    assignmentType: 'all',
    status: 'active',
    totalAssigned: 10,
    completedCount: 2,
    createdBy: 'People Operations Development (POD)',
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15'
  }
];

export const getStoredDeployments = (): EvaluationDeployment[] => {
  const data = localStorage.getItem(DEPLOYMENTS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(SEED_DEPLOYMENTS));
  return SEED_DEPLOYMENTS;
};

export const saveDeployments = (deployments: EvaluationDeployment[]) => {
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(deployments));
};

export const getStoredCycles = (): EvaluationCycle[] => {
  const data = localStorage.getItem(CYCLES_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(CYCLES_KEY, JSON.stringify(SEED_CYCLES));
  return SEED_CYCLES;
};

export const getStoredEvaluations = (): Evaluation[] => {
  const data = localStorage.getItem(EVALUATIONS_KEY);
  if (data) {
    try {
      const evaluations: Evaluation[] = JSON.parse(data);
      if (evaluations && evaluations.length > 0) {
        return evaluations.filter(e => e.employeeName !== 'Maritess Bacle' && e.employeeName !== 'Grazie Esguerra' && e.id !== 'eval_maritess_2025' && e.id !== 'eval_grazie_depthead_2025');
      }
    } catch {}
  }
  return SEED_EVALUATIONS.filter(e => e.employeeName !== 'Maritess Bacle' && e.employeeName !== 'Grazie Esguerra' && e.id !== 'eval_maritess_2025' && e.id !== 'eval_grazie_depthead_2025');
};

export const saveEvaluations = (evaluations: Evaluation[]) => {
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(evaluations));
  evaluations.forEach(e => saveEvaluationToSupabase(e));
};

export const saveSingleEvaluation = (evaluation: Evaluation) => {
  const evaluations = getStoredEvaluations();
  const index = evaluations.findIndex((e) => e.id === evaluation.id);
  let updatedList = [...evaluations];
  if (index >= 0) {
    updatedList[index] = evaluation;
  } else {
    updatedList.unshift(evaluation);
  }
  saveEvaluations(updatedList);
  saveEvaluationToSupabase(evaluation);
};

export const assignNewEvaluationToEmployee = (
  employee: User,
  template: EvaluationTemplate,
  appraisalPeriod: string = 'January - December 2026',
  assignedByName: string = 'People Operations (POD)'
): Evaluation => {
  const isDeptHeadTrack = employee.isDepartmentHead || employee.role === 'dept_head';
  const workflowType = isDeptHeadTrack ? ('WORKFLOW_DEPT_HEAD' as const) : ('WORKFLOW_REGULAR' as const);

  const activeTemplate = (template && template.kraCategories && template.kraCategories.length > 0)
    ? template
    : MASTER_SALES_EVALUATION_TEMPLATE;

  const kpiRatings = activeTemplate.kraCategories.flatMap((kra) =>
    kra.kpis.map((kpi) => ({
      kpiId: kpi.id,
      kraId: kra.id,
      kraName: kra.name,
      name: kpi.name,
      weightPercent: kpi.weightPercent,
      selfRating: 0,
      supervisorRating: 0,
      presidentRating: 0,
      weightedScore: 0,
      comments: '',
      standards: kpi.standards,
      evidenceRequired: kpi.evidenceRequired,
    }))
  );

  const defaultCoreValues = [
    { coreValueId: 'cv_integrity', name: 'Integrity & Ethics', description: 'Upholds highest standards of honesty, fairness, and business ethics.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
    { coreValueId: 'cv_excellence', name: 'Excellence & Performance', description: 'Consistently delivers top-tier results and strives for continuous improvement.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
    { coreValueId: 'cv_teamwork', name: 'Teamwork & Collaboration', description: 'Fosters positive collaboration across departments and supports team goals.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
    { coreValueId: 'cv_accountability', name: 'Accountability & Ownership', description: 'Takes full ownership of duties, commitments, and professional conduct.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' }
  ];

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.substring(0, 10);

  const newEval: Evaluation = {
    id: `eval_${employee.id}_${Date.now()}`,
    cycleId: 'cycle_2026_annual',
    templateId: template.id,
    workflowType,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    departmentName: employee.departmentName || template.departmentName || 'General',
    position: employee.position || 'Staff Specialist',
    isDepartmentHead: isDeptHeadTrack,
    appraisalPeriod,
    appraisalDate: dateStr,
    status: 'draft',
    eligibilityScore: 0,
    coreValuesScore: 0,
    totalEligibilityWeightedRating: 0,
    totalCoreValuesWeightedRating: 0,
    finalRating: 0,
    ratingClassification: 'Pending Evaluation',
    kpiRatings,
    coreValueRatings: defaultCoreValues,
    developmentPlan: { strengths: '', areasForImprovement: '', learningNeeds: [] },
    personnelAction: { actionType: 'no_action' },
    signatures: {},
    evidenceFiles: [],
    auditTrail: [
      {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        performedBy: assignedByName,
        performedByRole: 'ADMIN_POD',
        assignedTo: employee.name,
        actionPerformed: 'Assigned New Evaluation Template',
        previousStatus: 'none',
        newStatus: 'draft',
        remarks: `Assigned new evaluation scorecard for ${appraisalPeriod}.`
      }
    ],
    createdAt: dateStr,
    updatedAt: dateStr
  };

  saveSingleEvaluation(newEval);
  return newEval;
};

export const getStoredAuditLogs = (): AuditLog[] => {
  const data = localStorage.getItem(AUDIT_LOGS_KEY);
  if (data) return JSON.parse(data);
  return [];
};

export const resetToDefaultSeedData = () => {
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(SEED_USERS[0]));
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(SEED_DEPARTMENTS));
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(SEED_TEMPLATES));
  localStorage.setItem(CYCLES_KEY, JSON.stringify(SEED_CYCLES));
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(SEED_EVALUATIONS));
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
};
