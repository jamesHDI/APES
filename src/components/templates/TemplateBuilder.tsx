import React, { useState, useEffect, useRef } from 'react';
import { EvaluationTemplate, KRACategory, KPITemplateItem, CoreValue, Department, User, Evaluation, TemplateStatus } from '../../types';
import { createMasterBasedTemplate, MASTER_SALES_EVALUATION_TEMPLATE } from '../../constants/masterSalesTemplate';
import { validateEvaluationTemplate } from '../../services/templateValidation';
import { triggerTemplateWorkflowNotification } from '../../services/notificationService';
import { generateUuid } from '../../services/supabaseService';
import { createDraftEvaluationInMemory } from '../../services/storage';
import { PrintableScorecard } from '../evaluation/PrintableScorecard';
import { 
  Plus,
  Trash2,
  Save, 
  CheckCircle2, 
  Building2, 
  Layers, 
  Award,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Lock,
  Eye,
  X,
  Send,
  ShieldCheck,
  RotateCcw,
  Calendar,
  ChevronRight,
  Filter,
  CheckCheck,
  UserCheck,
  User as UserIcon,
  Search,
} from 'lucide-react';

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
  const isEmployeeMode = mode === 'employee' || currentUser?.role === 'employee';
  const isSupervisorRole = currentUser?.role === 'supervisor';
  const isDeptHead = currentUser?.role === 'dept_head';
  const isPOD = currentUser?.role === 'pod' || currentUser?.role === 'hr_admin' || currentUser?.role === 'system_admin';

  const canCreate = isEmployeeMode || isPOD || isDeptHead || currentUser?.role === 'system_admin';
  const canDelete = currentUser?.role === 'system_admin' || isPOD || isDeptHead;

  // Filter templates visible to this user
  const allVisibleTemplates = isEmployeeMode
    ? templates.filter(t => 
        t.createdForEmployeeId === currentUser?.id || 
        t.createdByUserId === currentUser?.id ||
        (t.createdForEmployeeNumber && t.createdForEmployeeNumber === currentUser?.employeeNumber)
      )
    : isSupervisorRole
    ? templates.filter(t => 
        t.immediateSupervisorId === currentUser?.id ||
        t.immediateSupervisorName === currentUser?.name ||
        t.createdByUserId === currentUser?.id ||
        t.createdForEmployeeId === currentUser?.id
      )
    : isDeptHead
    ? templates.filter(
        t => !t.departmentId || t.departmentId === currentUser?.departmentId ||
             t.departmentName?.toLowerCase() === currentUser?.departmentName?.toLowerCase() ||
             t.immediateSupervisorId === currentUser?.id
      )
    : templates;

  const safeTemplatesList = allVisibleTemplates.length > 0 
    ? allVisibleTemplates 
    : [MASTER_SALES_EVALUATION_TEMPLATE];

  // POD Filter Tab & Company Filter
  const [podFilterTab, setPodFilterTab] = useState<'all' | 'pending_is' | 'pending_pod' | 'returned' | 'approved_deployed' | 'drafts'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const visibleTemplates = isPOD
    ? safeTemplatesList.filter(t => {
        if (companyFilter !== 'all' && t.companyName && t.companyName !== companyFilter) return false;
        if (departmentFilter !== 'all' && t.departmentName && t.departmentName !== departmentFilter) return false;

        if (podFilterTab === 'pending_is') return t.status === 'submitted_to_is' || t.status === 'is_review';
        if (podFilterTab === 'pending_pod') return t.status === 'submitted_to_pod' || t.status === 'resubmitted_to_pod' || t.status === 'is_approved' || t.status === 'pod_review';
        if (podFilterTab === 'returned') return t.status === 'returned_by_is' || t.status === 'returned_by_pod' || t.status === 'returned_for_revision';
        if (podFilterTab === 'approved_deployed') return t.status === 'approved' || t.status === 'pod_approved' || t.status === 'deployed';
        if (podFilterTab === 'drafts') return t.status === 'draft' || !t.status;
        return true;
      })
    : safeTemplatesList;

  const pendingSubmissionsCount = safeTemplatesList.filter(
    t => t.status === 'submitted_to_pod' || t.status === 'resubmitted_to_pod' || t.status === 'is_approved'
  ).length;

  const pendingISCount = safeTemplatesList.filter(
    t => t.status === 'submitted_to_is' || t.status === 'is_review'
  ).length;

  // Initialize employee personal template if in employee mode and list is empty
  const getInitialEmployeeTemplate = (): EvaluationTemplate => {
    const defaultStart = `${new Date().getFullYear()}-01-01`;
    const defaultEnd = `${new Date().getFullYear()}-12-31`;
    const defaultPeriod = `Jan 1, ${new Date().getFullYear()} ΓÇô Dec 31, ${new Date().getFullYear()}`;

    const newTmpl = createMasterBasedTemplate(
      currentUser?.departmentId || 'dept_gen',
      currentUser?.departmentName || 'General',
      `${currentUser?.name || 'My'} Performance Evaluation Scorecard Template`,
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
    newTmpl.immediateSupervisorId = currentUser?.immediateSuperiorId;
    newTmpl.immediateSupervisorName = currentUser?.immediateSuperiorName;
    newTmpl.createdByRole = currentUser?.role;
    newTmpl.createdByUserId = currentUser?.id;
    newTmpl.createdByName = currentUser?.name;
    newTmpl.startDate = defaultStart;
    newTmpl.endDate = defaultEnd;

    return newTmpl;
  };

  const initialList = visibleTemplates.length > 0 ? visibleTemplates : [isEmployeeMode ? getInitialEmployeeTemplate() : MASTER_SALES_EVALUATION_TEMPLATE];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialList[0]?.id || MASTER_SALES_EVALUATION_TEMPLATE.id);
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate>(
    initialList.find(t => t.id === selectedTemplateId) || initialList[0] || MASTER_SALES_EVALUATION_TEMPLATE
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  
  // Return/Review remarks states
  const [isRemarkInput, setIsRemarkInput] = useState('');
  const [showISReturnInput, setShowISReturnInput] = useState(false);
  const [podRemarkInput, setPodRemarkInput] = useState('');
  const [showPODReturnInput, setShowPODReturnInput] = useState(false);

  // POD Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'employee' | 'department'>('employee');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployeeForNewTemplate, setSelectedEmployeeForNewTemplate] = useState<User | null>(null);
  const [selectedDeptForNewTemplate, setSelectedDeptForNewTemplate] = useState<Department | null>(departments[0] || null);

  const currentLoadedTemplateIdRef = useRef<string>(selectedTemplateId);

  // Permission Checks
  const isTemplateOwner = activeTemplate.createdForEmployeeId === currentUser?.id || activeTemplate.createdByUserId === currentUser?.id;
  const isAssignedIS = activeTemplate.immediateSupervisorId === currentUser?.id || activeTemplate.immediateSupervisorName === currentUser?.name;
  
  const canEdit = isPOD 
    || currentUser?.role === 'system_admin'
    || (isEmployeeMode && (!activeTemplate.status || activeTemplate.status === 'draft' || activeTemplate.status === 'returned_by_is' || activeTemplate.status === 'returned_for_revision' || activeTemplate.status === 'returned_by_pod'))
    || (isAssignedIS && (activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review'))
    || (isDeptHead && (!activeTemplate.status || activeTemplate.status === 'draft' || activeTemplate.status === 'returned_for_revision'));

  useEffect(() => {
    if (selectedTemplateId !== currentLoadedTemplateIdRef.current) {
      currentLoadedTemplateIdRef.current = selectedTemplateId;
      const match = visibleTemplates.find(t => t.id === selectedTemplateId) || safeTemplatesList.find(t => t.id === selectedTemplateId);
      if (match) {
        setActiveTemplate(match);
      }
    } else {
      const exists = visibleTemplates.some(t => t.id === selectedTemplateId) || safeTemplatesList.some(t => t.id === selectedTemplateId);
      if (!exists && visibleTemplates.length > 0) {
        currentLoadedTemplateIdRef.current = visibleTemplates[0].id;
        setSelectedTemplateId(visibleTemplates[0].id);
        setActiveTemplate(visibleTemplates[0]);
      }
    }
  }, [selectedTemplateId, visibleTemplates, safeTemplatesList]);

  const getWeightInputValue = (id: string, defaultValue: number | string): string => {
    return weightInputs[id] ?? String(defaultValue);
  };

  const handleWeightInputChange = (id: string, rawValue: string) => {
    const sanitized = rawValue.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
    setWeightInputs(prev => ({ ...prev, [id]: sanitized }));
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

  const formatPeriodFromDates = (startDate?: string, endDate?: string): string => {
    if (!startDate && !endDate) return activeTemplate.evaluationPeriod || '';
    const fmt = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (startDate && endDate) return `${fmt(startDate)} ΓÇô ${fmt(endDate)}`;
    if (startDate) return `From ${fmt(startDate)}`;
    return endDate ? `Until ${fmt(endDate)}` : '';
  };

  // ΓöÇΓöÇ 1. EMPLOYEE SUBMISSION TO IMMEDIATE SUPERVISOR (IS) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleSubmitToIS = async () => {
    const isResubmission = activeTemplate.status === 'returned_by_is' || activeTemplate.status === 'returned_by_pod' || activeTemplate.status === 'returned_for_revision';
    const isName = activeTemplate.immediateSupervisorName || currentUser?.immediateSuperiorName || 'Immediate Supervisor';

    const confirmMsg = isResubmission
      ? `Resubmit your revised evaluation template to your Immediate Supervisor (${isName}) for review?`
      : `Submit your evaluation template to your Immediate Supervisor (${isName}) for review?`;

    if (!window.confirm(confirmMsg)) return;

    // Validate before submission
    const validation = validateEvaluationTemplate(activeTemplate);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('Please resolve all validation errors before submitting.');
      return;
    }

    const newStatus: TemplateStatus = 'submitted_to_is';
    const submitted: EvaluationTemplate = {
      ...activeTemplate,
      status: newStatus,
      submittedAt: new Date().toISOString(),
      templateSource: activeTemplate.templateSource || 'EMPLOYEE',
      createdForEmployeeId: activeTemplate.createdForEmployeeId || currentUser?.id,
      createdForEmployeeName: activeTemplate.createdForEmployeeName || currentUser?.name,
      createdForEmployeeNumber: activeTemplate.createdForEmployeeNumber || currentUser?.employeeNumber,
      createdForPosition: activeTemplate.createdForPosition || currentUser?.position,
      companyId: activeTemplate.companyId || currentUser?.companyId || 'comp_adventures',
      companyName: activeTemplate.companyName || currentUser?.companyName || 'Adventures',
      immediateSupervisorId: activeTemplate.immediateSupervisorId || currentUser?.immediateSuperiorId,
      immediateSupervisorName: activeTemplate.immediateSupervisorName || currentUser?.immediateSuperiorName,
      createdByRole: activeTemplate.createdByRole || currentUser?.role,
      createdByUserId: activeTemplate.createdByUserId || currentUser?.id,
      createdByName: activeTemplate.createdByName || currentUser?.name,
    };

    onSaveTemplate(submitted);
    setActiveTemplate(submitted);

    try {
      await triggerTemplateWorkflowNotification({
        recipientRole: 'supervisor',
        targetUserId: submitted.immediateSupervisorId,
        templateId: submitted.id,
        templateTitle: submitted.title,
        departmentName: submitted.departmentName,
        senderName: currentUser?.name || 'Employee',
        title: isResubmission ? 'Revised Evaluation Template Resubmitted' : 'Evaluation Template Submitted',
        message: `${currentUser?.name || 'Employee'} has submitted an evaluation template for your Immediate Supervisor review.`,
        type: 'action_required',
        status: newStatus,
      });
    } catch (e) {
      console.warn('[TemplateBuilder] Notification error:', e);
    }

    showToast(`Template successfully submitted to ${isName} for review!`);
  };

  // ΓöÇΓöÇ 2. IMMEDIATE SUPERVISOR (IS) ACTION: APPROVE OR RETURN ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleISAction = async (action: 'approve' | 'return') => {
    if (action === 'return') {
      if (!isRemarkInput.trim()) {
        setShowISReturnInput(true);
        showToast('Please enter revision remarks for the employee.');
        return;
      }

      const returned: EvaluationTemplate = {
        ...activeTemplate,
        status: 'returned_by_is',
        isReviewRemarks: isRemarkInput.trim(),
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(returned);
      setActiveTemplate(returned);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: activeTemplate.createdForEmployeeId || activeTemplate.createdByUserId,
          recipientRole: 'employee',
          templateId: returned.id,
          templateTitle: returned.title,
          departmentName: activeTemplate.departmentName,
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
        ...activeTemplate,
        status: 'is_approved',
        isApprovedAt: new Date().toISOString(),
        isReviewRemarks: isRemarkInput.trim() || activeTemplate.isReviewRemarks,
        reviewedAt: new Date().toISOString(),
      };

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

  // ΓöÇΓöÇ 3. PEOPLE OPERATIONS (POD) ACTION: APPROVE, DEPLOY, RETURN ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handlePODAction = async (action: 'approve' | 'deploy' | 'return') => {
    if (action === 'return') {
      if (!podRemarkInput.trim()) {
        setShowPODReturnInput(true);
        showToast('Please enter revision remarks.');
        return;
      }

      const returned: EvaluationTemplate = {
        ...activeTemplate,
        status: 'returned_by_pod',
        podRemarks: podRemarkInput.trim(),
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(returned);
      setActiveTemplate(returned);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: activeTemplate.createdForEmployeeId || activeTemplate.createdByUserId,
          recipientRole: 'employee',
          recipientDepartment: activeTemplate.departmentName,
          templateId: returned.id,
          templateTitle: returned.title,
          departmentName: activeTemplate.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Returned by POD',
          message: `People Operations (${currentUser?.name || 'POD'}) has returned the evaluation template "${activeTemplate.title}" for revision. Remarks: "${podRemarkInput.trim()}".`,
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
        ...activeTemplate,
        status: 'pod_approved',
        podApprovedAt: new Date().toISOString(),
        podRemarks: podRemarkInput.trim() || activeTemplate.podRemarks,
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(approved);
      setActiveTemplate(approved);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: activeTemplate.createdForEmployeeId || activeTemplate.createdByUserId,
          recipientRole: 'employee',
          templateId: approved.id,
          templateTitle: approved.title,
          departmentName: activeTemplate.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Validated & Approved by POD',
          message: `People Operations (${currentUser?.name || 'POD'}) has validated and approved the evaluation template "${activeTemplate.title}".`,
          type: 'success',
          status: 'pod_approved',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setPodRemarkInput('');
      showToast('Template validated and approved by POD. Ready to deploy.');
    } else if (action === 'deploy') {
      const deployed: EvaluationTemplate = {
        ...activeTemplate,
        status: 'deployed',
        isLocked: true,
        deployedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(deployed);
      setActiveTemplate(deployed);
      showToast('Evaluation template deployed successfully! Template is now locked and active for self-evaluations.');
    }
  };

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
    onSaveTemplate(revision);
    setActiveTemplate(revision);
    setSelectedTemplateId(revision.id);
    showToast(`Created new draft Revision v${nextVersion}! Original deployed template remains locked & immutable.`);
  };

  const handleDeleteTemplateAction = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!canDelete) {
      alert('Only authorized supervisors, department heads, or administrators can delete evaluation templates.');
      return;
    }

    const tmplToDelete = templates.find(t => t.id === templateId) || visibleTemplates.find(t => t.id === templateId);
    if (!tmplToDelete) return;

    const isInUse = evaluations?.some(
      (ev) => ev.templateId === templateId && ev.status !== 'archived'
    );

    if (isInUse) {
      alert('This template cannot be deleted because it is currently in use by an active evaluation.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${tmplToDelete.title}"?`)) {
      if (onDeleteTemplate) {
        onDeleteTemplate(templateId);
      }
      const remaining = visibleTemplates.filter(t => t.id !== templateId);
      if (selectedTemplateId === templateId && remaining.length > 0) {
        setSelectedTemplateId(remaining[0].id);
        setActiveTemplate(remaining[0]);
      }
      showToast('Evaluation template deleted successfully!');
    }
  };

  const handleSelectTemplate = (id: string) => {
    currentLoadedTemplateIdRef.current = id;
    setSelectedTemplateId(id);
    setValidationErrors([]);
    const tmpl = visibleTemplates.find((t) => t.id === id) || safeTemplatesList.find((t) => t.id === id);
    if (tmpl) setActiveTemplate(tmpl);
  };

  // ΓöÇΓöÇ POD / ADMIN CREATE NEW TEMPLATE (WITH SEARCHABLE EMPLOYEE SELECTOR) ΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleOpenCreateModal = () => {
    if (isEmployeeMode) {
      // Employee creating own template
      const newTmpl = getInitialEmployeeTemplate();
      currentLoadedTemplateIdRef.current = newTmpl.id;
      onSaveTemplate(newTmpl);
      setActiveTemplate(newTmpl);
      setSelectedTemplateId(newTmpl.id);
      setValidationErrors([]);
      showToast('New draft template initialized for your evaluation!');
      return;
    }

    // POD / Admin opening creation modal
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
        `${emp.name} ΓÇö Performance Evaluation Scorecard Template (${emp.companyName || 'HDI'})`,
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

      currentLoadedTemplateIdRef.current = newTemplate.id;
      onSaveTemplate(newTemplate);
      setActiveTemplate(newTemplate);
      setSelectedTemplateId(newTemplate.id);
      setShowCreateModal(false);
      setValidationErrors([]);
      showToast(`New template created for ${emp.name} (${emp.companyName})!`);
    } else {
      const dept = selectedDeptForNewTemplate || departments[0];
      const newTemplate = createMasterBasedTemplate(
        dept.id,
        dept.name,
        `${dept.name} Performance Evaluation Scorecard Template`,
        defaultPeriod
      );

      newTemplate.id = generateUuid();
      newTemplate.status = 'draft';
      newTemplate.templateSource = 'POD';
      newTemplate.departmentId = dept.id;
      newTemplate.departmentName = dept.name;
      newTemplate.createdByRole = currentUser?.role;
      newTemplate.createdByUserId = currentUser?.id;
      newTemplate.createdByName = currentUser?.name;
      newTemplate.startDate = defaultStart;
      newTemplate.endDate = defaultEnd;

      currentLoadedTemplateIdRef.current = newTemplate.id;
      onSaveTemplate(newTemplate);
      setActiveTemplate(newTemplate);
      setSelectedTemplateId(newTemplate.id);
      setShowCreateModal(false);
      setValidationErrors([]);
      showToast(`New department template created for ${dept.name}!`);
    }
  };

  const handleAddKRA = () => {
    const newKra: KRACategory = {
      id: `kra_${Date.now()}`,
      name: `${activeTemplate.kraCategories.length + 1}. NEW KEY RESULT AREA`,
      categoryWeightPercent: 10,
      kpis: []
    };
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: [...activeTemplate.kraCategories, newKra]
    });
  };

  const handleRemoveKRA = (kraId: string) => {
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: activeTemplate.kraCategories.filter(k => k.id !== kraId)
    });
  };

  const handleAddKPI = (kraId: string) => {
    const newKpi: KPITemplateItem = {
      id: `kpi_${Date.now()}`,
      kraId,
      kraName: activeTemplate.kraCategories.find(k => k.id === kraId)?.name || '',
      name: 'New Key Performance Indicator',
      description: 'Define specific measurable KPI metrics and deliverables.',
      weightPercent: 5,
      evidenceRequired: false,
      standards: [
        { rating: 4, label: '4 - Exceeds', description: 'Exceeds target performance' },
        { rating: 3, label: '3 - Meets', description: 'Meets expected target' },
        { rating: 2, label: '2 - Barely Meets', description: 'Barely meets minimum target' },
        { rating: 1, label: '1 - Did Not Meet', description: 'Did not meet target performance' },
      ]
    };

    const updated = activeTemplate.kraCategories.map(k => {
      if (k.id === kraId) {
        return { ...k, kpis: [...k.kpis, newKpi] };
      }
      return k;
    });

    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
  };

  const handleRemoveKPI = (kraId: string, kpiId: string) => {
    const updated = activeTemplate.kraCategories.map(k => {
      if (k.id === kraId) {
        return { ...k, kpis: k.kpis.filter(item => item.id !== kpiId) };
      }
      return k;
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updated });
  };

  const handleAddCoreValue = () => {
    const newCoreValue: CoreValue = {
      id: `cv_${Date.now()}`,
      name: 'New Core Value',
      description: 'Core value description.',
      weightPercent: 0,
      sortOrder: (activeTemplate.coreValues?.length || 0) + 1
    };
    setActiveTemplate({
      ...activeTemplate,
      coreValues: [...(activeTemplate.coreValues || []), newCoreValue]
    });
  };

  const handleRemoveCoreValue = (coreValueId: string) => {
    if (!window.confirm('Are you sure you want to remove this Core Value?')) return;
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).filter(cv => cv.id !== coreValueId)
    });
  };

  const handleUpdateCoreValue = (coreValueId: string, field: keyof CoreValue, value: string | number) => {
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).map(cv =>
        cv.id === coreValueId ? { ...cv, [field]: value } : cv
      )
    });
  };

  const recalculateCoreValueWeights = () => {
    const cvCount = activeTemplate.coreValues?.length || 0;
    if (cvCount === 0) return;
    const part1bWeight = activeTemplate.formulaConfig.coreValuesWeight || 0;
    const weightPerCV = Number((part1bWeight / cvCount).toFixed(4));
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).map((cv, idx) => ({
        ...cv,
        weightPercent: Number(weightPerCV.toFixed(2)),
        sortOrder: idx + 1
      }))
    });
  };

  const totalCoreValueWeight = (activeTemplate.coreValues || []).reduce((sum, cv) => sum + (Number(cv.weightPercent) || 0), 0);
  const isCoreValuesValid = Math.abs(totalCoreValueWeight - (activeTemplate.formulaConfig.coreValuesWeight || 0)) < 0.01;

  const handleSave = () => {
    let templateToSave = { ...activeTemplate };

    // Commit any in-flight formula weight inputs
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

    const validation = validateEvaluationTemplate(templateToSave);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      showToast('Please resolve all validation errors before saving.');
      return;
    }

    setValidationErrors([]);
    onSaveTemplate(templateToSave);
    setActiveTemplate(templateToSave);
    showToast('Template changes saved successfully!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getKpiTotal = (kra: KRACategory) => {
    return kra.kpis.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0);
  };

  const getKraTotalWeight = () => {
    return activeTemplate.kraCategories.reduce((sum, kra) => sum + (Number(kra.categoryWeightPercent) || 0), 0);
  };

  const getAllKpisTotalWeight = () => {
    return activeTemplate.kraCategories.reduce((sum, kra) => {
      return sum + kra.kpis.reduce((kpiSum, kpi) => kpiSum + (Number(kpi.weightPercent) || 0), 0);
    }, 0);
  };

  const eligibilityWeight = Number(activeTemplate.formulaConfig.eligibilityWeight) || 85;
  const isPart1AKraWeightValid = () => Math.abs(getKraTotalWeight() - eligibilityWeight) < 0.01;
  const isPart1AKpiWeightValid = () => Math.abs(getAllKpisTotalWeight() - eligibilityWeight) < 0.01;
  const isKraValid = (kra: KRACategory) => getKpiTotal(kra) <= (Number(kra.categoryWeightPercent) || 0);

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
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted_to_is: 'Awaiting Immediate Supervisor Review',
    is_review: 'Under Immediate Supervisor Review',
    returned_by_is: 'Returned by Immediate Supervisor',
    is_approved: 'Awaiting People Operations Validation',
    submitted_to_pod: 'Awaiting People Operations Validation',
    resubmitted_to_pod: 'Resubmitted to People Operations',
    returned_for_revision: 'Returned for Revision',
    returned_by_pod: 'Returned by People Operations',
    pod_review: 'People Operations Review',
    pod_approved: 'Approved by People Operations',
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
    <div className="space-y-6 pb-12">
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
            <span>Cannot save template. Please correct the following:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-600 dark:text-rose-400 space-y-0.5 ml-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#E96B1A]" />
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isEmployeeMode 
                ? 'My Evaluation Template' 
                : isSupervisorRole 
                ? 'Team Evaluation Template Reviews'
                : 'Evaluation Templates & POD Governance'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {isEmployeeMode
              ? 'Draft your personalized performance evaluation scorecard, configure KRAs and KPIs, and submit directly to your Immediate Supervisor.'
              : isSupervisorRole
              ? 'Review, calibrate weights, provide remarks, and approve evaluation templates submitted by your team members.'
              : 'Review, validate, configure, and deploy official evaluation scorecard templates across all HDI companies and departments.'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-md flex items-center space-x-2 shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isEmployeeMode ? 'Create New Template' : '+ Create New Template'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[600px] sticky top-4">
          <div className="flex items-center justify-between px-1 shrink-0 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isEmployeeMode ? 'My Templates' : 'Evaluation Templates'} ({visibleTemplates.length})
            </h3>
          </div>

          {/* POD Filter Tabs */}
          {isPOD && (
            <div className="space-y-2 mb-3 shrink-0">
              <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-750 rounded-xl gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => setPodFilterTab('all')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${podFilterTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setPodFilterTab('pending_pod')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${podFilterTab === 'pending_pod' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pending POD
                  {pendingSubmissionsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-indigo-500 text-white rounded-full text-[9px] font-bold">
                      {pendingSubmissionsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setPodFilterTab('pending_is')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${podFilterTab === 'pending_is' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pending IS
                  {pendingISCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                      {pendingISCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setPodFilterTab('approved_deployed')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${podFilterTab === 'approved_deployed' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Deployed
                </button>
              </div>

              {/* Company & Department Filters for POD */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
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
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 pb-10">
            {visibleTemplates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No templates found in this category.
              </div>
            ) : visibleTemplates.map((tmpl) => {
              const sts = tmpl.status || 'draft';
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-orange-50 dark:bg-orange-950/40 border-[#E96B1A] ring-2 ring-[#E96B1A]/20'
                      : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {tmpl.companyName && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          {tmpl.companyName}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {tmpl.departmentName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColors[sts] || statusColors.draft}`}>
                        {statusLabels[sts] || sts}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplateAction(tmpl.id, e)}
                          className="p-1 text-slate-400 hover:text-[#E96B1A] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="font-bold text-slate-900 dark:text-white text-xs mt-2">{tmpl.title}</p>
                  
                  {tmpl.createdForEmployeeName && (
                    <p className="text-[11px] text-[#E96B1A] font-semibold mt-0.5 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      For: {tmpl.createdForEmployeeName} ({tmpl.createdForPosition || 'Staff'})
                    </p>
                  )}

                  <p className="text-[10px] text-slate-500 mt-1">
                    Period: {tmpl.evaluationPeriod || (tmpl.startDate && tmpl.endDate ? `${tmpl.startDate} ΓÇô ${tmpl.endDate}` : 'Annual')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tmpl.kraCategories.length} KRAs ΓÇó Formula: {tmpl.formulaConfig.eligibilityWeight}% KPI / {tmpl.formulaConfig.coreValuesWeight}% Core Values
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details & Editor Form */}
        <div className="lg:col-span-8 space-y-6">

          {/* Workflow Status Card */}
          {activeTemplate.status && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
              activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review' ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800' :
              activeTemplate.status === 'is_approved' || activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod' ? 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800' :
              activeTemplate.status === 'returned_by_is' || activeTemplate.status === 'returned_by_pod' || activeTemplate.status === 'returned_for_revision' ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800' :
              activeTemplate.status === 'pod_approved' || activeTemplate.status === 'approved' ? 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800' :
              activeTemplate.status === 'deployed' ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' :
              'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
            }`}>
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#E96B1A]" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-extrabold uppercase tracking-wider text-[11px]">
                    Workflow Status: {statusLabels[activeTemplate.status] || activeTemplate.status}
                  </p>
                  {activeTemplate.immediateSupervisorName && (
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Assigned IS: {activeTemplate.immediateSupervisorName}
                    </span>
                  )}
                </div>

                <p className="text-slate-700 dark:text-slate-300">
                  {activeTemplate.status === 'draft' && 'This template is currently in Draft mode. Complete your KRA/KPI configuration and submit to your Immediate Supervisor.'}
                  {(activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review') && 'This template has been submitted to your assigned Immediate Supervisor for initial review and weight calibration.'}
                  {(activeTemplate.status === 'is_approved' || activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod') && 'Approved by Immediate Supervisor. Awaiting final People Operations (POD) validation and deployment.'}
                  {activeTemplate.status === 'returned_by_is' && 'Your Immediate Supervisor has returned this template for revision. Please review the supervisor remarks below and resubmit.'}
                  {(activeTemplate.status === 'returned_by_pod' || activeTemplate.status === 'returned_for_revision') && 'People Operations (POD) has returned this template for revision. Please update and resubmit.'}
                  {(activeTemplate.status === 'pod_approved' || activeTemplate.status === 'approved') && 'People Operations has validated and approved this template. It is ready to be deployed.'}
                  {activeTemplate.status === 'deployed' && 'This template is actively deployed. Performance evaluations can now proceed.'}
                </p>

                {activeTemplate.isReviewRemarks && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-300 dark:border-amber-800">
                    <p className="font-bold text-amber-900 dark:text-amber-200 text-[11px]">Immediate Supervisor Remarks:</p>
                    <p className="text-amber-800 dark:text-amber-300 text-xs italic mt-0.5">"{activeTemplate.isReviewRemarks}"</p>
                  </div>
                )}

                {activeTemplate.podRemarks && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-rose-300 dark:border-rose-800">
                    <p className="font-bold text-rose-900 dark:text-rose-200 text-[11px]">People Operations Remarks:</p>
                    <p className="text-rose-800 dark:text-rose-300 text-xs italic mt-0.5">"{activeTemplate.podRemarks}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Immediate Supervisor Action Card (When IS is reviewing) */}
          {isAssignedIS && (activeTemplate.status === 'submitted_to_is' || activeTemplate.status === 'is_review') && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 space-y-3 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    Immediate Supervisor Review Action Required
                  </span>
                </div>
                {activeTemplate.createdForEmployeeName && (
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Submitted by: {activeTemplate.createdForEmployeeName} ({activeTemplate.createdForPosition || 'Staff'})
                  </span>
                )}
              </div>

              {showISReturnInput && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">
                    Revision Remarks for Employee *
                  </label>
                  <textarea
                    value={isRemarkInput}
                    onChange={(e) => setIsRemarkInput(e.target.value)}
                    rows={3}
                    placeholder="Specify the adjustments required before approval..."
                    className="w-full text-xs p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => handleISAction('approve')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve & Forward to POD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showISReturnInput) handleISAction('return');
                    else setShowISReturnInput(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{showISReturnInput ? 'Confirm Return for Revision' : 'Return for Revision'}</span>
                </button>
                {showISReturnInput && (
                  <button
                    type="button"
                    onClick={() => setShowISReturnInput(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* People Operations (POD) Action Card */}
          {isPOD && (activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod' || activeTemplate.status === 'is_approved' || activeTemplate.status === 'pod_review') && (
            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 space-y-3 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
                    People Operations (POD) Final Validation Required
                  </span>
                </div>
                {activeTemplate.createdForEmployeeName && (
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    Employee: {activeTemplate.createdForEmployeeName} ΓÇó Company: {activeTemplate.companyName}
                  </span>
                )}
              </div>

              {showPODReturnInput && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase">
                    Revision Remarks *
                  </label>
                  <textarea
                    value={podRemarkInput}
                    onChange={(e) => setPodRemarkInput(e.target.value)}
                    rows={3}
                    placeholder="Specify the necessary changes..."
                    className="w-full text-xs p-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => handlePODAction('approve')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePODAction('deploy')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Deploy Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showPODReturnInput) handlePODAction('return');
                    else setShowPODReturnInput(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{showPODReturnInput ? 'Confirm Return for Revision' : 'Return for Revision'}</span>
                </button>
                {showPODReturnInput && (
                  <button
                    type="button"
                    onClick={() => setShowPODReturnInput(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Master Employee Master Information Card (Locked to Master DB) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#E96B1A]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Organizational Master Binding & Evaluation Scope
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                Excel Master Source of Truth
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Employee Owner</p>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeTemplate.createdForEmployeeName || activeTemplate.createdByName || currentUser?.name || 'Staff Member'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ID: {activeTemplate.createdForEmployeeNumber || currentUser?.employeeNumber || 'ΓÇö'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Company / Group</p>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeTemplate.companyName || currentUser?.companyName || 'Adventures'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Dept: {activeTemplate.departmentName || 'General'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Position</p>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeTemplate.createdForPosition || currentUser?.position || 'Staff'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Source: {activeTemplate.templateSource || 'EMPLOYEE'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Immediate Supervisor (IS)</p>
                <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
                  {activeTemplate.immediateSupervisorName || currentUser?.immediateSuperiorName || 'Immediate Supervisor'}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Primary Routing Reviewer
                </p>
              </div>
            </div>

            {/* Template Title & Evaluation Period Editor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Template Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.title}
                  disabled={!canEdit}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Evaluation Period
                </label>
                <input
                  type="text"
                  value={activeTemplate.evaluationPeriod}
                  disabled={!canEdit}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, evaluationPeriod: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60 font-semibold"
                  placeholder="e.g. Jan 1, 2027 ΓÇô Jun 30, 2027"
                />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-wrap">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Master Scorecard</span>
              </button>
            </div>

            <div className="flex items-center space-x-2.5 flex-wrap gap-2">
              {activeTemplate.status === 'deployed' && (
                <button
                  type="button"
                  onClick={handleCreateRevision}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all"
                  title="Create a new draft revision without altering the deployed immutable template"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Revision (v{(activeTemplate.version || 1) + 1})</span>
                </button>
              )}

              {canEdit && !activeTemplate.isLocked && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
              )}

              {/* Employee Submit Button */}
              {isEmployeeMode && (activeTemplate.status === 'draft' || activeTemplate.status === 'returned_by_is' || activeTemplate.status === 'returned_by_pod' || !activeTemplate.status) && (
                <button
                  type="button"
                  onClick={handleSubmitToIS}
                  className="px-5 py-2 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-extrabold flex items-center space-x-2 shadow-md transition-all animate-pulse"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit to Immediate Supervisor</span>
                </button>
              )}
            </div>
          </div>

          {/* Part 1A & Part 1B Formula Config */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-[#E96B1A]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Official APES Evaluation Weight Architecture
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                100% Total Formula
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-[#E96B1A]/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Part 1A: Key Results Areas (KRAs)</span>
                  <span className="text-xs font-black text-[#E96B1A]">{activeTemplate.formulaConfig.eligibilityWeight}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Functional deliverables, operational metrics, and role competencies.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">Part 1B: Core Values & Suitability</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{activeTemplate.formulaConfig.coreValuesWeight}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Organizational core values, compliance, and behavioral standards.
                </p>
              </div>
            </div>
          </div>

          {/* Part 1A - KEY RESULT AREAS & KPIS BUILDER */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Part 1A ΓÇö Key Result Areas (KRAs) & KPIs
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total KRA weights must equal exactly {activeTemplate.formulaConfig.eligibilityWeight}%.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  isPart1AKraWeightValid() && isPart1AKpiWeightValid()
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  KRAs: {getKraTotalWeight()}% / {activeTemplate.formulaConfig.eligibilityWeight}% ΓÇó KPIs: {getAllKpisTotalWeight()}%
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleAddKRA}
                    className="px-3 py-1.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-sm flex items-center space-x-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add KRA Category</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {activeTemplate.kraCategories.map((kra, kraIndex) => (
                <div key={kra.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs font-black text-[#E96B1A]">{kraIndex + 1}.</span>
                      <input
                        type="text"
                        value={kra.name}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, name: e.target.value } : k);
                          setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                        }}
                        className="flex-1 text-xs font-extrabold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60"
                        placeholder="KRA Category Name"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] font-bold text-slate-500">KRA Weight:</span>
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
                          }}
                          className="w-14 text-xs font-black text-center px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKRA(kra.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove KRA"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPIs List */}
                  <div className="space-y-3 pl-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        KPI Items (Sub-total: {getKpiTotal(kra)}% / {kra.categoryWeightPercent}%)
                      </span>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleAddKPI(kra.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add KPI</span>
                        </button>
                      )}
                    </div>

                    {kra.kpis.map((kpi, kpiIndex) => (
                      <div key={kpi.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">{kpiIndex + 1}.</span>
                            <input
                              type="text"
                              value={kpi.name}
                              disabled={!canEdit}
                              onChange={(e) => {
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, name: e.target.value } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              className="flex-1 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-60"
                              placeholder="KPI Item Name"
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
                                }}
                                className="w-12 text-xs font-bold text-center px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveKPI(kra.id, kpi.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Remove KPI"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={kpi.description}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, description: e.target.value } : item);
                            const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                            setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                          }}
                          rows={2}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#E96B1A]/20 resize-none disabled:opacity-60"
                          placeholder="KPI Description / Deliverables / Target Metrics"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part 1B - CORE VALUES & SUITABILITY */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Part 1B ΓÇö Core Values & Suitability Factors ({activeTemplate.formulaConfig.coreValuesWeight}%)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Subdivisions of the Part 1B total weight.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={recalculateCoreValueWeights}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                    >
                      Distribute Equally
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCoreValue}
                      className="px-3 py-1.5 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Core Value</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
              isCoreValuesValid
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Part 1B Total: {activeTemplate.formulaConfig.coreValuesWeight}% ΓÇó Core Values: {activeTemplate.coreValues?.length || 0} ΓÇó Sum: {Number(totalCoreValueWeight.toFixed(2))}%</span>
              </div>
              {!isCoreValuesValid && (
                <span className="text-[11px] font-normal">Core Values must total exactly {activeTemplate.formulaConfig.coreValuesWeight}%.</span>
              )}
            </div>

            <div className="space-y-3">
              {(activeTemplate.coreValues || []).map((cv) => (
                <div key={cv.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cv.name}
                        disabled={!canEdit}
                        onChange={(e) => handleUpdateCoreValue(cv.id, 'name', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold disabled:opacity-60"
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
                          className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold text-center"
                          placeholder="Weight %"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreValue(cv.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                        title="Remove Core Value"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={cv.description || ''}
                    disabled={!canEdit}
                    onChange={(e) => handleUpdateCoreValue(cv.id, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs disabled:opacity-60"
                    placeholder="Core Value description"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ΓöÇΓöÇ CREATE NEW TEMPLATE MODAL (POD & ADMIN) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#E96B1A]" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Create New Evaluation Template
                </h4>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCreateType('employee')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    createType === 'employee'
                      ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Create for Specific Employee (Auto-filled)
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType('department')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    createType === 'department'
                      ? 'bg-white dark:bg-slate-900 text-[#E96B1A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Create Department General Template
                </button>
              </div>

              {createType === 'employee' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Search Employee from Master List ({filteredEmployeesForModal.length} available)
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        placeholder="Search by name, employee ID, company, or position..."
                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900">
                    {filteredEmployeesForModal.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployeeForNewTemplate(emp)}
                        className={`p-3 text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedEmployeeForNewTemplate?.id === emp.id
                            ? 'bg-orange-50 dark:bg-orange-950/50 border-l-4 border-[#E96B1A]'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white">{emp.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {emp.companyName} ΓÇó {emp.departmentName} ΓÇó {emp.position || 'Staff'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {emp.employeeNumber || 'ID'}
                          </span>
                          <p className="text-[10px] text-[#E96B1A] font-semibold mt-0.5">
                            IS: {emp.immediateSuperiorName || 'Supervisor'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedEmployeeForNewTemplate && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                        Auto-filled Target Employee Details:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                        <div><strong>Name:</strong> {selectedEmployeeForNewTemplate.name}</div>
                        <div><strong>Employee ID:</strong> {selectedEmployeeForNewTemplate.employeeNumber}</div>
                        <div><strong>Company:</strong> {selectedEmployeeForNewTemplate.companyName}</div>
                        <div><strong>Department:</strong> {selectedEmployeeForNewTemplate.departmentName}</div>
                        <div><strong>Position:</strong> {selectedEmployeeForNewTemplate.position}</div>
                        <div><strong>Immediate Supervisor:</strong> {selectedEmployeeForNewTemplate.immediateSuperiorName}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Select Department
                    </label>
                    <select
                      value={selectedDeptForNewTemplate?.id || ''}
                      onChange={(e) => {
                        const d = departments.find(item => item.id === e.target.value);
                        if (d) setSelectedDeptForNewTemplate(d);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.companyName || 'Adventures'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2 bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateTemplate}
                className="px-5 py-2 rounded-xl bg-[#E96B1A] hover:bg-[#D45A0E] text-white text-xs font-extrabold shadow-md transition-all"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Master Scorecard Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#E96B1A]" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Live Master Scorecard Layout Preview ΓÇö {activeTemplate.title}
                </h4>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
              <PrintableScorecard
                evaluation={createDraftEvaluationInMemory(
                  currentUser || { id: 'usr_preview', name: activeTemplate.createdForEmployeeName || 'Sample Employee', role: 'employee', departmentName: activeTemplate.departmentName, position: activeTemplate.createdForPosition || 'Staff' } as User,
                  activeTemplate,
                  activeTemplate.evaluationPeriod
                )}
                formulaConfig={activeTemplate.formulaConfig}
                onBack={() => setShowPreviewModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
