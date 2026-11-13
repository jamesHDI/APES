import React, { useState, useEffect, useRef } from 'react';
import { EvaluationTemplate, KRACategory, KPITemplateItem, RatingStandard, CoreValue, Department, User, Evaluation, TemplateStatus } from '../../types';
import { createMasterBasedTemplate, MASTER_SALES_EVALUATION_TEMPLATE } from '../../constants/masterSalesTemplate';
import { validateEvaluationTemplate } from '../../services/templateValidation';
import { triggerTemplateWorkflowNotification } from '../../services/notificationService';
import { generateUuid } from '../../services/supabaseService';
import { createDraftEvaluationInMemory } from '../../services/storage';
import { PrintableScorecard } from '../evaluation/PrintableScorecard';
import { checkIsISForTemplate, checkIsTemplateOwner, matchNames, matchIds, resolveSupervisorForUser } from '../../utils/supervisorMatching';
import { 
  Plus,
  Trash2,
  Save, 
  CheckCircle2, 
  Building2, 
  Layers, 
  Award,
  Sparkles,
  AlertTriangle,
  Lock,
  Eye,
  X,
  Send,
  ShieldCheck,
  RotateCcw,
  CheckCheck,
  UserCheck,
  User as UserIcon,
  Search,
  FileEdit,
  Bookmark,
  Check,
  ChevronLeft,
  Clock,
  Inbox,
  ArrowRight,
} from 'lucide-react';

export type WorkspaceSection = 'drafts' | 'pending_is' | 'pending_pod' | 'deployed' | 'returned';

interface TemplateBuilderProps {
  currentUser?: User;
  users?: User[];
  templates: EvaluationTemplate[];
  departments: Department[];
  evaluations?: Evaluation[];
  onSaveTemplate: (template: EvaluationTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  mode?: 'all' | 'employee' | 'supervisor' | 'pod';
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  currentUser,
  users = [],
  templates,
  departments,
  evaluations,
  onSaveTemplate,
  onDeleteTemplate,
  mode = 'all',
}) => {
  const isEmployeeMode = mode === 'employee' || (currentUser?.role === 'employee' && mode !== 'supervisor' && mode !== 'pod');
  const isSupervisorRole = currentUser?.role === 'supervisor' || currentUser?.role === 'dept_head' || currentUser?.role === 'president';
  const isDeptHead = currentUser?.role === 'dept_head';
  const isReviewerRole = currentUser?.role === 'supervisor' || currentUser?.role === 'dept_head' || currentUser?.role === 'president';
  const isPOD = currentUser?.role === 'pod' || currentUser?.role === 'hr_admin' || currentUser?.role === 'system_admin';

  const canCreate = isEmployeeMode || isPOD || isDeptHead || currentUser?.role === 'system_admin';
  const canDelete = currentUser?.role === 'system_admin' || isPOD || isDeptHead;

  // Local state for all templates to guarantee instant UI updates without waiting for parent re-render
  const [allTemplates, setAllTemplates] = useState<EvaluationTemplate[]>(templates);

  useEffect(() => {
    setAllTemplates(prev => {
      const map = new Map<string, EvaluationTemplate>();
      for (const t of templates) {
        map.set(t.id, t);
      }
      for (const p of prev) {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        }
      }
      return Array.from(map.values());
    });
  }, [templates]);

  // Helper wrappers using robust matching logic
  const checkIsISForTemplateLocal = (t: EvaluationTemplate): boolean => {
    return checkIsISForTemplate(currentUser, t, users);
  };

  const checkIsTemplateOwnerLocal = (t?: EvaluationTemplate | null): boolean => {
    return checkIsTemplateOwner(currentUser, t);
  };

  // Base list of accessible templates
  const allAccessibleTemplates = isEmployeeMode
    ? allTemplates.filter(t => {
        if (t.status === 'draft') return checkIsTemplateOwnerLocal(t);
        return (
          checkIsTemplateOwnerLocal(t) ||
          !t.departmentId ||
          t.departmentId === currentUser?.departmentId ||
          (t.departmentName && currentUser?.departmentName && t.departmentName.trim().toLowerCase() === currentUser.departmentName.trim().toLowerCase())
        );
      })
    : isPOD
    ? allTemplates
    : isReviewerRole
    ? allTemplates.filter(t => {
        if (t.status === 'draft') return checkIsTemplateOwnerLocal(t);
        return (
          checkIsISForTemplateLocal(t) ||
          checkIsTemplateOwnerLocal(t) ||
          (isDeptHead && (
            !t.departmentId || 
            t.departmentId === currentUser?.departmentId ||
            (t.departmentName && currentUser?.departmentName && t.departmentName.trim().toLowerCase() === currentUser.departmentName.trim().toLowerCase())
          ))
        );
      })
    : allTemplates;

  const safeTemplatesList = allAccessibleTemplates.length > 0 
    ? allAccessibleTemplates 
    : [MASTER_SALES_EVALUATION_TEMPLATE];

  // ── STRICT SECTION-BASED QUEUES (Mutually Exclusive, Zero Leaks) ─────────────
  // 1. DRAFTS: ONLY status === 'draft'
  const draftsQueue = safeTemplatesList.filter(t => {
    if (t.status !== 'draft') return false;
    if (isPOD || currentUser?.role === 'system_admin') return true;
    return checkIsTemplateOwnerLocal(t);
  });

  // 2. PENDING IS: ONLY status === 'submitted_to_is' || 'is_review'
  const pendingISQueue = safeTemplatesList.filter(t => {
    const isMatch = t.status === 'submitted_to_is' || t.status === 'is_review';
    if (!isMatch) return false;
    if (isPOD || currentUser?.role === 'system_admin') return true;
    return checkIsISForTemplateLocal(t) || checkIsTemplateOwnerLocal(t);
  });

  // 3. PENDING POD: ONLY submitted_to_pod, resubmitted_to_pod, is_approved, pod_review
  const pendingPODQueue = safeTemplatesList.filter(t => {
    const isMatch = t.status === 'submitted_to_pod' || t.status === 'resubmitted_to_pod' || t.status === 'is_approved' || t.status === 'pod_review';
    return isMatch;
  });

  // 4. DEPLOYED: ONLY deployed templates
  const deployedQueue = safeTemplatesList.filter(t => {
    return t.status === 'deployed' || (t.status === 'approved' && !t.submittedAt && t.isLocked);
  });

  // 5. RETURNED: ONLY returned_by_is, returned_by_pod, returned_for_revision
  const returnedQueue = safeTemplatesList.filter(t => {
    const isMatch = t.status === 'returned_by_is' || t.status === 'returned_by_pod' || t.status === 'returned_for_revision';
    if (!isMatch) return false;
    if (isPOD || currentUser?.role === 'system_admin') return true;
    return checkIsTemplateOwnerLocal(t);
  });

  const draftsCount = draftsQueue.length;
  const pendingISCount = pendingISQueue.length;
  const pendingPODCount = pendingPODQueue.length;
  const deployedCount = deployedQueue.length;
  const returnedCount = returnedQueue.length;

  // Initial Section determination
  const getInitialWorkspaceSection = (): WorkspaceSection => {
    if (isReviewerRole && !isEmployeeMode && pendingISCount > 0) return 'pending_is';
    if (isPOD && pendingPODCount > 0) return 'pending_pod';
    if (returnedCount > 0) return 'returned';
    if (draftsCount > 0) return 'drafts';
    if (deployedCount > 0) return 'deployed';
    return 'drafts';
  };

  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>(getInitialWorkspaceSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Filter templates inside active workspace section
  const getTemplatesForSection = (section: WorkspaceSection): EvaluationTemplate[] => {
    let list: EvaluationTemplate[] = [];
    if (section === 'drafts') list = draftsQueue;
    else if (section === 'pending_is') list = pendingISQueue;
    else if (section === 'pending_pod') list = pendingPODQueue;
    else if (section === 'deployed') list = deployedQueue;
    else if (section === 'returned') list = returnedQueue;

    return list.filter(t => {
      if (companyFilter !== 'all' && t.companyName && t.companyName !== companyFilter) return false;
      if (departmentFilter !== 'all' && t.departmentName && t.departmentName !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = t.title.toLowerCase().includes(q);
        const nameMatch = t.createdForEmployeeName?.toLowerCase().includes(q) || t.createdByName?.toLowerCase().includes(q);
        const deptMatch = t.departmentName?.toLowerCase().includes(q);
        const compMatch = t.companyName?.toLowerCase().includes(q);
        if (!titleMatch && !nameMatch && !deptMatch && !compMatch) return false;
      }
      return true;
    });
  };

  const currentSectionTemplates = getTemplatesForSection(workspaceSection);

  const initialTemplateToSelect = currentSectionTemplates[0] || safeTemplatesList[0] || MASTER_SALES_EVALUATION_TEMPLATE;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateToSelect?.id || MASTER_SALES_EVALUATION_TEMPLATE.id);
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate>(initialTemplateToSelect || MASTER_SALES_EVALUATION_TEMPLATE);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('editor');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});

  // Save status indicator states
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Return/Review remarks states
  const [isRemarkInput, setIsRemarkInput] = useState('');
  const [showISReturnInput, setShowISReturnInput] = useState(false);
  const [podRemarkInput, setPodRemarkInput] = useState('');
  const [showPODReturnInput, setShowPODReturnInput] = useState(false);

  // Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'employee' | 'department'>('employee');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployeeForNewTemplate, setSelectedEmployeeForNewTemplate] = useState<User | null>(null);
  const [selectedDeptForNewTemplate, setSelectedDeptForNewTemplate] = useState<Department | null>(departments[0] || null);

  const currentLoadedTemplateIdRef = useRef<string>(selectedTemplateId);

  // Permission Checks: Strict role and target employee separation
  const isTemplateOwner = checkIsTemplateOwnerLocal(activeTemplate);

  const isAssignedIS = 
    currentUser?.role !== 'employee' &&
    !isTemplateOwner &&
    !isEmployeeMode &&
    (checkIsISForTemplateLocal(activeTemplate) || (currentUser?.role === 'system_admin' && mode === 'supervisor'));

  const isPODApprover = 
    !isEmployeeMode && 
    !isTemplateOwner &&
    (currentUser?.role === 'pod' || currentUser?.role === 'hr_admin' || currentUser?.role === 'system_admin');

  const canEdit = 
    (isPOD && activeTemplate?.status !== 'deployed' && !activeTemplate?.isLocked)
    || (isAssignedIS && (activeTemplate?.status === 'submitted_to_is' || activeTemplate?.status === 'is_review'))
    || (isTemplateOwner && (!activeTemplate?.status || activeTemplate?.status === 'draft' || activeTemplate?.status === 'returned_by_is' || activeTemplate?.status === 'returned_for_revision' || activeTemplate?.status === 'returned_by_pod'))
    || (isDeptHead && isTemplateOwner && (!activeTemplate?.status || activeTemplate?.status === 'draft' || activeTemplate?.status === 'returned_for_revision' || activeTemplate?.status === 'returned_by_is'));

  // Ensure active template synchronizes when section changes or when templates update
  useEffect(() => {
    const list = getTemplatesForSection(workspaceSection);
    const found = list.find(t => t.id === selectedTemplateId);

    if (found) {
      if (found.id !== currentLoadedTemplateIdRef.current) {
        currentLoadedTemplateIdRef.current = found.id;
        setActiveTemplate(found);
        setIsDirty(false);
      }
    } else if (activeTemplate && activeTemplate.id === selectedTemplateId && activeTemplate.status === (workspaceSection === 'drafts' ? 'draft' : activeTemplate.status)) {
      // Newly created or active draft in this section — preserve without resetting
      currentLoadedTemplateIdRef.current = activeTemplate.id;
    } else {
      if (list.length > 0) {
        currentLoadedTemplateIdRef.current = list[0].id;
        setSelectedTemplateId(list[0].id);
        setActiveTemplate(list[0]);
        setIsDirty(false);
      }
    }
  }, [workspaceSection, allTemplates, companyFilter, departmentFilter, searchQuery]);

  // Debounced autosave for drafts
  useEffect(() => {
    if (!isDirty || !activeTemplate || activeTemplate.status !== 'draft') return;

    const timer = setTimeout(() => {
      const committed = getTemplateWithCommittedWeights(activeTemplate);
      const autoSavedDraft: EvaluationTemplate = {
        ...committed,
        status: 'draft',
        createdByUserId: committed.createdByUserId || currentUser?.id,
        createdByName: committed.createdByName || currentUser?.name,
      };
      setAllTemplates(prev => [autoSavedDraft, ...prev.filter(t => t.id !== autoSavedDraft.id)]);
      onSaveTemplate(autoSavedDraft);
      setLastSavedAt(new Date());
      setIsDirty(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isDirty, activeTemplate]);

  const getWeightInputValue = (id: string, defaultValue: number | string): string => {
    return weightInputs[id] ?? String(defaultValue);
  };

  const handleWeightInputChange = (id: string, rawValue: string) => {
    const sanitized = rawValue.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
    setWeightInputs(prev => ({ ...prev, [id]: sanitized }));
    setIsDirty(true);
  };

  const commitWeightInput = (id: string, defaultValue: number): number => {
    const raw = weightInputs[id];
    const numVal = raw === '' || raw === undefined ? defaultValue : Number(raw);
    setWeightInputs(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return numVal;
  };

  const getTemplateWithCommittedWeights = (tmpl: EvaluationTemplate): EvaluationTemplate => {
    let updatedTmpl = { ...tmpl };
    const updatedKras = (updatedTmpl.kraCategories || []).map(kra => {
      const kraKey = `kra_${kra.id}`;
      const committedKraWeight = weightInputs[kraKey] !== undefined ? Number(weightInputs[kraKey]) : kra.categoryWeightPercent;

      const updatedKpis = (kra.kpis || []).map(kpi => {
        const kpiKey = `kpi_${kpi.id}`;
        const committedKpiWeight = weightInputs[kpiKey] !== undefined ? Number(weightInputs[kpiKey]) : kpi.weightPercent;
        const normalizedStandards = Array.isArray(kpi.standards) && kpi.standards.length > 0
          ? kpi.standards
          : [
              { rating: 4, label: '4 - Exceeds', description: '' },
              { rating: 3, label: '3 - Meets', description: '' },
              { rating: 2, label: '2 - Barely Meets', description: '' },
              { rating: 1, label: '1 - Did Not Meet', description: '' },
            ];
        return { ...kpi, weightPercent: committedKpiWeight, standards: normalizedStandards };
      });

      return { ...kra, categoryWeightPercent: committedKraWeight, kpis: updatedKpis };
    });

    const updatedCvs = (updatedTmpl.coreValues || []).map(cv => {
      const cvKey = `cv_${cv.id}`;
      const committedCvWeight = weightInputs[cvKey] !== undefined ? Number(weightInputs[cvKey]) : cv.weightPercent;
      return { ...cv, weightPercent: committedCvWeight };
    });

    updatedTmpl.kraCategories = updatedKras;
    updatedTmpl.coreValues = updatedCvs;
    return updatedTmpl;
  };

  const formatPeriodFromDates = (startDate?: string, endDate?: string): string => {
    if (!startDate && !endDate) return activeTemplate?.evaluationPeriod || '';
    const fmt = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    if (startDate) return `From ${fmt(startDate)}`;
    return endDate ? `Until ${fmt(endDate)}` : '';
  };

  // ── 1. DRAFTS: SAVE UNFINISHED DRAFT (RELAXED VALIDATION) ───────────────────
  const handleSaveAsDraft = () => {
    let templateToSave = getTemplateWithCommittedWeights(activeTemplate);

    if (weightInputs['formula_eligibility'] !== undefined) {
      const raw = weightInputs['formula_eligibility'];
      const numVal = raw === '' ? 85 : Number(raw);
      templateToSave = {
        ...templateToSave,
        formulaConfig: { ...templateToSave.formulaConfig, eligibilityWeight: numVal }
      };
    }
    if (weightInputs['formula_core_values'] !== undefined) {
      const raw = weightInputs['formula_core_values'];
      const numVal = raw === '' ? 15 : Number(raw);
      templateToSave = {
        ...templateToSave,
        formulaConfig: { ...templateToSave.formulaConfig, coreValuesWeight: numVal }
      };
    }
    setWeightInputs({});

    templateToSave = {
      ...templateToSave,
      status: 'draft',
      createdByUserId: templateToSave.createdByUserId || currentUser?.id,
      createdByName: templateToSave.createdByName || currentUser?.name,
      createdByRole: templateToSave.createdByRole || currentUser?.role,
    };

    setAllTemplates(prev => [templateToSave, ...prev.filter(t => t.id !== templateToSave.id)]);
    onSaveTemplate(templateToSave);
    setActiveTemplate(templateToSave);
    setIsDirty(false);
    setLastSavedAt(new Date());
    setValidationErrors([]);
    showToast('Saved as draft in your Drafts workspace!');
  };

  // ── 2. SUBMIT FOR EVALUATION (DELIBERATE ACTION WITH 100% FORMULA VALIDATION) ─
  const handleSubmitForEvaluation = async () => {
    const isResubmission = activeTemplate.status === 'returned_by_is' || activeTemplate.status === 'returned_by_pod' || activeTemplate.status === 'returned_for_revision';

    const baseTmpl = getTemplateWithCommittedWeights(activeTemplate);

    // Strict validation before moving to review queue
    const validation = validateEvaluationTemplate(baseTmpl);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('Please resolve all validation errors before submitting for evaluation.');
      return;
    }

    const matchedSupervisor = 
      resolveSupervisorForUser(currentUser, users) ||
      (users || []).find(u => 
        (baseTmpl.immediateSupervisorId && matchIds(baseTmpl.immediateSupervisorId, u.id)) ||
        (baseTmpl.immediateSupervisorName && matchNames(baseTmpl.immediateSupervisorName, u.name)) ||
        (currentUser?.immediateSuperiorName && matchNames(currentUser.immediateSuperiorName, u.name)) ||
        (currentUser?.immediateSuperiorId && matchIds(currentUser.immediateSuperiorId, u.id))
      );

    const isEmployeeDraft = isEmployeeMode || (currentUser?.role === 'employee');
    const hasIS = Boolean(matchedSupervisor || baseTmpl.immediateSupervisorId || currentUser?.immediateSuperiorId);

    const targetStatus: TemplateStatus = (isEmployeeDraft && hasIS) ? 'submitted_to_is' : 'submitted_to_pod';
    const isId = matchedSupervisor?.id || baseTmpl.immediateSupervisorId || currentUser?.immediateSuperiorId;
    const isName = (targetStatus === 'submitted_to_is')
      ? (matchedSupervisor?.name || baseTmpl.immediateSupervisorName || currentUser?.immediateSuperiorName || 'Immediate Supervisor')
      : 'People Operations (POD)';
    const isRole = matchedSupervisor?.role || 'supervisor';

    const confirmMsg = isResubmission
      ? `Resubmit your revised evaluation template to ${isName} for review?\n\nOnce submitted, this template will move to the review queue.`
      : `Submit "${baseTmpl.title}" for evaluation to ${isName}?\n\nOnce submitted, this template moves out of Drafts into the review queue and cannot be edited as an unfinished draft.`;

    if (!window.confirm(confirmMsg)) return;

    const submitted: EvaluationTemplate = {
      ...baseTmpl,
      status: targetStatus,
      submittedAt: new Date().toISOString(),
      templateSource: baseTmpl.templateSource || (isEmployeeDraft ? 'EMPLOYEE' : isDeptHead ? 'DEPT_HEAD' : 'POD'),
      createdForEmployeeId: baseTmpl.createdForEmployeeId || currentUser?.id,
      createdForEmployeeName: baseTmpl.createdForEmployeeName || currentUser?.name,
      createdForEmployeeNumber: baseTmpl.createdForEmployeeNumber || currentUser?.employeeNumber,
      createdForPosition: baseTmpl.createdForPosition || currentUser?.position,
      companyId: baseTmpl.companyId || currentUser?.companyId || 'comp_adventures',
      companyName: baseTmpl.companyName || currentUser?.companyName || 'Adventures',
      immediateSupervisorId: isId,
      immediateSupervisorName: isName,
      createdByRole: baseTmpl.createdByRole || currentUser?.role,
      createdByUserId: baseTmpl.createdByUserId || currentUser?.id,
      createdByName: baseTmpl.createdByName || currentUser?.name,
    };

    setWeightInputs({});
    setValidationErrors([]);
    setIsDirty(false);
    currentLoadedTemplateIdRef.current = submitted.id;
    setSelectedTemplateId(submitted.id);

    setAllTemplates(prev => [submitted, ...prev.filter(t => t.id !== submitted.id)]);
    onSaveTemplate(submitted);
    setActiveTemplate(submitted);

    setWorkspaceSection(targetStatus === 'submitted_to_is' ? 'pending_is' : 'pending_pod');

    try {
      if (targetStatus === 'submitted_to_is') {
        await triggerTemplateWorkflowNotification({
          recipientRole: (isRole as any) || 'supervisor',
          targetUserId: isId,
          templateId: submitted.id,
          templateTitle: submitted.title,
          departmentName: submitted.departmentName,
          senderName: currentUser?.name || 'Employee',
          title: isResubmission ? 'Revised Evaluation Template Resubmitted' : 'Evaluation Template Submitted',
          message: `${currentUser?.name || 'Employee'} has submitted an evaluation template for your Immediate Supervisor review.`,
          type: 'action_required',
          status: targetStatus,
        });
      } else {
        await triggerTemplateWorkflowNotification({
          recipientRole: 'pod',
          templateId: submitted.id,
          templateTitle: submitted.title,
          departmentName: submitted.departmentName,
          senderName: currentUser?.name || 'Staff Member',
          title: 'Evaluation Template Submitted for POD Validation',
          message: `${currentUser?.name} has submitted an evaluation template for People Operations validation.`,
          type: 'action_required',
          status: targetStatus,
        });
      }
    } catch (e) {
      console.warn('[TemplateBuilder] Notification error:', e);
    }

    showToast(`Template successfully submitted to ${isName} for evaluation!`);
  };

  // ── 3. IMMEDIATE SUPERVISOR (IS) ACTION: APPROVE OR RETURN ──────────────────
  const handleISAction = async (action: 'approve' | 'return') => {
    const baseTmpl = getTemplateWithCommittedWeights(activeTemplate);

    if (action === 'return') {
      if (!isRemarkInput.trim()) {
        setShowISReturnInput(true);
        showToast('Please enter revision remarks for the employee.');
        return;
      }

      const returned: EvaluationTemplate = {
        ...baseTmpl,
        status: 'returned_by_is',
        isReviewRemarks: isRemarkInput.trim(),
        reviewedAt: new Date().toISOString(),
      };

      setWeightInputs({});
      setAllTemplates(prev => [returned, ...prev.filter(t => t.id !== returned.id)]);
      onSaveTemplate(returned);
      setActiveTemplate(returned);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: baseTmpl.createdForEmployeeId || baseTmpl.createdByUserId,
          recipientRole: 'employee',
          templateId: returned.id,
          templateTitle: returned.title,
          departmentName: baseTmpl.departmentName,
          senderName: currentUser?.name || 'Immediate Supervisor',
          title: 'Evaluation Template Returned for Revision',
          message: `Your Immediate Supervisor (${currentUser?.name}) has returned your evaluation template for revision. Remarks: "${isRemarkInput.trim()}".`,
          type: 'alert',
          status: 'returned_by_is',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setIsRemarkInput('');
      setShowISReturnInput(false);
      showToast('Template returned to employee for revision.');
    } else if (action === 'approve') {
      const approved: EvaluationTemplate = {
        ...baseTmpl,
        status: 'is_approved',
        isApprovedAt: new Date().toISOString(),
        isReviewRemarks: isRemarkInput.trim() || baseTmpl.isReviewRemarks,
        reviewedAt: new Date().toISOString(),
      };

      setWeightInputs({});
      setAllTemplates(prev => [approved, ...prev.filter(t => t.id !== approved.id)]);
      onSaveTemplate(approved);
      setActiveTemplate(approved);

      try {
        await triggerTemplateWorkflowNotification({
          recipientRole: 'pod',
          templateId: approved.id,
          templateTitle: approved.title,
          departmentName: approved.departmentName,
          senderName: currentUser?.name || 'Immediate Supervisor',
          title: 'IS-Approved Evaluation Template Awaiting POD Validation',
          message: `${currentUser?.name} (Immediate Supervisor) has approved the evaluation template for ${approved.createdForEmployeeName || approved.title}. Awaiting POD final validation.`,
          type: 'action_required',
          status: 'is_approved',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setIsRemarkInput('');
      showToast('Template approved by Immediate Supervisor and forwarded to People Operations (POD)!');
    }
  };

  // ── 4. PEOPLE OPERATIONS (POD) ACTION: APPROVE, DEPLOY, RETURN ───────────────
  const handlePODAction = async (action: 'approve' | 'deploy' | 'return') => {
    const baseTmpl = getTemplateWithCommittedWeights(activeTemplate);

    if (action === 'return') {
      if (!podRemarkInput.trim()) {
        setShowPODReturnInput(true);
        showToast('Please enter revision remarks.');
        return;
      }

      const returned: EvaluationTemplate = {
        ...baseTmpl,
        status: 'returned_by_pod',
        podRemarks: podRemarkInput.trim(),
        reviewedAt: new Date().toISOString(),
      };

      setWeightInputs({});
      setAllTemplates(prev => [returned, ...prev.filter(t => t.id !== returned.id)]);
      onSaveTemplate(returned);
      setActiveTemplate(returned);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: baseTmpl.createdForEmployeeId || baseTmpl.createdByUserId,
          recipientRole: 'employee',
          recipientDepartment: baseTmpl.departmentName,
          templateId: returned.id,
          templateTitle: returned.title,
          departmentName: baseTmpl.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Returned by POD',
          message: `People Operations (${currentUser?.name || 'POD'}) has returned the evaluation template "${baseTmpl.title}" for revision. Remarks: "${podRemarkInput.trim()}".`,
          type: 'alert',
          status: 'returned_by_pod',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setPodRemarkInput('');
      setShowPODReturnInput(false);
      showToast('Template returned for revision.');
    } else if (action === 'approve') {
      const approved: EvaluationTemplate = {
        ...baseTmpl,
        status: 'pod_approved',
        podApprovedAt: new Date().toISOString(),
        podRemarks: podRemarkInput.trim() || baseTmpl.podRemarks,
        reviewedAt: new Date().toISOString(),
      };

      setWeightInputs({});
      setAllTemplates(prev => [approved, ...prev.filter(t => t.id !== approved.id)]);
      onSaveTemplate(approved);
      setActiveTemplate(approved);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: baseTmpl.createdForEmployeeId || baseTmpl.createdByUserId,
          recipientRole: 'employee',
          templateId: approved.id,
          templateTitle: approved.title,
          departmentName: baseTmpl.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Validated & Approved by POD',
          message: `People Operations (${currentUser?.name || 'POD'}) has validated and approved the evaluation template "${baseTmpl.title}".`,
          type: 'success',
          status: 'pod_approved',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setPodRemarkInput('');
      showToast('Template validated and approved by POD. Ready to deploy.');
    } else if (action === 'deploy') {
      const validation = validateEvaluationTemplate(baseTmpl);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        showToast('Template must satisfy all 100% weight criteria before official deployment.');
        return;
      }

      const deployed: EvaluationTemplate = {
        ...baseTmpl,
        status: 'deployed',
        isLocked: true,
        deployedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      };

      setWeightInputs({});
      setAllTemplates(prev => [deployed, ...prev.filter(t => t.id !== deployed.id)]);
      onSaveTemplate(deployed);
      setActiveTemplate(deployed);
      setWorkspaceSection('deployed');
      showToast('Evaluation template deployed successfully! Template is now active and locked.');
    }
  };

  // ── 5. CREATE NEW REVISION (FROM DEPLOYED) ──────────────────────────────────
  const handleCreateRevision = () => {
    const nextVersion = (activeTemplate.version || 1) + 1;
    const revision: EvaluationTemplate = {
      ...activeTemplate,
      id: generateUuid(),
      title: `${activeTemplate.title.replace(/\s*\(v\d+\)$/i, '')} (v${nextVersion})`,
      version: nextVersion,
      status: 'draft',
      isLocked: false,
      createdAt: new Date().toISOString().substring(0, 10),
      submittedAt: undefined,
      reviewedAt: undefined,
      isApprovedAt: undefined,
      podApprovedAt: undefined,
      deployedAt: undefined,
      isReviewRemarks: undefined,
      podRemarks: undefined,
    };

    currentLoadedTemplateIdRef.current = revision.id;
    setAllTemplates(prev => [revision, ...prev.filter(t => t.id !== revision.id)]);
    onSaveTemplate(revision);
    setActiveTemplate(revision);
    setSelectedTemplateId(revision.id);
    setWorkspaceSection('drafts');
    setMobileTab('editor');
    showToast(`Created new draft Revision v${nextVersion}! Original deployed template remains locked.`);
  };

  // ── 6. DELETE DRAFT ACTION ──────────────────────────────────────────────────
  const handleDeleteDraftAction = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const tmplToDelete = allTemplates.find(t => t.id === templateId);
    if (!tmplToDelete) return;

    if (tmplToDelete.status !== 'draft') {
      alert('Only draft templates can be deleted here.');
      return;
    }

    if (!checkIsTemplateOwnerLocal(tmplToDelete) && !isPOD && currentUser?.role !== 'system_admin') {
      alert('You can only delete your own draft templates.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the draft "${tmplToDelete.title}"? This cannot be undone.`)) {
      if (onDeleteTemplate) {
        onDeleteTemplate(templateId);
      }
      setAllTemplates(prev => prev.filter(t => t.id !== templateId));
      const remaining = draftsQueue.filter(t => t.id !== templateId);
      if (selectedTemplateId === templateId) {
        if (remaining.length > 0) {
          setSelectedTemplateId(remaining[0].id);
          setActiveTemplate(remaining[0]);
        }
      }
      showToast('Draft template deleted successfully!');
    }
  };

  const handleSelectTemplate = (id: string) => {
    currentLoadedTemplateIdRef.current = id;
    setSelectedTemplateId(id);
    setValidationErrors([]);
    setIsDirty(false);
    const tmpl = allTemplates.find((t) => t.id === id);
    if (tmpl) setActiveTemplate(tmpl);
    setMobileTab('editor');
  };

  // ── CREATE NEW TEMPLATE (INSTANT INITIALIZATION & SELECTION) ─────────────────
  const handleOpenCreateModal = () => {
    if (isEmployeeMode) {
      // Employee directly creates a brand new personal draft scorecard
      const currentYear = new Date().getFullYear();
      const defaultStart = `${currentYear}-01-01`;
      const defaultEnd = `${currentYear}-12-31`;
      const defaultPeriod = `Jan 1, ${currentYear} – Dec 31, ${currentYear}`;
      const matchedSupervisor = resolveSupervisorForUser(currentUser, users);

      const newTmpl = createMasterBasedTemplate(
        currentUser?.departmentId || 'dept_gen',
        currentUser?.departmentName || 'General',
        `${currentUser?.name || 'My'} Performance Scorecard (Draft)`,
        defaultPeriod
      );

      newTmpl.id = generateUuid();
      newTmpl.status = 'draft';
      newTmpl.templateSource = 'EMPLOYEE';
      newTmpl.createdForEmployeeId = currentUser?.id;
      newTmpl.createdForEmployeeName = currentUser?.name;
      newTmpl.createdForEmployeeNumber = currentUser?.employeeNumber;
      newTmpl.createdForPosition = currentUser?.position;
      newTmpl.companyId = currentUser?.companyId || 'comp_adventures';
      newTmpl.companyName = currentUser?.companyName || 'Adventures';
      newTmpl.departmentId = currentUser?.departmentId || 'dept_gen';
      newTmpl.departmentName = currentUser?.departmentName || 'General';
      newTmpl.immediateSupervisorId = matchedSupervisor?.id || currentUser?.immediateSuperiorId;
      newTmpl.immediateSupervisorName = matchedSupervisor?.name || currentUser?.immediateSuperiorName;
      newTmpl.createdByRole = currentUser?.role;
      newTmpl.createdByUserId = currentUser?.id;
      newTmpl.createdByName = currentUser?.name;
      newTmpl.startDate = defaultStart;
      newTmpl.endDate = defaultEnd;

      // 1. Immediately inject into local state so it is visible instantly
      setAllTemplates(prev => [newTmpl, ...prev.filter(t => t.id !== newTmpl.id)]);
      currentLoadedTemplateIdRef.current = newTmpl.id;
      setSelectedTemplateId(newTmpl.id);
      setActiveTemplate(newTmpl);
      setWorkspaceSection('drafts');
      setMobileTab('editor');
      setValidationErrors([]);
      setIsDirty(false);
      setLastSavedAt(new Date());

      // 2. Persist
      onSaveTemplate(newTmpl);
      showToast('New draft template created! You can now customize your KRAs & KPIs.');
      return;
    }

    // POD / Admin opens creation modal
    setShowCreateModal(true);
    setCreateType('employee');
    setSelectedEmployeeForNewTemplate(null);
    setEmployeeSearchQuery('');
  };

  const handleConfirmCreateTemplate = () => {
    const currentYear = new Date().getFullYear();
    const defaultStart = `${currentYear}-01-01`;
    const defaultEnd = `${currentYear}-12-31`;
    const defaultPeriod = formatPeriodFromDates(defaultStart, defaultEnd);

    if (createType === 'employee') {
      if (!selectedEmployeeForNewTemplate) {
        alert('Please select an employee for the template.');
        return;
      }

      const emp = selectedEmployeeForNewTemplate;
      const newTemplate = createMasterBasedTemplate(
        emp.departmentId || 'dept_gen',
        emp.departmentName || 'General',
        `${emp.name} — Performance Scorecard (Draft)`,
        defaultPeriod
      );

      newTemplate.id = generateUuid();
      newTemplate.status = 'draft';
      newTemplate.templateSource = 'POD';
      newTemplate.createdForEmployeeId = emp.id;
      newTemplate.createdForEmployeeName = emp.name;
      newTemplate.createdForEmployeeNumber = emp.employeeNumber;
      newTemplate.createdForPosition = emp.position;
      newTemplate.companyId = emp.companyId || 'comp_adventures';
      newTemplate.companyName = emp.companyName || 'Adventures';
      newTemplate.departmentId = emp.departmentId;
      newTemplate.departmentName = emp.departmentName;
      newTemplate.immediateSupervisorId = emp.immediateSuperiorId;
      newTemplate.immediateSupervisorName = emp.immediateSuperiorName;
      newTemplate.createdByRole = currentUser?.role;
      newTemplate.createdByUserId = currentUser?.id;
      newTemplate.createdByName = currentUser?.name;
      newTemplate.startDate = defaultStart;
      newTemplate.endDate = defaultEnd;

      setAllTemplates(prev => [newTemplate, ...prev.filter(t => t.id !== newTemplate.id)]);
      currentLoadedTemplateIdRef.current = newTemplate.id;
      setSelectedTemplateId(newTemplate.id);
      setActiveTemplate(newTemplate);
      setWorkspaceSection('drafts');
      setMobileTab('editor');
      setShowCreateModal(false);
      setValidationErrors([]);
      setIsDirty(false);
      setLastSavedAt(new Date());

      onSaveTemplate(newTemplate);
      showToast(`Draft template created for ${emp.name}!`);
    } else {
      const dept = selectedDeptForNewTemplate || departments[0];
      const newTemplate = createMasterBasedTemplate(
        dept.id,
        dept.name,
        `${dept.name} Performance Scorecard (Draft)`,
        defaultPeriod
      );

      newTemplate.id = generateUuid();
      newTemplate.status = 'draft';
      newTemplate.templateSource = 'POD';
      newTemplate.companyName = dept.companyName || 'Adventures';
      newTemplate.departmentId = dept.id;
      newTemplate.departmentName = dept.name;
      newTemplate.createdByRole = currentUser?.role;
      newTemplate.createdByUserId = currentUser?.id;
      newTemplate.createdByName = currentUser?.name;
      newTemplate.startDate = defaultStart;
      newTemplate.endDate = defaultEnd;

      setAllTemplates(prev => [newTemplate, ...prev.filter(t => t.id !== newTemplate.id)]);
      currentLoadedTemplateIdRef.current = newTemplate.id;
      setSelectedTemplateId(newTemplate.id);
      setActiveTemplate(newTemplate);
      setWorkspaceSection('drafts');
      setMobileTab('editor');
      setShowCreateModal(false);
      setValidationErrors([]);
      setIsDirty(false);
      setLastSavedAt(new Date());

      onSaveTemplate(newTemplate);
      showToast(`Department draft template created!`);
    }
  };

  // ── KRA / KPI ACTIONS ───────────────────────────────────────────────────────
  const handleAddKRA = () => {
    const newKra: KRACategory = {
      id: `kra_${Date.now()}`,
      name: `${(activeTemplate?.kraCategories?.length || 0) + 1}. NEW KEY RESULT AREA`,
      categoryWeightPercent: 10,
      kpis: []
    };
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: [...(activeTemplate?.kraCategories || []), newKra]
    });
    setIsDirty(true);
  };

  const handleRemoveKRA = (kraId: string) => {
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: (activeTemplate?.kraCategories || []).filter(k => k.id !== kraId)
    });
    setIsDirty(true);
  };

  const handleAddKPI = (kraId: string) => {
    const kra = (activeTemplate?.kraCategories || []).find(k => k.id === kraId);
    const count = kra?.kpis.length || 0;
    const letter = String.fromCharCode(65 + count);
    const newKpi: KPITemplateItem = {
      id: `kpi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kraId,
      kraName: kra?.name || '',
      name: `${letter}. Performance Type`,
      description: '',
      weightPercent: 5,
      evidenceRequired: false,
      standards: [
        { rating: 4, label: '4 - Exceeds', description: '' },
        { rating: 3, label: '3 - Meets', description: '' },
        { rating: 2, label: '2 - Barely Meets', description: '' },
        { rating: 1, label: '1 - Did Not Meet', description: '' },
      ]
    };

    const updated = (activeTemplate?.kraCategories || []).map(k => {
      if (k.id === kraId) {
        return { ...k, kpis: [...k.kpis, newKpi] };
      }
      return k;
    });

    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  const handleRemoveKPI = (kraId: string, kpiId: string) => {
    const updated = (activeTemplate?.kraCategories || []).map(k => {
      if (k.id === kraId) {
        return { ...k, kpis: k.kpis.filter(item => item.id !== kpiId) };
      }
      return k;
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  const handleUpdateKPIStandard = (
    kraId: string,
    kpiId: string,
    standardIndex: number,
    field: 'description' | 'label',
    value: string
  ) => {
    const updated = (activeTemplate?.kraCategories || []).map(kra => {
      if (kra.id !== kraId) return kra;
      const updatedKpis = kra.kpis.map(kpi => {
        if (kpi.id !== kpiId) return kpi;
        const currentStandards = Array.isArray(kpi.standards) && kpi.standards.length > 0
          ? [...kpi.standards]
          : [
              { rating: 4, label: '4 - Exceeds', description: '' },
              { rating: 3, label: '3 - Meets', description: '' },
              { rating: 2, label: '2 - Barely Meets', description: '' },
              { rating: 1, label: '1 - Did Not Meet', description: '' },
            ];
        currentStandards[standardIndex] = {
          ...currentStandards[standardIndex],
          [field]: value
        };
        return { ...kpi, standards: currentStandards };
      });
      return { ...kra, kpis: updatedKpis };
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  const handleAddKPIStandard = (kraId: string, kpiId: string) => {
    const updated = (activeTemplate?.kraCategories || []).map(kra => {
      if (kra.id !== kraId) return kra;
      const updatedKpis = kra.kpis.map(kpi => {
        if (kpi.id !== kpiId) return kpi;
        const currentStandards = Array.isArray(kpi.standards) ? [...kpi.standards] : [];
        const nextRating = Math.max(1, 4 - currentStandards.length) as 1 | 2 | 3 | 4;
        const newStandard: RatingStandard = {
          rating: nextRating,
          label: `${nextRating} - Standard`,
          description: ''
        };
        return { ...kpi, standards: [...currentStandards, newStandard] };
      });
      return { ...kra, kpis: updatedKpis };
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  const handleRemoveKPIStandard = (kraId: string, kpiId: string, standardIndex: number) => {
    const updated = (activeTemplate?.kraCategories || []).map(kra => {
      if (kra.id !== kraId) return kra;
      const updatedKpis = kra.kpis.map(kpi => {
        if (kpi.id !== kpiId) return kpi;
        const currentStandards = Array.isArray(kpi.standards) ? [...kpi.standards] : [];
        const nextStandards = currentStandards.filter((_, idx) => idx !== standardIndex);
        return { ...kpi, standards: nextStandards };
      });
      return { ...kra, kpis: updatedKpis };
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  const handleResetKPIStandards = (kraId: string, kpiId: string) => {
    const defaultStandards: RatingStandard[] = [
      { rating: 4, label: '4 - Exceeds', description: '' },
      { rating: 3, label: '3 - Meets', description: '' },
      { rating: 2, label: '2 - Barely Meets', description: '' },
      { rating: 1, label: '1 - Did Not Meet', description: '' },
    ];
    const updated = (activeTemplate?.kraCategories || []).map(kra => {
      if (kra.id !== kraId) return kra;
      const updatedKpis = kra.kpis.map(kpi => {
        if (kpi.id !== kpiId) return kpi;
        return { ...kpi, standards: defaultStandards };
      });
      return { ...kra, kpis: updatedKpis };
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
    setIsDirty(true);
  };

  // ── CORE VALUES ACTIONS ─────────────────────────────────────────────────────
  const handleAddCoreValue = () => {
    const newCoreValue: CoreValue = {
      id: `cv_${Date.now()}`,
      name: 'New Core Value',
      description: 'Core value description.',
      weightPercent: 0,
      sortOrder: (activeTemplate?.coreValues?.length || 0) + 1
    };
    setActiveTemplate({
      ...activeTemplate,
      coreValues: [...(activeTemplate?.coreValues || []), newCoreValue]
    });
    setIsDirty(true);
  };

  const handleRemoveCoreValue = (coreValueId: string) => {
    if (!window.confirm('Are you sure you want to remove this Core Value?')) return;
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate?.coreValues || []).filter(cv => cv.id !== coreValueId)
    });
    setIsDirty(true);
  };

  const handleUpdateCoreValue = (coreValueId: string, field: keyof CoreValue, value: string | number) => {
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate?.coreValues || []).map(cv =>
        cv.id === coreValueId ? { ...cv, [field]: value } : cv
      )
    });
    setIsDirty(true);
  };

  const recalculateCoreValueWeights = () => {
    const cvCount = activeTemplate?.coreValues?.length || 0;
    if (cvCount === 0) return;
    const part1bWeight = activeTemplate?.formulaConfig?.coreValuesWeight || 15;
    const weightPerCV = Number((part1bWeight / cvCount).toFixed(4));
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate?.coreValues || []).map((cv, idx) => ({
        ...cv,
        weightPercent: Number(weightPerCV.toFixed(2)),
        sortOrder: idx + 1
      }))
    });
    setIsDirty(true);
  };

  const totalCoreValueWeight = (activeTemplate?.coreValues || []).reduce((sum, cv) => sum + (Number(cv.weightPercent) || 0), 0);
  const isCoreValuesValid = Math.abs(totalCoreValueWeight - (activeTemplate?.formulaConfig?.coreValuesWeight || 15)) < 0.01;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getKpiTotal = (kra: KRACategory) => {
    return (kra.kpis || []).reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0);
  };

  const getKraTotalWeight = () => {
    return (activeTemplate?.kraCategories || []).reduce((sum, kra) => sum + (Number(kra.categoryWeightPercent) || 0), 0);
  };

  const getAllKpisTotalWeight = () => {
    return (activeTemplate?.kraCategories || []).reduce((sum, kra) => {
      return sum + (kra.kpis || []).reduce((kpiSum, kpi) => kpiSum + (Number(kpi.weightPercent) || 0), 0);
    }, 0);
  };

  const eligibilityWeight = Number(activeTemplate?.formulaConfig?.eligibilityWeight) || 85;
  const isPart1AKraWeightValid = () => Math.abs(getKraTotalWeight() - eligibilityWeight) < 0.01;
  const isPart1AKpiWeightValid = () => Math.abs(getAllKpisTotalWeight() - eligibilityWeight) < 0.01;

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    submitted_to_is: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    is_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    returned_by_is: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    is_approved: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
    submitted_to_pod: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
    resubmitted_to_pod: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
    returned_for_revision: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    returned_by_pod: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    pod_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    pod_approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  };

  const statusBadgeLabels: Record<string, string> = {
    draft: 'Draft',
    submitted_to_is: 'Pending IS',
    is_review: 'IS Review',
    returned_by_is: 'Returned by IS',
    is_approved: 'Pending POD',
    submitted_to_pod: 'Pending POD',
    resubmitted_to_pod: 'Resubmitted to POD',
    returned_for_revision: 'Returned',
    returned_by_pod: 'Returned by POD',
    pod_review: 'POD Review',
    pod_approved: 'POD Approved',
    approved: 'Approved',
    deployed: 'Deployed',
  };

  // Filtered employees for create modal
  const filteredEmployeesForModal = users.filter(u => {
    if (u.role === 'system_admin') return false;
    const q = employeeSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.employeeNumber && u.employeeNumber.toLowerCase().includes(q)) ||
      (u.companyName && u.companyName.toLowerCase().includes(q)) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q)) ||
      (u.position && u.position.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 pb-12">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#F28C28] flex items-center space-x-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-[#F28C28]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-1">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Submission Validation Errors — Please resolve before submitting:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-600 dark:text-rose-400 space-y-0.5 ml-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── HEADER BANNER (CLEAN & SLEEK) ────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#E96B1A]" />
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isEmployeeMode 
                ? 'My Evaluation Scorecard' 
                : isSupervisorRole 
                ? 'Evaluation Template Reviews'
                : 'Evaluation Templates Workspace'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEmployeeMode
              ? 'Draft your personalized performance scorecard and submit to your Immediate Supervisor.'
              : isSupervisorRole
              ? 'Review, calibrate weights, and approve team scorecards.'
              : 'Create, review, and govern company evaluation scorecard templates.'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Template</span>
          </button>
        )}
      </div>

      {/* ── TOP SEGMENTED WORKSPACE QUEUES NAVIGATION (LIGHTWEIGHT & INTUITIVE) ─ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setWorkspaceSection('drafts');
              setMobileTab('list');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              workspaceSection === 'drafts'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Drafts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              workspaceSection === 'drafts' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {draftsCount}
            </span>
          </button>

          {(isSupervisorRole || isPOD || isDeptHead || pendingISCount > 0) && (
            <button
              type="button"
              onClick={() => {
                setWorkspaceSection('pending_is');
                setMobileTab('list');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                workspaceSection === 'pending_is'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Pending IS</span>
              {pendingISCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  workspaceSection === 'pending_is' ? 'bg-amber-700 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {pendingISCount}
                </span>
              )}
            </button>
          )}

          {(isSupervisorRole || isPOD || isDeptHead || pendingPODCount > 0) && (
            <button
              type="button"
              onClick={() => {
                setWorkspaceSection('pending_pod');
                setMobileTab('list');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                workspaceSection === 'pending_pod'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pending POD</span>
              {pendingPODCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  workspaceSection === 'pending_pod' ? 'bg-indigo-700 text-white' : 'bg-indigo-500 text-white'
                }`}>
                  {pendingPODCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setWorkspaceSection('deployed');
              setMobileTab('list');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              workspaceSection === 'deployed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deployed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              workspaceSection === 'deployed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {deployedCount}
            </span>
          </button>

          {returnedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setWorkspaceSection('returned');
                setMobileTab('list');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                workspaceSection === 'returned'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Returned ({returnedCount})</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-medium px-2 hidden md:block">
          {workspaceSection === 'drafts' && 'Unfinished private drafts'}
          {workspaceSection === 'pending_is' && 'Awaiting Supervisor evaluation'}
          {workspaceSection === 'pending_pod' && 'Awaiting POD final review'}
          {workspaceSection === 'deployed' && 'Active deployed scorecards'}
          {workspaceSection === 'returned' && 'Returned for adjustments'}
        </div>
      </div>

      {/* Mobile Switcher (Queue List vs Editor) */}
      <div className="lg:hidden flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'list'
              ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Queue ({currentSectionTemplates.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'editor'
              ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span className="truncate max-w-[130px]">{activeTemplate?.title || 'Editor'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT SIDEBAR QUEUE LIST ─────────────────────────────────────────── */}
        <div className={`lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:h-[calc(100vh-140px)] lg:min-h-[580px] lg:sticky lg:top-4 ${
          mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search bar */}
          <div className="space-y-2 mb-3 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E96B1A]"
              />
            </div>

            {isPOD && (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px]"
                >
                  <option value="all">All Companies</option>
                  <option value="HDI WORLD">HDI WORLD</option>
                  <option value="Hillcroft Properties">Hillcroft Properties</option>
                  <option value="Capital Growth Properties">Capital Growth Properties</option>
                  <option value="Erminland Properties">Erminland Properties</option>
                  <option value="Stanford">Stanford</option>
                  <option value="Adventures">Adventures</option>
                </select>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px]"
                >
                  <option value="all">All Depts</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-8">
            {currentSectionTemplates.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Inbox className="w-7 h-7 mx-auto text-slate-400" />
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  {workspaceSection === 'drafts' && 'No unfinished drafts'}
                  {workspaceSection === 'pending_is' && 'No templates awaiting IS review'}
                  {workspaceSection === 'pending_pod' && 'No templates awaiting POD validation'}
                  {workspaceSection === 'deployed' && 'No deployed templates'}
                  {workspaceSection === 'returned' && 'No returned templates'}
                </p>
                {workspaceSection === 'drafts' && canCreate && (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-1 px-3 py-1 rounded-lg bg-[#E96B1A] text-white text-xs font-bold shadow-sm"
                  >
                    + Create Template
                  </button>
                )}
              </div>
            ) : (
              currentSectionTemplates.map((tmpl) => {
                const sts = tmpl.status || 'deployed';
                const isSelected = selectedTemplateId === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#E96B1A] ring-1 ring-[#E96B1A]/30'
                        : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {tmpl.departmentName || 'General'}
                      </span>

                      <div className="flex items-center space-x-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColors[sts] || statusColors.deployed}`}>
                          {statusBadgeLabels[sts] || sts}
                        </span>

                        {workspaceSection === 'drafts' && (checkIsTemplateOwnerLocal(tmpl) || isPOD || currentUser?.role === 'system_admin') && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDraftAction(tmpl.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-1.5 leading-snug">
                      {tmpl.title}
                    </p>

                    {tmpl.createdForEmployeeName && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                        <UserIcon className="w-2.5 h-2.5" />
                        <span>For: {tmpl.createdForEmployeeName}</span>
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT DETAILS & EDITOR FORM ────────────────────────────────────── */}
        <div className={`lg:col-span-8 space-y-4 ${
          mobileTab === 'list' ? 'hidden lg:block' : 'block'
        }`}>
          {/* Mobile Back Button */}
          <div className="lg:hidden flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => setMobileTab('list')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4 text-[#E96B1A]" />
              <span>Back to Queue</span>
            </button>
          </div>

          {/* ── SUPERVISOR REVIEW ACTION CARD (ONLY IN PENDING IS) ───────────── */}
          {isAssignedIS && (activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review') && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Immediate Supervisor Review
                  </span>
                </div>
                {activeTemplate.createdForEmployeeName && (
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Submitted by: {activeTemplate.createdForEmployeeName}
                  </span>
                )}
              </div>

              {showISReturnInput && (
                <div className="space-y-1">
                  <textarea
                    value={isRemarkInput}
                    onChange={(e) => setIsRemarkInput(e.target.value)}
                    rows={2}
                    placeholder="Enter revision remarks for the employee..."
                    className="w-full text-xs p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleISAction('approve')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Approve & Forward to POD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showISReturnInput) handleISAction('return');
                    else setShowISReturnInput(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{showISReturnInput ? 'Confirm Return' : 'Return for Revision'}</span>
                </button>
                {showISReturnInput && (
                  <button
                    type="button"
                    onClick={() => setShowISReturnInput(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── POD REVIEW ACTION CARD (ONLY IN PENDING POD) ──────────────────── */}
          {isPODApprover && (activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod' || activeTemplate.status === 'is_approved' || activeTemplate.status === 'pod_review') && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    People Operations (POD) Validation
                  </span>
                </div>
                {activeTemplate.createdForEmployeeName && (
                  <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                    Employee: {activeTemplate.createdForEmployeeName}
                  </span>
                )}
              </div>

              {showPODReturnInput && (
                <div className="space-y-1">
                  <textarea
                    value={podRemarkInput}
                    onChange={(e) => setPodRemarkInput(e.target.value)}
                    rows={2}
                    placeholder="Enter revision remarks..."
                    className="w-full text-xs p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePODAction('deploy')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Deploy Scorecard</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePODAction('approve')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showPODReturnInput) handlePODAction('return');
                    else setShowPODReturnInput(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{showPODReturnInput ? 'Confirm Return' : 'Return for Revision'}</span>
                </button>
                {showPODReturnInput && (
                  <button
                    type="button"
                    onClick={() => setShowPODReturnInput(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── CARD 1: TEMPLATE TITLE, PERIOD & CLEAN METADATA (NO JARGON) ──── */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Template Title
                </label>
                <input
                  type="text"
                  value={activeTemplate?.title || ''}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setActiveTemplate({ ...activeTemplate, title: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-70 focus:ring-1 focus:ring-[#E96B1A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Evaluation Period
                </label>
                <input
                  type="text"
                  value={activeTemplate?.evaluationPeriod || ''}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setActiveTemplate({ ...activeTemplate, evaluationPeriod: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-70 focus:ring-1 focus:ring-[#E96B1A]"
                  placeholder="e.g. Jan 1, 2026 – Dec 31, 2026"
                />
              </div>
            </div>

            {/* Clean, Lightweight Target Employee Metadata Tagline */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-750 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                👤 {activeTemplate?.createdForEmployeeName || currentUser?.name || 'Staff Member'}
              </span>
              <span>•</span>
              <span>{activeTemplate?.createdForPosition || currentUser?.position || 'Staff'}</span>
              <span>•</span>
              <span>{activeTemplate?.departmentName || 'General'}</span>
              {activeTemplate?.companyName && (
                <>
                  <span>•</span>
                  <span>{activeTemplate?.companyName}</span>
                </>
              )}
              {activeTemplate?.immediateSupervisorName && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Supervisor: {activeTemplate?.immediateSupervisorName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── CARD 2: WEIGHT PROGRESS & ACTIONS TOOLBAR ─────────────────────── */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Weight Summary Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                isPart1AKraWeightValid() && isPart1AKpiWeightValid()
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                Part 1A (KRAs): {getKraTotalWeight()}% / {eligibilityWeight}%
              </div>

              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                isCoreValuesValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                Part 1B (Values): {Number(totalCoreValueWeight.toFixed(2))}% / {activeTemplate?.formulaConfig?.coreValuesWeight || 15}%
              </div>

              {/* Save status badge */}
              <div className="text-[11px] font-medium pl-1">
                {isDirty ? (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved
                  </span>
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" />
                    Saved
                  </span>
                ) : null}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const committed = getTemplateWithCommittedWeights(activeTemplate);
                  setActiveTemplate(committed);
                  setShowPreviewModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              {activeTemplate?.status === 'deployed' && (
                <button
                  type="button"
                  onClick={handleCreateRevision}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Revision</span>
                </button>
              )}

              {canEdit && !activeTemplate?.isLocked && (
                <>
                  {activeTemplate?.status === 'draft' && (
                    <button
                      type="button"
                      onClick={handleSaveAsDraft}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center space-x-1 shadow-sm"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                      <span>Save Draft</span>
                    </button>
                  )}

                  {isAssignedIS && (activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review') && (
                    <button
                      type="button"
                      onClick={() => {
                        const committed = getTemplateWithCommittedWeights(activeTemplate);
                        setAllTemplates(prev => [committed, ...prev.filter(t => t.id !== committed.id)]);
                        onSaveTemplate(committed);
                        setActiveTemplate(committed);
                        setIsDirty(false);
                        showToast('Calibrated weights saved successfully.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Weights</span>
                    </button>
                  )}
                </>
              )}

              {/* Submit for Evaluation */}
              {(isEmployeeMode || isTemplateOwner || isDeptHead || isPOD) && (activeTemplate?.status === 'draft' || activeTemplate?.status === 'returned_by_is' || activeTemplate?.status === 'returned_by_pod' || activeTemplate?.status === 'returned_for_revision' || !activeTemplate?.status) && (
                <button
                  type="button"
                  onClick={handleSubmitForEvaluation}
                  className="px-4 py-1.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {activeTemplate?.status === 'returned_by_is' || activeTemplate?.status === 'returned_by_pod' || activeTemplate?.status === 'returned_for_revision'
                      ? 'Resubmit'
                      : 'Submit for Evaluation'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── CARD 3: PART 1A — KEY RESULT AREAS (KRAS) ────────────────────── */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Part 1A — Key Result Areas & Performance Indicators ({eligibilityWeight}%)
                </h3>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleAddKRA}
                  className="px-3 py-1 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add KRA</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {(activeTemplate?.kraCategories || []).map((kra, kraIndex) => (
                <div key={kra.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs font-black text-[#E96B1A]">{kraIndex + 1}.</span>
                      <input
                        type="text"
                        value={kra.name}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, name: e.target.value } : k);
                          setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                          setIsDirty(true);
                        }}
                        className="flex-1 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60"
                        placeholder="KRA Name (e.g. 1. FINANCIAL)"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] font-bold text-slate-400">Weight:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={!canEdit}
                          value={getWeightInputValue(`kra_${kra.id}`, kra.categoryWeightPercent || 0)}
                          onChange={(e) => handleWeightInputChange(`kra_${kra.id}`, e.target.value)}
                          onBlur={() => {
                            const numVal = commitWeightInput(`kra_${kra.id}`, kra.categoryWeightPercent || 0);
                            const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, categoryWeightPercent: numVal } : k);
                            setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                            setIsDirty(true);
                          }}
                          className="w-12 text-xs font-bold text-center px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKRA(kra.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove KRA"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Performance Types List */}
                  <div className="space-y-3 pl-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Performance Types ({getKpiTotal(kra)}% / {kra.categoryWeightPercent}%)
                      </span>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleAddKPI(kra.id)}
                          className="px-2 py-0.5 rounded-lg bg-[#E96B1A]/10 hover:bg-[#E96B1A]/20 text-[#E96B1A] dark:text-[#f97316] text-[10px] font-bold flex items-center space-x-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add Performance Type</span>
                        </button>
                      )}
                    </div>

                    {(kra.kpis || []).map((kpi, kpiIndex) => {
                      const standards: RatingStandard[] = Array.isArray(kpi.standards) && kpi.standards.length > 0
                        ? kpi.standards
                        : [
                            { rating: 4, label: '4 - Exceeds', description: '' },
                            { rating: 3, label: '3 - Meets', description: '' },
                            { rating: 2, label: '2 - Barely Meets', description: '' },
                            { rating: 1, label: '1 - Did Not Meet', description: '' },
                          ];

                      return (
                        <div key={kpi.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex-1 flex items-center gap-1.5 min-w-[200px]">
                              <span className="text-[11px] font-bold text-[#E96B1A]">{String.fromCharCode(65 + kpiIndex)}.</span>
                              <input
                                type="text"
                                value={kpi.name}
                                disabled={!canEdit}
                                onChange={(e) => {
                                  const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, name: e.target.value } : item);
                                  const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                  setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                                  setIsDirty(true);
                                }}
                                className="flex-1 text-xs font-semibold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60"
                                placeholder="Performance Type Name"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-slate-400">Weight:</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={!canEdit}
                                  value={getWeightInputValue(`kpi_${kpi.id}`, kpi.weightPercent || 0)}
                                  onChange={(e) => handleWeightInputChange(`kpi_${kpi.id}`, e.target.value)}
                                  onBlur={() => {
                                    const numVal = commitWeightInput(`kpi_${kpi.id}`, kpi.weightPercent || 0);
                                    const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, weightPercent: numVal } : item);
                                    const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                    setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                                    setIsDirty(true);
                                  }}
                                  className="w-12 text-xs font-bold text-center px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                />
                                <span className="text-xs font-bold text-slate-400">%</span>
                              </div>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKPI(kra.id, kpi.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Editable KPI Items Table */}
                          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-750 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                  <th className="py-1 px-2.5 w-[130px]">Scale</th>
                                  <th className="py-1 px-2.5">Performance Target Indicator</th>
                                  {canEdit && <th className="py-1 px-1.5 w-[32px] text-center"></th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {standards.map((st: RatingStandard, stIdx: number) => {
                                  const defaultScaleLabel = st.rating === 4 ? '4 - Exceeds' : st.rating === 3 ? '3 - Meets' : st.rating === 2 ? '2 - Barely Meets' : '1 - Did Not Meet';
                                  return (
                                    <tr key={stIdx}>
                                      <td className="py-1 px-2.5 align-middle">
                                        <div className="flex items-center space-x-1">
                                          <span className="text-[10px] font-extrabold text-[#E96B1A] shrink-0">
                                            {st.rating} -
                                          </span>
                                          <input
                                            type="text"
                                            value={st.label || defaultScaleLabel}
                                            disabled={!canEdit}
                                            onChange={(e) => handleUpdateKPIStandard(kra.id, kpi.id, stIdx, 'label', e.target.value)}
                                            className="w-full text-[10px] font-semibold px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 disabled:opacity-75"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-1 px-2.5 align-middle">
                                        <input
                                          type="text"
                                          value={st.description}
                                          disabled={!canEdit}
                                          onChange={(e) => handleUpdateKPIStandard(kra.id, kpi.id, stIdx, 'description', e.target.value)}
                                          placeholder={`e.g. ${st.rating === 4 ? 'Above target is achieved (100%+)' : st.rating === 3 ? 'Target is achieved (100%)' : st.rating === 2 ? 'Below target is achieved (80-99%)' : 'Below 50% achieved'}`}
                                          className="w-full text-[11px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-[#E96B1A] disabled:opacity-75"
                                        />
                                      </td>
                                      {canEdit && (
                                        <td className="py-1 px-1.5 text-center align-middle">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveKPIStandard(kra.id, kpi.id, stIdx)}
                                            className="p-1 text-slate-300 hover:text-rose-500 rounded"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CARD 4: PART 1B — CORE VALUES & SUITABILITY ──────────────────── */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Part 1B — Core Values & Behavioral Factors ({activeTemplate?.formulaConfig?.coreValuesWeight || 15}%)
                </h3>
              </div>

              {canEdit && (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={recalculateCoreValueWeights}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
                  >
                    Distribute Equally
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoreValue}
                    className="px-3 py-1 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Value</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {(activeTemplate?.coreValues || []).map((cv) => (
                <div key={cv.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={cv.name}
                      disabled={!canEdit}
                      onChange={(e) => handleUpdateCoreValue(cv.id, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold disabled:opacity-60"
                      placeholder="Core Value Name"
                    />

                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={!canEdit}
                        value={getWeightInputValue(`cv_${cv.id}`, cv.weightPercent || 0)}
                        onChange={(e) => handleWeightInputChange(`cv_${cv.id}`, e.target.value)}
                        onBlur={() => {
                          const numVal = commitWeightInput(`cv_${cv.id}`, cv.weightPercent || 0);
                          handleUpdateCoreValue(cv.id, 'weightPercent', numVal);
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold text-center"
                        placeholder="Weight %"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCoreValue(cv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={cv.description || ''}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateCoreValue(cv.id, 'description', e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs disabled:opacity-60"
                    placeholder="Brief description of this core value..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE NEW TEMPLATE MODAL (POD & ADMIN) ─────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#E96B1A]" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Create New Evaluation Template
                </h4>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCreateType('employee')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    createType === 'employee'
                      ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Specific Employee
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType('department')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    createType === 'department'
                      ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Department General
                </button>
              </div>

              {createType === 'employee' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      placeholder="Search employee name, ID, position..."
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900">
                    {filteredEmployeesForModal.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployeeForNewTemplate(emp)}
                        className={`p-2.5 text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedEmployeeForNewTemplate?.id === emp.id
                            ? 'bg-orange-50 dark:bg-orange-950/50 border-l-4 border-[#E96B1A]'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {emp.companyName} • {emp.departmentName} • {emp.position || 'Staff'}
                          </p>
                        </div>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {emp.employeeNumber || 'ID'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {selectedEmployeeForNewTemplate && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                      <p className="font-bold">Selected: {selectedEmployeeForNewTemplate.name} ({selectedEmployeeForNewTemplate.position})</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Supervisor: {selectedEmployeeForNewTemplate.immediateSuperiorName || 'Immediate Supervisor'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Select Department
                  </label>
                  <select
                    value={selectedDeptForNewTemplate?.id || (departments[0]?.id ?? '')}
                    onChange={(e) => {
                      const d = departments.find(item => item.id === e.target.value);
                      if (d) setSelectedDeptForNewTemplate(d);
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    {Object.entries(
                      departments.reduce<Record<string, Department[]>>((acc, d) => {
                        const comp = d.companyName || 'Adventures';
                        if (!acc[comp]) acc[comp] = [];
                        acc[comp].push(d);
                        return acc;
                      }, {})
                    ).map(([compName, depts]) => (
                      <optgroup key={compName} label={compName}>
                        {depts
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({compName})
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2 bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateTemplate}
                className="px-4 py-1.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-extrabold shadow-sm flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Create Draft Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE SCORECARD PREVIEW MODAL ─────────────────────────────────────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#E96B1A]" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Scorecard Layout Preview — {activeTemplate?.title}
                </h4>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
              <PrintableScorecard
                evaluation={createDraftEvaluationInMemory(
                  currentUser || { id: 'usr_preview', name: activeTemplate?.createdForEmployeeName || 'Sample Employee', role: 'employee', departmentName: activeTemplate?.departmentName, position: activeTemplate?.createdForPosition || 'Staff' } as User,
                  getTemplateWithCommittedWeights(activeTemplate),
                  activeTemplate?.evaluationPeriod
                )}
                formulaConfig={activeTemplate?.formulaConfig || { eligibilityWeight: 85, coreValuesWeight: 15 }}
                onBack={() => setShowPreviewModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
