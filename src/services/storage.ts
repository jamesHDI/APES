import { User, Department, EvaluationTemplate, EvaluationCycle, EvaluationDeployment, Evaluation, AuditLog, Role, EvaluationHistory, EvaluationScorecardArchive, CalibrationRequest, DirectMessage } from '../types';
import { MASTER_SALES_EVALUATION_TEMPLATE } from '../constants/masterSalesTemplate';
import { MASTER_EMPLOYEES, MASTER_COMPANIES } from '../constants/masterOrganization';
import { 
  saveEmployeeToSupabase, 
  saveEmployeeToSupabaseDetailed,
  saveDepartmentToSupabase, 
  saveEvaluationToSupabase,
  saveEvaluationHistoryToSupabase,
  saveScorecardArchiveToSupabase,
  generateScorecardPdfBlob,
  uploadScorecardPdfToSupabase,
  uploadEvidenceFilesToSupabase,
  uploadSignaturesToSupabase,
  findEmployeeInSupabase,
  isValidUuid,
  generateUuid
} from './supabaseService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const USERS_KEY = 'apes_users_v3';
const CURRENT_USER_KEY = 'apes_current_user_v3';
const DEPARTMENTS_KEY = 'apes_departments_v3';
const TEMPLATES_KEY = 'apes_templates_v3';
const CYCLES_KEY = 'apes_cycles_v3';
const DEPLOYMENTS_KEY = 'apes_deployments_v3';
const EVALUATIONS_KEY = 'apes_evaluations_v3';
const AUDIT_LOGS_KEY = 'apes_audit_logs_v3';
const EVALUATION_HISTORY_KEY = 'apes_evaluation_history_v3';
const SCORECARD_ARCHIVES_KEY = 'apes_scorecard_archives_v3';
const CALIBRATION_REQUESTS_KEY = 'apes_calibration_requests_v1';
const DIRECT_MESSAGES_KEY = 'apes_direct_messages_v1';

// Initial Pre-seeded Enterprise Data derived from Excel Master List Report
export const SEED_USERS: User[] = MASTER_EMPLOYEES;

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept_ops_hdiw', name: 'Operations', code: 'OPS-HDIW', companyName: 'HDI WORLD', headId: 'usr_r132', headName: 'Ma. Emily Floresca', employeeCount: 4, isActive: true },
  { id: 'dept_wh_hdiw', name: 'Warehouse', code: 'WH-HDIW', companyName: 'HDI WORLD', headId: 'usr_e1572', headName: 'Lucil Osorio', employeeCount: 2, isActive: true },
  { id: 'dept_cebu_hdiw', name: 'Cebu Branch', code: 'CEBU-HDIW', companyName: 'HDI WORLD', headId: 'usr_r132', headName: 'Ma. Emily Floresca', employeeCount: 3, isActive: true },
  { id: 'dept_acctg_ga_hdiw', name: 'Acctg and GA', code: 'ACC-HDIW', companyName: 'HDI WORLD', headId: 'usr_e1714', headName: 'Dana Miran', employeeCount: 1, isActive: true },
  { id: 'dept_davao_hdiw', name: 'Davao branch', code: 'DAV-HDIW', companyName: 'HDI WORLD', headId: 'usr_e1396', headName: 'Junielyn Nuique', employeeCount: 1, isActive: true },
  { id: 'dept_ga_hill', name: 'General Affairs', code: 'GA-HILL', companyName: 'Hillcroft Properties', headId: 'usr_r132', headName: 'Ma. Emily Floresca', employeeCount: 2, isActive: true },
  { id: 'dept_fa_hill', name: 'Finance and Accounting', code: 'FA-HILL', companyName: 'Hillcroft Properties', headId: 'usr_e1806', headName: 'Mary Anne Murphy', employeeCount: 1, isActive: true },
  { id: 'dept_cb_cgp', name: 'Compensation & Benefits', code: 'CB-CGP', companyName: 'Capital Growth Properties', headId: 'usr_e984', headName: 'Judycel Delos Reyes', employeeCount: 3, isActive: true },
  { id: 'dept_chair_cgp', name: 'Office of the Chairman', code: 'CHAIR-CGP', companyName: 'Capital Growth Properties', headId: 'usr_ceo_brandon', headName: 'Brandon Chia', employeeCount: 1, isActive: true },
  { id: 'dept_ga_cgp', name: 'General Affairs', code: 'GA-CGP', companyName: 'Capital Growth Properties', headId: 'usr_r132', headName: 'Ma. Emily Floresca', employeeCount: 2, isActive: true },
  { id: 'dept_fa_cgp', name: 'Finance and Accounting', code: 'FA-CGP', companyName: 'Capital Growth Properties', headId: 'usr_e1714', headName: 'Dana Miran', employeeCount: 1, isActive: true },
  { id: 'dept_legal_cgp', name: 'Legal', code: 'LEG-CGP', companyName: 'Capital Growth Properties', headId: 'usr_e1813', headName: 'Jemimah Naomi De Los Santos', employeeCount: 1, isActive: true },
  { id: 'dept_ga_erm', name: 'General Affairs', code: 'GA-ERM', companyName: 'Erminland Properties', headId: 'usr_r132', headName: 'Ma. Emily Floresca', employeeCount: 1, isActive: true },
  { id: 'dept_fin_erm', name: 'Finance', code: 'FIN-ERM', companyName: 'Erminland Properties', headId: 'usr_e1806', headName: 'Mary Anne Murphy', employeeCount: 1, isActive: true },
  { id: 'dept_bmc_erm', name: 'BMC', code: 'BMC-ERM', companyName: 'Erminland Properties', headId: 'usr_e1538', headName: 'Pamela Maureen Fernando', employeeCount: 1, isActive: true },
  { id: 'dept_ops_stan', name: 'Operations', code: 'OPS-STAN', companyName: 'Stanford', headId: 'usr_ceo_brandon', headName: 'Brandon Chia', employeeCount: 1, isActive: true },
  { id: 'dept_ops_adv', name: 'Operations', code: 'OPS-ADV', companyName: 'Adventures', headId: 'usr_e1115', headName: 'Manuel, Jr. Embuido', employeeCount: 11, isActive: true },
  { id: 'dept_sales_adv', name: 'Sales', code: 'SLS-ADV', companyName: 'Adventures', headId: 'usr_e1147', headName: 'Gracia Esguerra', employeeCount: 4, isActive: true },
  { id: 'dept_fa_adv', name: 'Finance and Accounting', code: 'FA-ADV', companyName: 'Adventures', headId: 'usr_e1752', headName: 'Emmanuel Buenaventura', employeeCount: 6, isActive: true },
  { id: 'dept_pod_adv', name: 'Peoples Ops', code: 'POD-ADV', companyName: 'Adventures', headId: 'usr_e1527', headName: 'Maria Elena Pellazo', employeeCount: 1, isActive: true },
  { id: 'dept_legal_adv', name: 'Peoples Ops Legal', code: 'LEG-ADV', companyName: 'Adventures', headId: 'usr_e1813', headName: 'Jemimah Naomi De Los Santos', employeeCount: 3, isActive: true },
  { id: 'dept_bmc_adv', name: 'BMC', code: 'BMC-ADV', companyName: 'Adventures', headId: 'usr_e1302', headName: 'Anmer Carrillo', employeeCount: 4, isActive: true },
  { id: 'dept_adm_adv', name: 'Administration', code: 'ADM-ADV', companyName: 'Adventures', headId: 'usr_e1787', headName: 'James Ivan Luigi Abendan', employeeCount: 6, isActive: true },
];

export const SEED_CYCLES: EvaluationCycle[] = [
  {
    id: 'cycle_2026_annual',
    name: 'FY 2026 Annual Performance Evaluation',
    period: 'January 1, 2026 - December 31, 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    totalAssigned: 60,
    completedCount: 18
  }
];

export const SEED_TEMPLATES: EvaluationTemplate[] = [
  MASTER_SALES_EVALUATION_TEMPLATE
];

export const SEED_EVALUATIONS: Evaluation[] = [];

const isExcludedUser = (u: User) =>
  !u ||
  u.name === 'Juan Dela Cruz' ||
  u.id === 'usr_emp_sales_01' ||
  u.id === 'usr_dh_sls' ||
  u.id === 'usr_sup_sales_01' ||
  (u.email && u.email.toLowerCase().trim() === 'supervisor.sales@hdiadventures.com') ||
  u.employeeNumber === 'SUP-SLS-01';

export const getStoredUsers = (): User[] => {
  const userMap = new Map<string, User>();

  // 1. Seed all 60 master employees first
  for (const emp of MASTER_EMPLOYEES) {
    if (emp && emp.id && !isExcludedUser(emp)) {
      userMap.set(emp.id, emp);
      if (emp.employeeNumber) userMap.set(`num_${emp.employeeNumber.toLowerCase()}`, emp);
      if (emp.email) userMap.set(`email_${emp.email.toLowerCase()}`, emp);
    }
  }

  // 2. Overlay any updated stored users from localStorage
  const data = localStorage.getItem(USERS_KEY);
  if (data) {
    try {
      const storedList: User[] = JSON.parse(data);
      if (Array.isArray(storedList)) {
        for (const u of storedList) {
          if (u && u.id && !isExcludedUser(u)) {
            const existing = userMap.get(u.id) ||
                             (u.employeeNumber ? userMap.get(`num_${u.employeeNumber.toLowerCase()}`) : null) ||
                             (u.email ? userMap.get(`email_${u.email.toLowerCase()}`) : null);
            if (existing) {
              userMap.set(existing.id, { ...existing, ...u });
            } else {
              userMap.set(u.id, u);
            }
          }
        }
      }
    } catch {}
  }

  const result: User[] = [];
  const seen = new Set<string>();
  for (const u of userMap.values()) {
    if (u && u.id && !seen.has(u.id)) {
      seen.add(u.id);
      result.push(u);
    }
  }
  return result;
};

export const saveUsers = (users: User[]) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('LocalStorage saveUsers quota warning:', e);
  }
};

export const getStoredCurrentUser = (): User | null => {
  try {
    const isSessionActive = sessionStorage.getItem('apes_session_active_v3') === 'true';
    if (!isSessionActive) {
      return null;
    }
    const sessionData = sessionStorage.getItem(CURRENT_USER_KEY);
    if (sessionData) {
      const user: User = JSON.parse(sessionData);
      if (user && user.id) return user;
    }
  } catch {}
  return null;
};

export const setCurrentUserStore = (user: User) => {
  try {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {}
};

export const clearCurrentUserStore = () => {
  try {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem('apes_session_active_v3');
    sessionStorage.removeItem('apes_active_tab_v3');
  } catch (e) {}
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('apes_session_active_v3');
    localStorage.removeItem('apes_active_tab_v3');
  } catch (e) {}
};

export const getStoredDepartments = (): Department[] => {
  const data = localStorage.getItem(DEPARTMENTS_KEY);
  if (data) {
    try {
      const depts: Department[] = JSON.parse(data);
      const filtered = depts.filter(d => d.name !== 'HDI Adventures' && d.id !== 'dept_hdi');
      // Ensure all seed departments (including Creatives, Marketing, Operations) exist in the list
      const merged = [...filtered];
      for (const seedDept of SEED_DEPARTMENTS) {
        if (!merged.some(d => d.code === seedDept.code || d.id === seedDept.id || d.name.toLowerCase() === seedDept.name.toLowerCase())) {
          merged.push(seedDept);
        }
      }
      if (merged.length > filtered.length) {
        localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(merged));
      }
      return merged;
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
  let templates: EvaluationTemplate[] = [];
  if (data) {
    try {
      const parsed: EvaluationTemplate[] = JSON.parse(data);
      if (parsed && Array.isArray(parsed)) {
        templates = parsed;
      }
    } catch {}
  }

  // Deduplicate strictly by unique ID
  const deduped: EvaluationTemplate[] = [];
  const seenIds = new Set<string>();

  for (const t of templates) {
    if (!t || !t.id) continue;
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      deduped.push(t);
    }
  }

  // Ensure at least one template exists if list is completely empty
  if (deduped.length === 0) {
    deduped.push(MASTER_SALES_EVALUATION_TEMPLATE);
  }

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(deduped));
  return deduped;
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

export const deduplicateEvaluations = (evals: Evaluation[]): Evaluation[] => {
  if (!Array.isArray(evals)) return [];
  const seen = new Set<string>();
  const result: Evaluation[] = [];

  for (const e of evals) {
    if (!e || !e.id) continue;
    // Deduplicate by ID
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    result.push(e);
  }
  return result;
};

export const getStoredEvaluations = (): Evaluation[] => {
  const data = localStorage.getItem(EVALUATIONS_KEY);
  if (data) {
    try {
      const evaluations: Evaluation[] = JSON.parse(data);
      if (evaluations && evaluations.length > 0) {
        const filtered = evaluations.filter(e => e.employeeName !== 'Maritess Bacle' && e.employeeName !== 'Grazie Esguerra' && e.id !== 'eval_maritess_2025' && e.id !== 'eval_grazie_depthead_2025');
        return deduplicateEvaluations(filtered);
      }
    } catch {}
  }
  return deduplicateEvaluations(SEED_EVALUATIONS.filter(e => e.employeeName !== 'Maritess Bacle' && e.employeeName !== 'Grazie Esguerra' && e.id !== 'eval_maritess_2025' && e.id !== 'eval_grazie_depthead_2025'));
};

export const saveEvaluations = (evaluations: Evaluation[]) => {
  const cleanList = deduplicateEvaluations(evaluations);
  try {
    localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(cleanList));
  } catch (e) {
    console.warn('LocalStorage saveEvaluations quota warning:', e);
  }
};

export const saveSingleEvaluation = async (evaluation: Evaluation, historyActor?: { name: string; role: string; id?: string }) => {
  const evaluations = getStoredEvaluations();
  const index = evaluations.findIndex((e) => e.id === evaluation.id);
  let updatedList = [...evaluations];
  if (index >= 0) {
    updatedList[index] = evaluation;
  } else {
    updatedList.unshift(evaluation);
  }
  saveEvaluations(updatedList);
  try {
    await saveEvaluationToSupabase(evaluation);
  } catch (supabaseErr) {
    console.error('[Storage] Supabase sync failed after local save:', supabaseErr);
    throw new Error(`Failed to sync evaluation to Supabase: ${supabaseErr}`);
  }

  const previousEval = index >= 0 ? evaluations[index] : null;
  const statusChanged = !previousEval || previousEval.status !== evaluation.status;

  if (statusChanged && historyActor) {
    const snapshot = buildEvaluationHistorySnapshot(evaluation, historyActor);
    await saveEvaluationHistoryToSupabase(snapshot);
    const history = getStoredEvaluationHistory();
    history.unshift(snapshot);
    saveEvaluationHistory(history);
  }

  if (statusChanged && (evaluation.status === 'archived' || evaluation.status === 'pod_validated')) {
    const existingArchives = getStoredScorecardArchives();
    const alreadyArchived = existingArchives.some((a) => a.evaluationId === evaluation.id);
    if (!alreadyArchived) {
      const archive = buildScorecardArchive(evaluation, historyActor || { name: evaluation.employeeName, role: 'system' });

      const pdfBlob = await generateScorecardPdfBlob(evaluation);
      if (pdfBlob) {
        const uploadResult = await uploadScorecardPdfToSupabase(evaluation, pdfBlob);
        if (uploadResult) {
          archive.pdfUrl = uploadResult.pdfUrl;
          archive.storagePath = uploadResult.storagePath;
          archive.fileName = uploadResult.fileName;
          archive.fileSize = uploadResult.fileSize;
          archive.uploadedAt = uploadResult.uploadedAt;
        }
      }

      await saveScorecardArchiveToSupabase(archive);
      saveScorecardArchive(archive);
    }
  }
};

export interface ArchiveTransactionResult {
  success: boolean;
  failedStep?: string;
  error?: string;
  stepResults: {
    dataValidated: boolean;
    pdfGenerated: boolean;
    pdfUploaded: boolean;
    evidenceUploaded: boolean;
    signaturesUploaded: boolean;
    historySaved: boolean;
    archiveSaved: boolean;
    evaluationSaved: boolean;
  };
  archivedEvaluation?: Evaluation;
}

export const archiveEvaluationTransaction = async (
  evaluation: Evaluation,
  actor: { name: string; role: string; id?: string }
): Promise<ArchiveTransactionResult> => {
  const stepResults = {
    dataValidated: false,
    pdfGenerated: false,
    pdfUploaded: false,
    evidenceUploaded: false,
    signaturesUploaded: false,
    historySaved: false,
    archiveSaved: false,
    evaluationSaved: false
  };

  if (!evaluation || !evaluation.id || !evaluation.employeeName) {
    return {
      success: false,
      failedStep: 'Validation failed: Invalid or incomplete evaluation record',
      error: 'Evaluation record is missing required fields (id or employeeName).',
      stepResults
    };
  }
  stepResults.dataValidated = true;

  try {
    // 1. Upload Evidence Files to Supabase Storage
    const updatedEvidenceFiles = await uploadEvidenceFilesToSupabase(evaluation);
    stepResults.evidenceUploaded = true;

    // 2. Upload Signatures to Supabase Storage
    const updatedSignatures = await uploadSignaturesToSupabase(evaluation);
    stepResults.signaturesUploaded = true;

    const evalWithFiles: Evaluation = {
      ...evaluation,
      evidenceFiles: updatedEvidenceFiles,
      signatures: updatedSignatures
    };

    // 3. Generate Official Scoreboard PDF Blob
    const pdfBlob = await generateScorecardPdfBlob(evalWithFiles);
    let uploadResult: { pdfUrl: string; storagePath: string; fileName: string; fileSize: number; uploadedAt: string } | null = null;

    if (pdfBlob) {
      stepResults.pdfGenerated = true;
      // 4. Upload Official Scoreboard PDF to Supabase Storage
      uploadResult = await uploadScorecardPdfToSupabase(evalWithFiles, pdfBlob);
      if (uploadResult) {
        stepResults.pdfUploaded = true;
      } else {
        console.warn('[Archive Transaction] Scorecard PDF upload to storage returned null, proceeding with fallback URL...');
      }
    } else {
      console.warn('[Archive Transaction] Scorecard PDF blob generation returned null...');
    }

    const archivedEvalRecord: Evaluation = {
      ...evalWithFiles,
      status: 'archived' as const,
      updatedAt: new Date().toISOString()
    };

    // 5. Save History Snapshot to DB & LocalStorage (uses actual evaluated employee info)
    const historySnapshot = buildEvaluationHistorySnapshot(archivedEvalRecord, actor);
    const historyOk = await saveEvaluationHistoryToSupabase(historySnapshot);
    const currentHistory = getStoredEvaluationHistory();
    const existingHistIdx = currentHistory.findIndex(h => h.evaluationId === evaluation.id && h.status === 'archived');
    if (existingHistIdx >= 0) {
      currentHistory[existingHistIdx] = historySnapshot;
    } else {
      currentHistory.unshift(historySnapshot);
    }
    saveEvaluationHistory(currentHistory);
    stepResults.historySaved = historyOk !== false;

    // 6. Save Scorecard Archive Record to DB & LocalStorage
    const scorecardArchive = buildScorecardArchive(archivedEvalRecord, actor);
    if (uploadResult) {
      scorecardArchive.pdfUrl = uploadResult.pdfUrl;
      scorecardArchive.storagePath = uploadResult.storagePath;
      scorecardArchive.fileName = uploadResult.fileName;
      scorecardArchive.fileSize = uploadResult.fileSize;
      scorecardArchive.uploadedAt = uploadResult.uploadedAt;
    }

    const archiveOk = await saveScorecardArchiveToSupabase(scorecardArchive);
    saveScorecardArchive(scorecardArchive);
    stepResults.archiveSaved = archiveOk !== false;

    // 7. Save Main Evaluation Record with status 'archived'
    const evalOk = await saveEvaluationToSupabase(archivedEvalRecord);
    const evaluations = getStoredEvaluations();
    const index = evaluations.findIndex((e) => e.id === evaluation.id);
    let updatedList = [...evaluations];
    if (index >= 0) {
      updatedList[index] = archivedEvalRecord;
    } else {
      updatedList.unshift(archivedEvalRecord);
    }
    saveEvaluations(updatedList);
    stepResults.evaluationSaved = evalOk !== false;

    return {
      success: true,
      stepResults,
      archivedEvaluation: archivedEvalRecord
    };
  } catch (err: any) {
    console.error('[Archive Transaction] Unexpected error during archiving:', err);
    return {
      success: false,
      failedStep: 'Archive transaction failed due to unexpected error',
      error: err?.message || String(err),
      stepResults
    };
  }
};

export const assignNewEvaluationToEmployee = async (
  employee: User,
  template: EvaluationTemplate,
  appraisalPeriod: string = 'January - December 2026',
  assignedByName: string = 'People Operations (POD)',
  deploymentTitle?: string
): Promise<Evaluation> => {
  if (employee && employee.role === 'system_admin') {
    throw new Error(`[Assign Evaluation] System Administrator accounts are administrative-only and cannot be assigned evaluation scorecards.`);
  }

  // Resolve permanent Supabase UUID for the employee to ensure cross-device consistency
  let permanentEmpId = employee.id;
  let resolvedEmployee = employee;
  if (isSupabaseConfigured) {
    try {
      const sbUser = await findEmployeeInSupabase(employee.id) || await findEmployeeInSupabase(employee.email);
      if (sbUser && sbUser.id) {
        permanentEmpId = sbUser.id;
        resolvedEmployee = {
          ...employee,
          id: sbUser.id,
          email: sbUser.email || employee.email,
          name: sbUser.name || employee.name,
          employeeNumber: sbUser.employeeNumber || employee.employeeNumber,
          departmentName: sbUser.departmentName || employee.departmentName || template.departmentName,
          departmentId: sbUser.departmentId || employee.departmentId || template.departmentId
        };
      } else {
        const provisionResult = await saveEmployeeToSupabaseDetailed(employee);
        if (provisionResult.success && provisionResult.id) {
          permanentEmpId = provisionResult.id;
          resolvedEmployee = { ...employee, id: provisionResult.id };
        } else if (provisionResult.success) {
          const refetched = await findEmployeeInSupabase(employee.email);
          if (refetched && refetched.id) {
            permanentEmpId = refetched.id;
            resolvedEmployee = { ...employee, id: refetched.id, email: refetched.email || employee.email, name: refetched.name || employee.name, employeeNumber: refetched.employeeNumber || employee.employeeNumber };
          }
        }
        if (!permanentEmpId || permanentEmpId === employee.id) {
          throw new Error(`[Assign Evaluation] Unable to resolve or provision permanent UUID for employee ${employee.name} (${employee.email}). Aborting evaluation creation.`);
        }
      }
    } catch (e) {
      console.error('[Assign Evaluation] Critical failure resolving employee identity:', e);
      throw e;
    }
  }

  const isDeptHeadTrack = employee.isDepartmentHead || employee.role === 'dept_head';
  const workflowType = isDeptHeadTrack ? ('WORKFLOW_DEPT_HEAD' as const) : ('WORKFLOW_REGULAR' as const);

  const activeTemplate = (template && Array.isArray(template.kraCategories) && template.kraCategories.length > 0)
    ? template
    : MASTER_SALES_EVALUATION_TEMPLATE;

  const defaultStandards: { rating: 1 | 2 | 3 | 4; label: string; description: string }[] = [
    { rating: 4, label: '4 - Exceeds', description: 'Exceeds target performance' },
    { rating: 3, label: '3 - Meets', description: 'Meets expected target' },
    { rating: 2, label: '2 - Barely Meets', description: 'Barely meets minimum target' },
    { rating: 1, label: '1 - Did Not Meet', description: 'Did not meet target performance' }
  ];

  const kpiRatings = activeTemplate.kraCategories.flatMap((kra) =>
    (kra.kpis || []).map((kpi) => ({
      kpiId: kpi.id,
      kraId: kra.id,
      kraName: kra.name,
      name: kpi.name,
      weightPercent: Number(kpi.weightPercent || 0),
      selfRating: 0,
      supervisorRating: 0,
      presidentRating: 0,
      weightedScore: 0,
      comments: '',
      standards: Array.isArray(kpi.standards) && kpi.standards.length > 0 ? kpi.standards : defaultStandards,
      evidenceRequired: Boolean(kpi.evidenceRequired),
    }))
  );

  const defaultCoreValues = (activeTemplate.coreValues && activeTemplate.coreValues.length > 0)
    ? activeTemplate.coreValues.map((cv) => ({
        coreValueId: cv.id,
        name: cv.name,
        description: cv.description || '',
        podRating: 0,
        peerRating: 0,
        isRating: 0,
        avgRating: 0,
        weightedScore: 0,
        comments: ''
      }))
    : [
        { coreValueId: 'cv_integrity', name: 'Integrity & Ethics', description: 'Upholds highest standards of honesty, fairness, and business ethics.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
        { coreValueId: 'cv_excellence', name: 'Excellence & Performance', description: 'Consistently delivers top-tier results and strives for continuous improvement.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
        { coreValueId: 'cv_teamwork', name: 'Teamwork & Collaboration', description: 'Fosters positive collaboration across departments and supports team goals.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' },
        { coreValueId: 'cv_accountability', name: 'Accountability & Ownership', description: 'Takes full ownership of duties, commitments, and professional conduct.', podRating: 0, peerRating: 0, isRating: 0, avgRating: 0, weightedScore: 0, comments: '' }
      ];

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.substring(0, 10);

  // Supersede previous uncompleted draft evaluations for this employee so the newly assigned evaluation becomes the sole active evaluation
  const cleanEmpEmail = (resolvedEmployee.email || '').toLowerCase().trim();
  const cleanEmpName = (resolvedEmployee.name || '').toLowerCase().trim();
  const existingEvals = getStoredEvaluations();

  const updatedEvals = existingEvals.map((e) => {
    const eEmail = (e.employeeEmail || '').toLowerCase().trim();
    const eName = (e.employeeName || '').toLowerCase().trim();
    const eId = e.employeeId || (e as any).userId;
    const isSameEmp = (eId && (eId === permanentEmpId || eId === employee.id)) || (cleanEmpEmail && eEmail === cleanEmpEmail) || (cleanEmpName && eName === cleanEmpName);

    if (isSameEmp && (e.status === 'draft' || e.status === 'reopened')) {
      return { ...e, status: 'superseded' as const, updatedAt: nowIso };
    }
    return e;
  });
  saveEvaluations(updatedEvals);

  if (isSupabaseConfigured && supabase) {
    try {
      if (isValidUuid(permanentEmpId)) {
        await supabase
          .from('evaluations')
          .update({ status: 'superseded', updated_at: nowIso })
          .or(`employee_id.eq.${permanentEmpId},user_id.eq.${permanentEmpId}`)
          .in('status', ['draft', 'reopened']);
      } else if (cleanEmpEmail) {
        await supabase
          .from('evaluations')
          .update({ status: 'superseded', updated_at: nowIso })
          .ilike('employee_email', cleanEmpEmail)
          .in('status', ['draft', 'reopened']);
      }
    } catch (supErr) {
      console.warn('[Assign Evaluation] Superseding previous evaluations warning:', supErr);
    }
  }

  const newEval: Evaluation = {
    id: generateUuid(),
    cycleId: 'cycle_2026_annual',
    title: deploymentTitle || `${template.title || 'Performance Evaluation'} (${appraisalPeriod})`,
    templateId: template.id,
    templateTitle: template.title,
    workflowType,
    employeeId: permanentEmpId,
    userId: permanentEmpId,
    employeeName: resolvedEmployee.name,
    employeeEmail: resolvedEmployee.email,
    departmentName: resolvedEmployee.departmentName || template.departmentName || 'General',
    departmentId: resolvedEmployee.departmentId || template.departmentId,
    position: resolvedEmployee.position || 'Staff Specialist',
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
        assignedTo: resolvedEmployee.name,
        actionPerformed: 'Assigned New Evaluation Template',
        previousStatus: 'none',
        newStatus: 'draft',
        remarks: `Assigned new evaluation scorecard for ${appraisalPeriod}.`
      }
    ],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  await saveSingleEvaluation(newEval);
  return newEval;
};

export const createDraftEvaluationInMemory = (
  employee: User,
  template: EvaluationTemplate,
  appraisalPeriod: string = 'January - December 2026'
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

  const coreValueRatings = (activeTemplate.coreValues || []).map((cv) => ({
    coreValueId: cv.id,
    name: cv.name,
    description: cv.description || '',
    podRating: 0,
    peerRating: 0,
    isRating: 0,
    avgRating: 0,
    weightedScore: 0,
    comments: ''
  }));

  const dateStr = new Date().toISOString().substring(0, 10);

  return {
    id: `draft_fallback_${employee.id}`,
    cycleId: 'cycle_2026_annual',
    templateId: activeTemplate.id,
    workflowType,
    employeeId: employee.id,
    userId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    departmentName: employee.departmentName || activeTemplate.departmentName || 'General',
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
    coreValueRatings,
    developmentPlan: { strengths: '', areasForImprovement: '', learningNeeds: [] },
    personnelAction: { actionType: 'no_action' },
    signatures: {},
    evidenceFiles: [],
    auditTrail: [],
    createdAt: dateStr,
    updatedAt: dateStr
  };
};

export const getStoredAuditLogs = (): AuditLog[] => {
  const data = localStorage.getItem(AUDIT_LOGS_KEY);
  if (data) return JSON.parse(data);
  return [];
};

const buildEvaluationHistorySnapshot = (evaluation: Evaluation, actor: { name: string; role: string; id?: string }): EvaluationHistory => {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    evaluationId: evaluation.id,
    employeeId: evaluation.employeeId,
    employeeName: evaluation.employeeName,
    departmentName: evaluation.departmentName,
    position: evaluation.position,
    appraisalPeriod: evaluation.appraisalPeriod,
    cycleId: evaluation.cycleId,
    templateId: evaluation.templateId,
    workflowType: evaluation.workflowType,
    workflowStage: evaluation.status,
    status: evaluation.status,
    kpiRatings: evaluation.kpiRatings || [],
    coreValueRatings: evaluation.coreValueRatings || [],
    signatures: evaluation.signatures || {},
    developmentPlan: evaluation.developmentPlan || {},
    personnelAction: evaluation.personnelAction || {},
    eligibilityScore: evaluation.eligibilityScore || 0,
    coreValuesScore: evaluation.coreValuesScore || 0,
    finalRating: evaluation.finalRating || 0,
    ratingClassification: evaluation.ratingClassification || 'Unsatisfactory',
    submittedByName: actor.name,
    submittedByRole: actor.role,
    submittedById: actor.id,
    appraiseeSummaryComment: evaluation.appraiseeSummaryComment,
    supervisorSummaryComment: evaluation.supervisorSummaryComment,
    presidentSummaryComment: evaluation.presidentSummaryComment,
    podValidationComment: evaluation.podValidationComment,
    createdAt: new Date().toISOString()
  };
};

export const saveEvaluationHistory = (history: EvaluationHistory[]) => {
  try {
    localStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('LocalStorage saveEvaluationHistory quota warning:', e);
  }
};

export const getStoredEvaluationHistory = (): EvaluationHistory[] => {
  const data = localStorage.getItem(EVALUATION_HISTORY_KEY);
  if (data) {
    try {
      const history: EvaluationHistory[] = JSON.parse(data);
      if (history && history.length > 0) {
        return history;
      }
    } catch {}
  }
  return [];
};

const buildScorecardArchive = (evaluation: Evaluation, actor: { name: string; role: string; id?: string }): EvaluationScorecardArchive => {
  return {
    id: `arch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    evaluationId: evaluation.id,
    employeeId: evaluation.employeeId,
    employeeName: evaluation.employeeName,
    employeeEmail: evaluation.employeeEmail,
    departmentName: evaluation.departmentName,
    departmentId: evaluation.departmentId,
    position: evaluation.position,
    appraisalPeriod: evaluation.appraisalPeriod,
    cycleId: evaluation.cycleId,
    templateId: evaluation.templateId,
    workflowType: evaluation.workflowType,
    workflowStage: evaluation.status,
    status: evaluation.status,
    kpiRatingsData: evaluation.kpiRatings || [],
    coreValueRatingsData: evaluation.coreValueRatings || [],
    signaturesData: evaluation.signatures || {},
    developmentPlanData: evaluation.developmentPlan || {},
    personnelActionData: evaluation.personnelAction || {},
    evidenceFilesData: evaluation.evidenceFiles || [],
    stepHistoryData: evaluation.stepHistory || [],
    auditTrailData: evaluation.auditTrail || [],
    eligibilityScore: evaluation.eligibilityScore || 0,
    coreValuesScore: evaluation.coreValuesScore || 0,
    finalRating: evaluation.finalRating || 0,
    ratingClassification: evaluation.ratingClassification || 'Unsatisfactory',
    appraiseeSummaryComment: evaluation.appraiseeSummaryComment,
    supervisorSummaryComment: evaluation.supervisorSummaryComment,
    presidentSummaryComment: evaluation.presidentSummaryComment,
    podValidationComment: evaluation.podValidationComment,
    submittedByName: actor.name,
    submittedByRole: actor.role,
    submittedById: actor.id,
    createdAt: new Date().toISOString(),
    archivedAt: new Date().toISOString()
  };
};

export const saveScorecardArchive = (archive: EvaluationScorecardArchive) => {
  const archives = getStoredScorecardArchives();
  const index = archives.findIndex((a) => a.id === archive.id);
  let updatedList = [...archives];
  if (index >= 0) {
    updatedList[index] = archive;
  } else {
    updatedList.unshift(archive);
  }
  try {
    localStorage.setItem(SCORECARD_ARCHIVES_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('LocalStorage saveScorecardArchive quota warning:', e);
  }
};

export const getStoredScorecardArchives = (): EvaluationScorecardArchive[] => {
  const data = localStorage.getItem(SCORECARD_ARCHIVES_KEY);
  if (data) {
    try {
      const archives: EvaluationScorecardArchive[] = JSON.parse(data);
      if (archives && archives.length > 0) {
        return archives;
      }
    } catch {}
  }
  return [];
};

export const getStoredCalibrationRequests = (): CalibrationRequest[] => {
  const data = localStorage.getItem(CALIBRATION_REQUESTS_KEY);
  if (data) {
    try {
      const requests: CalibrationRequest[] = JSON.parse(data);
      if (Array.isArray(requests)) return requests;
    } catch {}
  }
  return [];
};

export const saveStoredCalibrationRequests = (requests: CalibrationRequest[]) => {
  try {
    localStorage.setItem(CALIBRATION_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('LocalStorage saveStoredCalibrationRequests quota warning:', e);
  }
};

export const saveSingleCalibrationRequest = (request: CalibrationRequest) => {
  const all = getStoredCalibrationRequests();
  const index = all.findIndex(r => r.id === request.id);
  let updatedList = [...all];
  if (index >= 0) {
    updatedList[index] = request;
  } else {
    updatedList.unshift(request);
  }
  saveStoredCalibrationRequests(updatedList);
};

export const deleteStoredCalibrationRequest = (id: string) => {
  const all = getStoredCalibrationRequests();
  saveStoredCalibrationRequests(all.filter(r => r.id !== id));
};

// ── DIRECT MESSAGES & CONCERNS ──────────────────────────────────────────────
export const SEED_DIRECT_MESSAGES: DirectMessage[] = [
  {
    id: 'msg_welcome_pod',
    senderId: 'usr_dh_pohr',
    senderName: 'Malene Pellazo',
    senderRole: 'pod',
    senderAvatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    senderDepartment: 'People Operations (HR)',
    recipientId: 'all',
    recipientName: 'All HDI Hive Users',
    subject: 'Welcome to HDI Messenger & Concerns Desk',
    message: 'Hello team! Welcome to the APES Direct Messenger. You can use this channel to submit inquiries, clarify KPI weights, discuss evaluation calibrations, or raise general performance concerns directly to any colleague, supervisor, or POD representative.',
    isConcern: false,
    category: 'General',
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

export const getStoredDirectMessages = (): DirectMessage[] => {
  const data = localStorage.getItem(DIRECT_MESSAGES_KEY);
  if (data) {
    try {
      const parsed: DirectMessage[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let hasFixes = false;
        // Normalize any old duplicate 'usr_pod_malene' records to official 'usr_dh_pohr'
        const normalized = parsed.map(msg => {
          let updated = { ...msg };
          if (updated.senderId === 'usr_pod_malene') {
            updated.senderId = 'usr_dh_pohr';
            updated.senderName = 'Malene Pellazo';
            updated.senderRole = 'pod';
            updated.senderDepartment = 'People Operations (HR)';
            updated.senderAvatarUrl = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80';
            hasFixes = true;
          }
          if (updated.recipientId === 'usr_pod_malene') {
            updated.recipientId = 'usr_dh_pohr';
            updated.recipientName = 'Malene Pellazo';
            updated.recipientRole = 'pod';
            updated.recipientDepartment = 'People Operations (HR)';
            updated.recipientAvatarUrl = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80';
            hasFixes = true;
          }
          return updated;
        });

        if (hasFixes) {
          saveStoredDirectMessages(normalized);
        }
        return normalized;
      }
    } catch {}
  }
  return SEED_DIRECT_MESSAGES;
};

export const saveStoredDirectMessages = (messages: DirectMessage[]) => {
  try {
    localStorage.setItem(DIRECT_MESSAGES_KEY, JSON.stringify(messages));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apes_direct_messages_updated', { detail: messages }));
    }
  } catch (e) {
    console.warn('LocalStorage saveStoredDirectMessages quota warning:', e);
  }
};

export const sendDirectMessage = (message: DirectMessage) => {
  const all = getStoredDirectMessages();
  const updated = [message, ...all];
  saveStoredDirectMessages(updated);
};

export const markDirectMessagesAsRead = (conversationPartnerId: string, currentUserId: string) => {
  const all = getStoredDirectMessages();
  let modified = false;
  const updated = all.map(msg => {
    // If message is from partner to me (or broadcast) and is unread, mark as read
    if (
      msg.senderId === conversationPartnerId &&
      (msg.recipientId === currentUserId || msg.recipientId === 'all') &&
      !msg.read
    ) {
      modified = true;
      return { ...msg, read: true };
    }
    return msg;
  });

  if (modified) {
    saveStoredDirectMessages(updated);
  }
};

export const resetToDefaultSeedData = () => {
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(SEED_USERS[0]));
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(SEED_DEPARTMENTS));
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(SEED_TEMPLATES));
  localStorage.setItem(CYCLES_KEY, JSON.stringify(SEED_CYCLES));
  localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(SEED_EVALUATIONS));
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
  localStorage.setItem(CALIBRATION_REQUESTS_KEY, JSON.stringify([]));
  localStorage.setItem(DIRECT_MESSAGES_KEY, JSON.stringify(SEED_DIRECT_MESSAGES));
};
