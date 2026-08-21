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
} from 'lucide-react';

interface TemplateBuilderProps {
  currentUser?: User;
  templates: EvaluationTemplate[];
  departments: Department[];
  evaluations?: Evaluation[];
  onSaveTemplate: (template: EvaluationTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  currentUser,
  templates,
  departments,
  evaluations,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const isDeptHead = currentUser?.role === 'dept_head';
  const isPOD = currentUser?.role === 'pod' || currentUser?.role === 'hr_admin' || currentUser?.role === 'system_admin';

  const canCreate = isDeptHead || currentUser?.role === 'system_admin';
  const canDelete = currentUser?.role === 'system_admin' || isDeptHead || currentUser?.role === 'supervisor' || isPOD;

  const allVisibleTemplates = isDeptHead
    ? (templates && templates.length > 0 ? templates : [MASTER_SALES_EVALUATION_TEMPLATE]).filter(
        t => !t.departmentId || t.departmentId === currentUser?.departmentId
          || t.departmentName?.toLowerCase() === currentUser?.departmentName?.toLowerCase()
      )
    : (templates && templates.length > 0 ? templates : [MASTER_SALES_EVALUATION_TEMPLATE]);

  const [podFilterTab, setPodFilterTab] = useState<'all' | 'pending' | 'approved' | 'drafts'>('all');

  const visibleTemplates = isPOD
    ? allVisibleTemplates.filter(t => {
        if (podFilterTab === 'pending') return t.status === 'submitted_to_pod' || t.status === 'resubmitted_to_pod';
        if (podFilterTab === 'approved') return t.status === 'approved' || t.status === 'pod_review' || t.status === 'deployed';
        if (podFilterTab === 'drafts') return t.status === 'draft' || t.status === 'returned_for_revision' || !t.status;
        return true;
      })
    : allVisibleTemplates;

  const pendingSubmissionsCount = allVisibleTemplates.filter(
    t => t.status === 'submitted_to_pod' || t.status === 'resubmitted_to_pod'
  ).length;

  const initialList = visibleTemplates.length > 0 ? visibleTemplates : allVisibleTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialList[0]?.id || MASTER_SALES_EVALUATION_TEMPLATE.id);
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate>(
    initialList.find(t => t.id === selectedTemplateId) || initialList[0] || MASTER_SALES_EVALUATION_TEMPLATE
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [podRemarkInput, setPodRemarkInput] = useState('');
  const [showReturnRemarkInput, setShowReturnRemarkInput] = useState(false);

  const currentLoadedTemplateIdRef = useRef<string>(selectedTemplateId);

  const canEdit = isPOD 
    || currentUser?.role === 'system_admin'
    || (isDeptHead && (!activeTemplate.status || activeTemplate.status === 'draft' || activeTemplate.status === 'returned_for_revision'));

  useEffect(() => {
    // Only reload activeTemplate when selectedTemplateId has changed to a DIFFERENT template
    if (selectedTemplateId !== currentLoadedTemplateIdRef.current) {
      currentLoadedTemplateIdRef.current = selectedTemplateId;
      const match = visibleTemplates.find(t => t.id === selectedTemplateId) || allVisibleTemplates.find(t => t.id === selectedTemplateId);
      if (match) {
        setActiveTemplate(match);
      }
    } else {
      // If currently selected template is no longer in the list (e.g. deleted), switch to first available
      const exists = visibleTemplates.some(t => t.id === selectedTemplateId) || allVisibleTemplates.some(t => t.id === selectedTemplateId);
      if (!exists && visibleTemplates.length > 0) {
        currentLoadedTemplateIdRef.current = visibleTemplates[0].id;
        setSelectedTemplateId(visibleTemplates[0].id);
        setActiveTemplate(visibleTemplates[0]);
      }
    }
  }, [selectedTemplateId, visibleTemplates, allVisibleTemplates]);

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
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    if (startDate) return `From ${fmt(startDate)}`;
    return endDate ? `Until ${fmt(endDate)}` : '';
  };

  const handleSubmitToPOD = async () => {
    const isResubmission = activeTemplate.status === 'returned_for_revision';
    const confirmMsg = isResubmission
      ? 'Resubmit this revised template to POD for review?'
      : 'Submit this template to POD for review? You will not be able to edit it until POD returns it.';
    
    if (!window.confirm(confirmMsg)) return;

    const newStatus: TemplateStatus = isResubmission ? 'resubmitted_to_pod' : 'submitted_to_pod';
    const submitted: EvaluationTemplate = {
      ...activeTemplate,
      status: newStatus,
      submittedAt: new Date().toISOString(),
      createdByRole: activeTemplate.createdByRole || currentUser?.role,
      createdByUserId: activeTemplate.createdByUserId || currentUser?.id,
      createdByName: activeTemplate.createdByName || currentUser?.name,
    };

    onSaveTemplate(submitted);
    setActiveTemplate(submitted);

    try {
      await triggerTemplateWorkflowNotification({
        recipientRole: 'pod',
        templateId: submitted.id,
        templateTitle: submitted.title,
        departmentName: submitted.departmentName,
        senderName: currentUser?.name || 'Department Head',
        title: isResubmission ? 'Revised Evaluation Template Resubmitted' : 'New Evaluation Template Submitted',
        message: `The ${submitted.departmentName} Department Head (${currentUser?.name || 'Department Head'}) has submitted the "${submitted.title}" evaluation template for POD review.`,
        type: 'action_required',
        status: newStatus,
      });
    } catch (e) {
      console.warn('[TemplateBuilder] Notification error:', e);
    }

    showToast(isResubmission ? 'Template resubmitted to POD for review!' : 'Template submitted to POD for review!');
  };

  const handlePODAction = async (action: 'approve' | 'deploy' | 'return') => {
    if (action === 'return') {
      if (!podRemarkInput.trim()) {
        setShowReturnRemarkInput(true);
        showToast('Please enter revision remarks for the Department Head.');
        return;
      }

      const returned: EvaluationTemplate = {
        ...activeTemplate,
        status: 'returned_for_revision',
        podRemarks: podRemarkInput.trim(),
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(returned);
      setActiveTemplate(returned);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: activeTemplate.createdByUserId,
          recipientRole: 'dept_head',
          recipientDepartment: activeTemplate.departmentName,
          templateId: returned.id,
          templateTitle: returned.title,
          departmentName: activeTemplate.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Returned for Revision',
          message: `POD (${currentUser?.name || 'POD'}) has returned the evaluation template "${activeTemplate.title}" for revision. Remarks: "${podRemarkInput.trim()}".`,
          type: 'alert',
          status: 'returned_for_revision',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setPodRemarkInput('');
      setShowReturnRemarkInput(false);
      showToast('Template returned to Department Head for revision.');
    } else if (action === 'approve') {
      const approved: EvaluationTemplate = {
        ...activeTemplate,
        status: 'approved',
        podRemarks: podRemarkInput.trim() || activeTemplate.podRemarks,
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(approved);
      setActiveTemplate(approved);

      try {
        await triggerTemplateWorkflowNotification({
          targetUserId: activeTemplate.createdByUserId,
          recipientRole: 'dept_head',
          recipientDepartment: activeTemplate.departmentName,
          templateId: approved.id,
          templateTitle: approved.title,
          departmentName: activeTemplate.departmentName,
          senderName: currentUser?.name || 'People Operations (POD)',
          title: 'Evaluation Template Approved',
          message: `POD (${currentUser?.name || 'POD'}) has approved the evaluation template "${activeTemplate.title}".`,
          type: 'success',
          status: 'approved',
        });
      } catch (e) {
        console.warn('[TemplateBuilder] Notification error:', e);
      }

      setPodRemarkInput('');
      showToast('Template approved by POD. Ready to deploy.');
    } else if (action === 'deploy') {
      const deployed: EvaluationTemplate = {
        ...activeTemplate,
        status: 'deployed',
        reviewedAt: new Date().toISOString(),
      };

      onSaveTemplate(deployed);
      setActiveTemplate(deployed);
      showToast('Template deployed successfully!');
    }
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
    const tmpl = visibleTemplates.find((t) => t.id === id) || templates.find((t) => t.id === id);
    if (tmpl) setActiveTemplate(tmpl);
  };

  const handleCreateNewTemplate = () => {
    const targetDept = departments.find(
      d => d.id === currentUser?.departmentId || d.name?.toLowerCase() === currentUser?.departmentName?.toLowerCase()
    ) || { 
      id: currentUser?.departmentId || 'dept_gen', 
      name: currentUser?.departmentName || 'Department' 
    };

    const currentYear = new Date().getFullYear();
    const defaultStart = `${currentYear}-01-01`;
    const defaultEnd = `${currentYear}-12-31`;
    const defaultPeriod = formatPeriodFromDates(defaultStart, defaultEnd);

    const existingDeptTemplates = templates.filter(
      t => t.departmentId === targetDept.id || t.departmentName?.toLowerCase() === targetDept.name?.toLowerCase()
    );
    const titleSuffix = existingDeptTemplates.length > 0 ? ` (Draft ${existingDeptTemplates.length + 1})` : '';

    const newTemplate = createMasterBasedTemplate(
      targetDept.id,
      targetDept.name,
      `${targetDept.name} Performance Evaluation Scorecard Template${titleSuffix}`,
      defaultPeriod
    );

    newTemplate.id = generateUuid();
    newTemplate.status = 'draft';
    newTemplate.createdByRole = currentUser?.role;
    newTemplate.createdByUserId = currentUser?.id;
    newTemplate.createdByName = currentUser?.name;
    newTemplate.startDate = defaultStart;
    newTemplate.endDate = defaultEnd;

    currentLoadedTemplateIdRef.current = newTemplate.id;
    onSaveTemplate(newTemplate);
    setActiveTemplate(newTemplate);
    setSelectedTemplateId(newTemplate.id);
    setValidationErrors([]);
    showToast(`New draft template initialized for ${targetDept.name}!`);
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
    const targetKra = activeTemplate.kraCategories.find(k => k.id === kraId);
    if (!targetKra) return;

    const newKpi: KPITemplateItem = {
      id: `kpi_${Date.now()}`,
      kraId,
      kraName: targetKra.name,
      name: 'New Performance Indicator',
      description: 'KPI description and performance goals.',
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
    showToast(isDeptHead ? 'Template changes saved successfully!' : 'Template changes saved successfully!');
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
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    submitted_to_pod: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    resubmitted_to_pod: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    returned_for_revision: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    pod_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    deployed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted_to_pod: 'Submitted to POD',
    resubmitted_to_pod: 'Resubmitted to POD',
    returned_for_revision: 'Returned for Revision',
    pod_review: 'POD Approved',
    approved: 'POD Approved',
    deployed: 'Deployed',
  };

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

      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isDeptHead ? 'Department Performance Evaluation Template Builder' : 'Evaluation Templates & POD Review'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {isDeptHead 
              ? 'Create, configure KRAs and KPIs, and submit the official evaluation template for your department to POD.'
              : 'Review, edit, approve, and deploy department evaluation templates submitted by Department Heads.'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleCreateNewTemplate}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center space-x-2 shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[600px] sticky top-4">
          <div className="flex items-center justify-between px-1 shrink-0 mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isDeptHead ? `${currentUser?.departmentName || 'Your'} Templates` : `Department Templates`} ({visibleTemplates.length})
            </h3>
          </div>

          {isPOD && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-750 rounded-xl gap-1 text-[11px] font-semibold shrink-0 mb-2">
              <button
                onClick={() => setPodFilterTab('all')}
                className={`flex-1 py-1 rounded-lg transition-all ${podFilterTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setPodFilterTab('pending')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${podFilterTab === 'pending' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending
                {pendingSubmissionsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                    {pendingSubmissionsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setPodFilterTab('approved')}
                className={`flex-1 py-1 rounded-lg transition-all ${podFilterTab === 'approved' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setPodFilterTab('drafts')}
                className={`flex-1 py-1 rounded-lg transition-all ${podFilterTab === 'drafts' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Drafts
              </button>
            </div>
          )}

          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 pb-10">
            {visibleTemplates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No templates in this category.
              </div>
            ) : visibleTemplates.map((tmpl) => {
              const sts = tmpl.status || 'draft';
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20'
                      : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                      {tmpl.departmentName}
                    </span>
                    <div className="flex items-center space-x-2">
                      {sts && sts !== 'draft' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${statusColors[sts] || statusColors.draft}`}>
                          {statusLabels[sts] || sts}
                        </span>
                      )}
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
                  <p className="text-[10px] text-slate-500 mt-1">
                    {tmpl.evaluationPeriod || (tmpl.startDate && tmpl.endDate ? `${tmpl.startDate} – ${tmpl.endDate}` : '')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tmpl.kraCategories.length} KRAs • Formula: {tmpl.formulaConfig.eligibilityWeight}% KPI / {tmpl.formulaConfig.coreValuesWeight}% Core Values
                  </p>
                  {tmpl.createdByName && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Created by: {tmpl.createdByName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {activeTemplate.status && activeTemplate.status !== 'draft' && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod' ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' :
              activeTemplate.status === 'returned_for_revision' ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' :
              activeTemplate.status === 'approved' || activeTemplate.status === 'pod_review' ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' :
              activeTemplate.status === 'deployed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : ''
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold uppercase tracking-wider text-[10px]">
                  Status: {statusLabels[activeTemplate.status] || activeTemplate.status}
                </p>
                <p>
                  {activeTemplate.status === 'submitted_to_pod' && (
                    isDeptHead 
                      ? 'This template has been submitted to POD for review. Editing is locked until POD approves or returns it.'
                      : 'This template was submitted by the Department Head and requires POD review and approval.'
                  )}
                  {activeTemplate.status === 'resubmitted_to_pod' && (
                    isDeptHead 
                      ? 'This revised template has been resubmitted to POD. Editing is locked until POD review.'
                      : 'The Department Head has revised and resubmitted this template for POD review.'
                  )}
                  {activeTemplate.status === 'returned_for_revision' && (
                    isDeptHead
                      ? 'POD has returned this template for revision. Please review the remarks below, update the template, and resubmit.'
                      : 'This template was returned to the Department Head for revision.'
                  )}
                  {(activeTemplate.status === 'approved' || activeTemplate.status === 'pod_review') && (
                    'POD has approved this template. It is ready for evaluation deployment.'
                  )}
                  {activeTemplate.status === 'deployed' && (
                    'This template is actively deployed for evaluations.'
                  )}
                </p>
                {activeTemplate.podRemarks && (
                  <p className="text-[11px] mt-1 italic font-semibold text-rose-700 dark:text-rose-300">
                    POD Remarks: "{activeTemplate.podRemarks}"
                  </p>
                )}
              </div>
            </div>
          )}

          {isPOD && (activeTemplate.status === 'submitted_to_pod' || activeTemplate.status === 'resubmitted_to_pod') && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">POD Action Required</span>
                </div>
                {activeTemplate.createdByName && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    Submitted by: {activeTemplate.createdByName} ({activeTemplate.departmentName})
                  </span>
                )}
              </div>

              {showReturnRemarkInput && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                    Revision Remarks for Department Head *
                  </label>
                  <textarea
                    placeholder="Enter specific feedback or adjustments needed from the Department Head..."
                    value={podRemarkInput}
                    onChange={e => setPodRemarkInput(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => handlePODAction('approve')} 
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve Template
                </button>
                <button 
                  onClick={() => handlePODAction('deploy')} 
                  className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Deploy Template
                </button>
                <button 
                  onClick={() => handlePODAction('return')} 
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Return for Revision
                </button>
              </div>
            </div>
          )}

          {isPOD && (activeTemplate.status === 'approved' || activeTemplate.status === 'pod_review') && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Approved & Ready for Deployment</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePODAction('deploy')} className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                  <Send className="w-3.5 h-3.5" /> Deploy Template
                </button>
                <button onClick={() => handlePODAction('return')} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Return for Revision
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Template Properties</h3>
                <p className="text-xs text-slate-500">Configure department assignment, period, and weights</p>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap"
                  title="Preview Master Scorecard Layout PDF"
                >
                  Preview Master PDF
                </button>

                {isDeptHead && (!activeTemplate.status || activeTemplate.status === 'draft' || activeTemplate.status === 'returned_for_revision') && (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
                      title="Save your template changes"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplateAction(activeTemplate.id)}
                      className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
                      title="Delete this template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    <button
                      onClick={handleSubmitToPOD}
                      className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> 
                      {activeTemplate.status === 'returned_for_revision' ? 'Resubmit to POD' : 'Submit to POD'}
                    </button>
                  </>
                )}

                {!isDeptHead && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Changes
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplateAction(activeTemplate.id)}
                        className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
                        title="Delete this template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Template Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.title}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, title: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target Department
                </label>
                {isDeptHead ? (
                  <input
                    type="text"
                    value={currentUser?.departmentName || activeTemplate.departmentName}
                    disabled
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-70"
                  />
                ) : (
                  <select
                    value={activeTemplate.departmentId}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const dept = departments.find(d => d.id === e.target.value);
                      setActiveTemplate({
                        ...activeTemplate,
                        departmentId: e.target.value,
                        departmentName: dept?.name || 'SALES'
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Evaluation Period
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">Start Date</p>
                    <input
                      type="date"
                      value={activeTemplate.startDate || ''}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const newPeriod = formatPeriodFromDates(newStart, activeTemplate.endDate);
                        setActiveTemplate({ ...activeTemplate, startDate: newStart, evaluationPeriod: newPeriod });
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">End Date</p>
                    <input
                      type="date"
                      value={activeTemplate.endDate || ''}
                      min={activeTemplate.startDate || ''}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const newPeriod = formatPeriodFromDates(activeTemplate.startDate, newEnd);
                        setActiveTemplate({ ...activeTemplate, endDate: newEnd, evaluationPeriod: newPeriod });
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Formula Weights (%)</span>
                </div>
                <div className="flex items-center space-x-6 text-xs font-bold">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Part 1A:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getWeightInputValue('formula_eligibility', activeTemplate.formulaConfig.eligibilityWeight)}
                      disabled={!canEdit}
                      onChange={(e) => handleWeightInputChange('formula_eligibility', e.target.value)}
                      onBlur={() => {
                        const numVal = commitWeightInput('formula_eligibility', activeTemplate.formulaConfig.eligibilityWeight);
                        setActiveTemplate({
                          ...activeTemplate,
                          formulaConfig: { ...activeTemplate.formulaConfig, eligibilityWeight: numVal }
                        });
                      }}
                      className="w-14 px-2 py-1 rounded-lg text-xs font-bold border text-center bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                    <span className="ml-1">%</span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Part 1B:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getWeightInputValue('formula_core_values', activeTemplate.formulaConfig.coreValuesWeight)}
                      disabled={!canEdit}
                      onChange={(e) => handleWeightInputChange('formula_core_values', e.target.value)}
                      onBlur={() => {
                        const numVal = commitWeightInput('formula_core_values', activeTemplate.formulaConfig.coreValuesWeight);
                        setActiveTemplate({
                          ...activeTemplate,
                          formulaConfig: { ...activeTemplate.formulaConfig, coreValuesWeight: numVal }
                        });
                      }}
                      className="w-14 px-2 py-1 rounded-lg text-xs font-bold border text-center bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                    <span className="ml-1">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Key Result Areas (KRAs) & Key Performance Indicators (KPIs)</h4>
                <p className="text-xs text-slate-500">Configure department goals, weight allocations, and rating rubrics</p>
              </div>
              {canEdit && (
                <button
                  onClick={handleAddKRA}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add KRA Category</span>
                </button>
              )}
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${
              isPart1AKraWeightValid() && isPart1AKpiWeightValid()
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center space-x-2">
                  {isPart1AKraWeightValid() && isPart1AKpiWeightValid() ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>Part 1A Total Weight Allocation</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>KRA Categories: <strong>{getKraTotalWeight().toFixed(2)}%</strong> / {eligibilityWeight}%</span>
                  <span>Individual KPIs: <strong>{getAllKpisTotalWeight().toFixed(2)}%</strong> / {eligibilityWeight}%</span>
                </div>
              </div>

              {(!isPart1AKraWeightValid() || !isPart1AKpiWeightValid()) && (
                <div className="text-[11px] font-normal text-amber-900 dark:text-amber-200 pt-1.5 border-t border-amber-200 dark:border-amber-800/50 space-y-0.5">
                  {!isPart1AKraWeightValid() && (
                    <p>• <strong>KRA Categories Mismatch:</strong> Sum of KRA category weights is {getKraTotalWeight().toFixed(2)}% (must equal exactly {eligibilityWeight}%).</p>
                  )}
                  {!isPart1AKpiWeightValid() && (
                    <p>• <strong>Individual KPI Mismatch:</strong> Sum of all individual KPI weights is {getAllKpisTotalWeight().toFixed(2)}% (must equal exactly {eligibilityWeight}%).</p>
                  )}
                </div>
              )}
            </div>

            {activeTemplate.kraCategories.map((kra) => (
              <div key={kra.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <input
                      type="text"
                      value={kra.name}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, name: e.target.value } : k);
                        setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                      }}
                      className="font-bold text-slate-900 dark:text-white text-sm bg-transparent border-b border-brand-300 focus:border-brand-500 outline-none flex-1 min-w-0 disabled:border-none"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                        Math.abs(getKpiTotal(kra) - (Number(kra.categoryWeightPercent) || 0)) < 0.01
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300'
                      }`}>
                        KPIs: {getKpiTotal(kra).toFixed(2)}% / {kra.categoryWeightPercent}%
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={getWeightInputValue(`kra_${kra.id}`, kra.categoryWeightPercent)}
                        disabled={!canEdit}
                        onChange={(e) => handleWeightInputChange(`kra_${kra.id}`, e.target.value)}
                        onBlur={() => {
                          const numVal = commitWeightInput(`kra_${kra.id}`, kra.categoryWeightPercent);
                          const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, categoryWeightPercent: numVal } : k);
                          setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                        }}
                        className={`w-14 px-2 py-1 rounded-lg text-[11px] font-bold border text-center disabled:opacity-60 ${
                          isKraValid(kra)
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
                        }`}
                        title="KRA Category Target Weight"
                      />
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => handleAddKPI(kra.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                      >
                        + Add KPI
                      </button>
                      <button
                        onClick={() => handleRemoveKRA(kra.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!isKraValid(kra) && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-2">
                    <div className="flex items-center space-x-1 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>KPI weights exceed the KRA weight.</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {kra.kpis.map((kpi) => (
                    <div key={kpi.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full space-y-2">
                          <input
                            type="text"
                            value={kpi.name}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, name: e.target.value } : item);
                              const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                              setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                            }}
                            className="w-full font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                            placeholder="KPI Name"
                          />
                          <textarea
                            value={kpi.description}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, description: e.target.value } : item);
                              const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                              setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                            }}
                            rows={2}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500/20 resize-none disabled:opacity-60"
                            placeholder="KPI Description / Goals"
                          />
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-slate-400 font-bold">Weight:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getWeightInputValue(`kpi_${kpi.id}`, kpi.weightPercent)}
                              disabled={!canEdit}
                              onChange={(e) => handleWeightInputChange(`kpi_${kpi.id}`, e.target.value)}
                              onBlur={() => {
                                const numVal = commitWeightInput(`kpi_${kpi.id}`, kpi.weightPercent);
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, weightPercent: numVal } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              className="w-14 px-2 py-1 rounded-lg text-xs font-bold border text-center bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white disabled:opacity-60"
                            />
                            <span className="text-xs text-slate-400 font-bold">%</span>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleRemoveKPI(kra.id, kpi.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {kpi.standards.map((st, sIdx) => (
                          <div key={sIdx} className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">
                              Rating {st.rating} ({st.label})
                            </span>
                            <textarea
                              value={st.description}
                              disabled={!canEdit}
                              onChange={(e) => {
                                const updatedStandards = kpi.standards.map((item, idx) => idx === sIdx ? { ...item, description: e.target.value } : item);
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, standards: updatedStandards } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              rows={2}
                              className="w-full text-[11px] p-1 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-slate-300 resize-none disabled:opacity-60"
                              placeholder="Standard criteria..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}

            {/* Part 1B - EVALUATION ON SUITABILITY FACTORS */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">EVALUATION ON SUITABILITY FACTORS</span>
                  <p className="text-[11px] text-slate-500">Subdivisions of the Part 1B total weight</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={recalculateCoreValueWeights}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                    title="Redistribute Part 1B weight equally among all Core Values"
                  >
                    Recalculate Equally
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoreValue}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Core Value</span>
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isCoreValuesValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Part 1B Total: {activeTemplate.formulaConfig.coreValuesWeight || 0}% • Core Values: {activeTemplate.coreValues?.length || 0} • Sum: {Number(totalCoreValueWeight.toFixed(2))}%</span>
                </div>
                {!isCoreValuesValid && (
                  <span className="text-[11px] font-normal">Core Values must total exactly Part 1B weight.</span>
                )}
              </div>

              <div className="space-y-2">
                {(activeTemplate.coreValues || []).map((cv) => (
                  <div key={cv.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cv.name}
                          onChange={(e) => handleUpdateCoreValue(cv.id, 'name', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                          placeholder="Core Value Name"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getWeightInputValue(`cv_${cv.id}`, cv.weightPercent || 0)}
                          onChange={(e) => handleWeightInputChange(`cv_${cv.id}`, e.target.value)}
                          onBlur={() => {
                            const numVal = commitWeightInput(`cv_${cv.id}`, cv.weightPercent || 0);
                            handleUpdateCoreValue(cv.id, 'weightPercent', numVal);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                          placeholder="Weight %"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreValue(cv.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                        title="Remove Core Value"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cv.description || ''}
                      onChange={(e) => handleUpdateCoreValue(cv.id, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs"
                      placeholder="Core Value description"
                    />
                  </div>
                ))}
                {(activeTemplate.coreValues?.length || 0) === 0 && (
                  <p className="text-[11px] text-slate-500 italic">No Core Values defined. Click "Add Core Value" to create one.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-brand-500" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Live Master Scorecard Layout Preview — {activeTemplate.title}
                </h4>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
              <PrintableScorecard
                evaluation={createDraftEvaluationInMemory(
                  currentUser || { id: 'usr_preview', name: 'Sample Employee', role: 'employee', departmentName: activeTemplate.departmentName, position: 'Position Title' } as User,
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
