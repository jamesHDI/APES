import { User, Department, EvaluationTemplate, EvaluationCycle, Evaluation, AuditLog, Role } from '../types';
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
    departmentId: 'dept_it',
    departmentName: 'General Administration',
    position: 'System Administrator',
    employmentStatus: 'Regular',
    dateHired: '2024-01-01',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    requiresPasswordChange: true,
  },
  {
    id: 'usr_emp_01',
    employeeNumber: 'EMP-1001',
    firstName: 'Maritess',
    middleName: 'Santos',
    lastName: 'Bacle',
    name: 'Maritess Bacle',
    email: 'maritess.bacle@hdiadventures.com',
    contactNumber: '+63 917 123 4567',
    role: 'employee',
    departmentId: 'dept_sales',
    departmentName: 'Sales',
    position: 'Senior Sales Executive',
    employmentStatus: 'Regular',
    dateHired: '2021-03-15',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    immediateSuperiorId: 'usr_sup_01',
    immediateSuperiorName: 'Roberto Garcia',
    departmentHeadId: 'usr_depthead_01',
    departmentHeadName: 'Elena Rostova',
    username: 'maritess.bacle',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  {
    id: 'usr_sup_01',
    employeeNumber: 'EMP-1002',
    firstName: 'Roberto',
    middleName: 'Del Cruz',
    lastName: 'Garcia',
    name: 'Roberto Garcia',
    email: 'roberto.garcia@hdiadventures.com',
    contactNumber: '+63 918 234 5678',
    role: 'supervisor',
    departmentId: 'dept_sales',
    departmentName: 'Sales',
    position: 'Sales Team Leader',
    employmentStatus: 'Regular',
    dateHired: '2019-06-01',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    immediateSuperiorId: 'usr_depthead_01',
    immediateSuperiorName: 'Elena Rostova',
    username: 'roberto.garcia',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  {
    id: 'usr_depthead_01',
    employeeNumber: 'EMP-1003',
    firstName: 'Elena',
    middleName: 'Vance',
    lastName: 'Rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@hdiadventures.com',
    contactNumber: '+63 919 345 6789',
    role: 'dept_head',
    departmentId: 'dept_sales',
    departmentName: 'Sales',
    position: 'Head of Sales Department',
    employmentStatus: 'Regular',
    dateHired: '2017-01-10',
    isDepartmentHead: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    immediateSuperiorId: 'usr_pres_01',
    immediateSuperiorName: 'Dr. Gabriel Santos',
    username: 'elena.rostova',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  {
    id: 'usr_pres_01',
    employeeNumber: 'EMP-1000',
    firstName: 'Dr. Gabriel',
    middleName: 'M.',
    lastName: 'Santos',
    name: 'Dr. Gabriel Santos',
    email: 'gabriel.santos@hdiadventures.com',
    contactNumber: '+63 920 456 7890',
    role: 'president',
    departmentId: 'dept_genadmin',
    departmentName: 'Executive Office',
    position: 'President & CEO',
    employmentStatus: 'Regular',
    dateHired: '2010-01-01',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    username: 'gabriel.santos',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  {
    id: 'usr_pod_01',
    employeeNumber: 'EMP-1004',
    firstName: 'Maria',
    middleName: 'Clara',
    lastName: 'Reyes',
    name: 'Maria Clara',
    email: 'maria.clara@hdiadventures.com',
    contactNumber: '+63 921 567 8901',
    role: 'pod',
    departmentId: 'dept_hr',
    departmentName: 'Human Resources',
    position: 'POD Governance Director',
    employmentStatus: 'Regular',
    dateHired: '2018-04-12',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    username: 'maria.clara',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  {
    id: 'usr_hr_01',
    employeeNumber: 'EMP-1005',
    firstName: 'Patricia',
    middleName: 'Luna',
    lastName: 'Mendoza',
    name: 'Patricia Mendoza',
    email: 'patricia.mendoza@hdiadventures.com',
    contactNumber: '+63 922 678 9012',
    role: 'hr_admin',
    departmentId: 'dept_hr',
    departmentName: 'Human Resources',
    position: 'HR Administrator',
    employmentStatus: 'Regular',
    dateHired: '2020-02-01',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    username: 'patricia.mendoza',
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  }
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept_hdi', name: 'HDI Adventures', code: 'HDIA', headName: 'Carlos Rossi', employeeCount: 18, isActive: true },
  { id: 'dept_fin', name: 'Finance', code: 'FIN', headName: 'Arthur Dent', employeeCount: 12, isActive: true },
  { id: 'dept_sales', name: 'Sales', code: 'SLS', headId: 'usr_depthead_01', headName: 'Elena Rostova', employeeCount: 24, isActive: true },
  { id: 'dept_genadmin', name: 'General Administration', code: 'GAD', headName: 'Dr. Gabriel Santos', employeeCount: 15, isActive: true },
  { id: 'dept_ops', name: 'Operations', code: 'OPS', headName: 'Marcus Aurelius', employeeCount: 30, isActive: true },
  { id: 'dept_crt', name: 'Creatives', code: 'CRT', headName: 'Sofia Ramos', employeeCount: 10, isActive: true },
  { id: 'dept_mkt', name: 'Marketing', code: 'MKT', headName: 'David Lee', employeeCount: 14, isActive: true },
  { id: 'dept_leg', name: 'Legal', code: 'LGL', headName: 'Atty. Samantha Cruz', employeeCount: 6, isActive: true },
  { id: 'dept_hr', name: 'Human Resources', code: 'HRD', headName: 'Maria Clara', employeeCount: 8, isActive: true },
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
  {
    id: 'template_sales',
    title: 'Sales Performance Scorecard Standard',
    departmentId: 'dept_sales',
    departmentName: 'Sales',
    evaluationPeriod: 'FY 2025',
    formulaConfig: { eligibilityWeight: 85, coreValuesWeight: 15 },
    classificationRanges: [
      { min: 3.51, max: 4.00, label: 'Outstanding (EE)', code: 'EE', color: 'emerald' },
      { min: 3.00, max: 3.50, label: 'Very Satisfactory (ME)', code: 'ME', color: 'blue' },
      { min: 2.50, max: 2.99, label: 'Satisfactory (BME)', code: 'BME', color: 'amber' },
      { min: 2.00, max: 2.49, label: 'Needs Improvement (NI)', code: 'NI', color: 'orange' },
      { min: 1.00, max: 1.99, label: 'Unsatisfactory (DME)', code: 'DME', color: 'rose' }
    ],
    isActive: true,
    createdAt: '2025-01-01',
    kraCategories: [
      {
        id: 'kra_sales_target',
        name: 'FINANCIAL & SALES TARGET ACCELERATION',
        categoryWeightPercent: 40,
        kpis: [
          {
            id: 'kpi_revenue_quota',
            kraId: 'kra_sales_target',
            kraName: 'FINANCIAL & SALES TARGET ACCELERATION',
            name: 'Gross Annual Sales Revenue Quota',
            description: 'Achieve 100% of target quarterly sales quota',
            weightPercent: 25,
            evidenceRequired: true,
            standards: [
              { rating: 4, label: 'Exceeds Expectations', description: 'Achieves > 115% of quota' },
              { rating: 3, label: 'Meets Expectations', description: 'Achieves 100% - 114% of quota' },
              { rating: 2, label: 'Barely Meets Expectations', description: 'Achieves 85% - 99% of quota' },
              { rating: 1, label: 'Did Not Meet Expectations', description: 'Achieves < 85% of quota' }
            ]
          },
          {
            id: 'kpi_new_accounts',
            kraId: 'kra_sales_target',
            kraName: 'FINANCIAL & SALES TARGET ACCELERATION',
            name: 'New B2B Account Acquisition',
            description: 'Acquire minimum 12 new corporate clients per annum',
            weightPercent: 15,
            evidenceRequired: false,
            standards: [
              { rating: 4, label: 'Exceeds Expectations', description: '>= 16 new accounts' },
              { rating: 3, label: 'Meets Expectations', description: '12 - 15 new accounts' },
              { rating: 2, label: 'Barely Meets Expectations', description: '8 - 11 new accounts' },
              { rating: 1, label: 'Did Not Meet Expectations', description: '< 8 new accounts' }
            ]
          }
        ]
      },
      {
        id: 'kra_cust_rel',
        name: 'CUSTOMER RELATIONSHIP MANAGEMENT & RETENTION',
        categoryWeightPercent: 30,
        kpis: [
          {
            id: 'kpi_retention_rate',
            kraId: 'kra_cust_rel',
            kraName: 'CUSTOMER RELATIONSHIP MANAGEMENT & RETENTION',
            name: 'Key Account Retention & Renewal Rate',
            description: 'Maintain high client retention rate',
            weightPercent: 20,
            evidenceRequired: true,
            standards: [
              { rating: 4, label: 'Exceeds Expectations', description: '>= 95% retention' },
              { rating: 3, label: 'Meets Expectations', description: '88% - 94% retention' },
              { rating: 2, label: 'Barely Meets Expectations', description: '80% - 87% retention' },
              { rating: 1, label: 'Did Not Meet Expectations', description: '< 80% retention' }
            ]
          },
          {
            id: 'kpi_csat',
            kraId: 'kra_cust_rel',
            kraName: 'CUSTOMER RELATIONSHIP MANAGEMENT & RETENTION',
            name: 'Customer Satisfaction Score (CSAT)',
            description: 'Achieve minimum CSAT rating of 4.5/5',
            weightPercent: 10,
            evidenceRequired: false,
            standards: [
              { rating: 4, label: 'Exceeds Expectations', description: 'CSAT 4.8 - 5.0' },
              { rating: 3, label: 'Meets Expectations', description: 'CSAT 4.5 - 4.7' },
              { rating: 2, label: 'Barely Meets Expectations', description: 'CSAT 4.0 - 4.4' },
              { rating: 1, label: 'Did Not Meet Expectations', description: 'CSAT < 4.0' }
            ]
          }
        ]
      },
      {
        id: 'kra_process_ops',
        name: 'OPERATIONAL EXCELLENCE & REPORTING',
        categoryWeightPercent: 15,
        kpis: [
          {
            id: 'kpi_crm_updates',
            kraId: 'kra_process_ops',
            kraName: 'OPERATIONAL EXCELLENCE & REPORTING',
            name: 'Daily CRM Pipeline Compliance',
            description: '100% compliant logging of leads and opportunities',
            weightPercent: 15,
            evidenceRequired: false,
            standards: [
              { rating: 4, label: 'Exceeds Expectations', description: 'Zero errors' },
              { rating: 3, label: 'Meets Expectations', description: 'Minor delays' },
              { rating: 2, label: 'Barely Meets Expectations', description: 'Frequent gaps' },
              { rating: 1, label: 'Did Not Meet Expectations', description: 'Non-compliant' }
            ]
          }
        ]
      }
    ]
  }
];

export const SEED_EVALUATIONS: Evaluation[] = [
  // Workflow A: Regular Employee (Maritess Bacle)
  {
    id: 'eval_maritess_2025',
    cycleId: 'cycle_2025_annual',
    templateId: 'template_sales',
    workflowType: 'WORKFLOW_REGULAR',
    employeeId: 'usr_emp_01',
    employeeName: 'Maritess Bacle',
    departmentName: 'Sales',
    position: 'Senior Sales Executive',
    appraisalPeriod: 'January - September 2025',
    appraisalDate: '2025-09-30',
    status: 'pending_supervisor',
    eligibilityScore: 2.85,
    coreValuesScore: 3.00,
    totalEligibilityWeightedRating: 2.85,
    totalCoreValuesWeightedRating: 0.45,
    finalRating: 3.30,
    ratingClassification: 'Very Satisfactory (ME)',
    kpiRatings: [
      {
        kpiId: 'kpi_revenue_quota',
        kraId: 'kra_sales_target',
        kraName: 'FINANCIAL & SALES TARGET ACCELERATION',
        name: 'Gross Annual Sales Revenue Quota',
        weightPercent: 25,
        selfRating: 3,
        supervisorRating: 3,
        weightedScore: 0.75,
        comments: 'Achieved 108% of target sales quota for Q1-Q3.',
        standards: SEED_TEMPLATES[0].kraCategories[0].kpis[0].standards,
        evidenceRequired: true
      },
      {
        kpiId: 'kpi_new_accounts',
        kraId: 'kra_sales_target',
        kraName: 'FINANCIAL & SALES TARGET ACCELERATION',
        name: 'New B2B Account Acquisition',
        weightPercent: 15,
        selfRating: 4,
        supervisorRating: 3,
        weightedScore: 0.45,
        comments: 'Acquired 14 new corporate enterprise accounts.',
        standards: SEED_TEMPLATES[0].kraCategories[0].kpis[1].standards,
        evidenceRequired: false
      },
      {
        kpiId: 'kpi_retention_rate',
        kraId: 'kra_cust_rel',
        kraName: 'CUSTOMER RELATIONSHIP MANAGEMENT & RETENTION',
        name: 'Key Account Retention & Renewal Rate',
        weightPercent: 20,
        selfRating: 4,
        supervisorRating: 4,
        weightedScore: 0.80,
        comments: 'Maintained 96% client renewal rate.',
        standards: SEED_TEMPLATES[0].kraCategories[1].kpis[0].standards,
        evidenceRequired: true
      },
      {
        kpiId: 'kpi_csat',
        kraId: 'kra_cust_rel',
        kraName: 'CUSTOMER RELATIONSHIP MANAGEMENT & RETENTION',
        name: 'Customer Satisfaction Score (CSAT)',
        weightPercent: 10,
        selfRating: 3,
        supervisorRating: 3,
        weightedScore: 0.30,
        comments: 'Averaged 4.6/5.0 CSAT rating.',
        standards: SEED_TEMPLATES[0].kraCategories[1].kpis[1].standards,
        evidenceRequired: false
      },
      {
        kpiId: 'kpi_crm_updates',
        kraId: 'kra_process_ops',
        kraName: 'OPERATIONAL EXCELLENCE & REPORTING',
        name: 'Daily CRM Pipeline Compliance',
        weightPercent: 15,
        selfRating: 3,
        supervisorRating: 3,
        weightedScore: 0.45,
        comments: 'Logged daily CRM activities.',
        standards: SEED_TEMPLATES[0].kraCategories[2].kpis[0].standards,
        evidenceRequired: false
      }
    ],
    coreValueRatings: [
      { coreValueId: 'cv_integrity', name: 'Integrity & Ethics', description: 'Honesty and transparency', podRating: 3, peerRating: 3, isRating: 3, avgRating: 3.0, weightedScore: 0.45, comments: 'Consistently demonstrates honesty.' },
      { coreValueId: 'cv_respect', name: 'Respect & Dignity', description: 'Treats all team members with fairness', podRating: 3, peerRating: 3, isRating: 3, avgRating: 3.0, weightedScore: 0.45, comments: 'Promotes inclusive team environment.' }
    ],
    developmentPlan: {
      strengths: 'Strong client negotiation skills and high retention rate.',
      areasForImprovement: 'Enhance enterprise contract closing turnaround time.',
      learningNeeds: [
        { id: 'ln_01', program: 'Advanced B2B Enterprise Selling', targetDate: '2025-11-30', responsiblePerson: 'HR POD', progressPercent: 40 }
      ]
    },
    personnelAction: {
      actionType: 'salary_adjustment',
      remarks: 'Recommended for 7% annual merit salary increase.',
      recommendedBy: 'Roberto Garcia (Supervisor)'
    },
    signatures: {
      employee: {
        role: 'employee',
        signerName: 'Maritess Bacle',
        signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="30" font-family="cursive" font-size="20">Maritess Bacle</text></svg>',
        signedAt: '2025-09-30 14:30'
      }
    },
    evidenceFiles: [
      {
        id: 'ev_01',
        fileName: 'Q1_Q3_Sales_Report_Summary.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 245000,
        uploadDate: '2025-09-30',
        url: 'https://example.com/files/Q1_Q3_Sales_Report_Summary.xlsx'
      }
    ],
    auditTrail: [
      {
        id: 'audit_01',
        timestamp: '2025-09-30 14:30:00',
        performedBy: 'Maritess Bacle',
        performedByRole: 'EMPLOYEE',
        assignedTo: 'Roberto Garcia (Supervisor)',
        actionPerformed: 'Submitted Self-Evaluation',
        previousStatus: 'draft',
        newStatus: 'pending_supervisor',
        remarks: 'Submitted for supervisor review.'
      }
    ],
    createdAt: '2025-09-01',
    updatedAt: '2025-09-30'
  },

  // Workflow B: Department Head (Elena Rostova)
  {
    id: 'eval_elena_depthead_2025',
    cycleId: 'cycle_2025_annual',
    templateId: 'template_sales',
    workflowType: 'WORKFLOW_DEPT_HEAD',
    employeeId: 'usr_depthead_01',
    employeeName: 'Elena Rostova',
    departmentName: 'Sales',
    position: 'Head of Sales Department',
    isDepartmentHead: true,
    appraisalPeriod: 'January - September 2025',
    appraisalDate: '2025-09-30',
    status: 'pending_president',
    eligibilityScore: 3.20,
    coreValuesScore: 3.67,
    totalEligibilityWeightedRating: 3.20,
    totalCoreValuesWeightedRating: 0.55,
    finalRating: 3.75,
    ratingClassification: 'Outstanding (EE)',
    kpiRatings: [
      {
        kpiId: 'kpi_revenue_quota',
        kraId: 'kra_sales_target',
        kraName: 'FINANCIAL & SALES TARGET ACCELERATION',
        name: 'Gross Annual Sales Revenue Quota',
        weightPercent: 25,
        selfRating: 4,
        supervisorRating: 4,
        presidentRating: 4,
        weightedScore: 1.00,
        comments: 'Department exceeded revenue targets by 122%.',
        standards: SEED_TEMPLATES[0].kraCategories[0].kpis[0].standards,
        evidenceRequired: true
      }
    ],
    coreValueRatings: [
      { coreValueId: 'cv_integrity', name: 'Integrity & Ethics', description: 'Executive role model', podRating: 4, peerRating: 4, isRating: 4, avgRating: 4.0, weightedScore: 0.60, comments: 'Exemplary leadership integrity.' }
    ],
    developmentPlan: {
      strengths: 'Executive strategic leadership and multi-market expansion.',
      areasForImprovement: 'Global APAC market penetration.',
      learningNeeds: []
    },
    personnelAction: {
      actionType: 'promotion',
      newPosition: 'Executive Vice President of Commercial Operations',
      remarks: 'Recommended for Executive VP Promotion.',
      recommendedBy: 'Dr. Gabriel Santos (President)'
    },
    signatures: {
      deptHead: {
        role: 'dept_head',
        signerName: 'Elena Rostova',
        signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="30" font-family="cursive" font-size="20">Elena Rostova</text></svg>',
        signedAt: '2025-09-29 10:15'
      }
    },
    evidenceFiles: [],
    auditTrail: [
      {
        id: 'audit_depthead_01',
        timestamp: '2025-09-29 10:15:00',
        performedBy: 'Elena Rostova',
        performedByRole: 'DEPT_HEAD',
        assignedTo: 'Dr. Gabriel Santos (President)',
        actionPerformed: 'Submitted Department Head Self-Assessment',
        previousStatus: 'draft',
        newStatus: 'pending_president',
        remarks: 'Submitted for Presidential review.'
      }
    ],
    createdAt: '2025-09-01',
    updatedAt: '2025-09-29'
  }
];

export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (data) {
    try {
      let users: User[] = JSON.parse(data);
      // Remove deprecated secondary system admin if present
      users = users.filter(u => u.id !== 'usr_sys_01');

      const adminIdx = users.findIndex(u => u.email.toLowerCase() === 'admin.systemad@hdiadventures.com' || u.id === 'usr_default_admin');
      const adminSeed = SEED_USERS.find(u => u.id === 'usr_default_admin');
      
      if (adminSeed) {
        if (adminIdx >= 0) {
          users[adminIdx] = {
            ...adminSeed,
            ...users[adminIdx],
            password: users[adminIdx].password || adminSeed.password || 'ADMIN',
            email: adminSeed.email,
            username: adminSeed.username,
            role: 'system_admin',
            isActive: true,
            isApproved: true,
            approvalStatus: 'approved',
          };
        } else {
          users = [adminSeed, ...users];
        }
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return users;
      }
    } catch {
      // JSON parse fallback
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Sync to Supabase in background if configured
  users.forEach(u => saveEmployeeToSupabase(u));
};

export const getStoredCurrentUser = (): User => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (data) return JSON.parse(data);
  const defaultUser = SEED_USERS[0];
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
};

export const setCurrentUserStore = (user: User) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getStoredDepartments = (): Department[] => {
  const data = localStorage.getItem(DEPARTMENTS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(SEED_DEPARTMENTS));
  return SEED_DEPARTMENTS;
};

export const saveDepartments = (departments: Department[]) => {
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
  departments.forEach(d => saveDepartmentToSupabase(d));
};

export const getStoredTemplates = (): EvaluationTemplate[] => {
  const data = localStorage.getItem(TEMPLATES_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(SEED_TEMPLATES));
  return SEED_TEMPLATES;
};

export const saveTemplates = (templates: EvaluationTemplate[]) => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

export const getStoredCycles = (): EvaluationCycle[] => {
  const data = localStorage.getItem(CYCLES_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(CYCLES_KEY, JSON.stringify(SEED_CYCLES));
  return SEED_CYCLES;
};

export const getStoredEvaluations = (): Evaluation[] => {
  const data = localStorage.getItem(EVALUATIONS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(SEED_EVALUATIONS));
  return SEED_EVALUATIONS;
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
