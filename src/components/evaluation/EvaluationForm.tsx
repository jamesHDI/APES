import React, { useState, useEffect } from 'react';
import { Evaluation, User, Role, DigitalSignature, EvidenceFile, PersonnelAction, ActionType, EvaluationTemplate, KPIRating, RatingStandard, RatingAdjustment } from '../../types';
import { 
  computeKPIWeightedScore, 
  computeEligibilityScore,
  computeCoreValuesAverage, 
  computeCoreValuesWeightedScore, 
  computeFinalPerformanceRating, 
  getRatingClassification,
  getLatestAdjustedRating,
  appendRatingAdjustment,
} from '../../services/computationEngine';
import { validateEvaluationForSubmission } from '../../services/validationService';
import { triggerWorkflowNotification } from '../../services/notificationService';
import { uploadFileToSupabaseStorage } from '../../services/supabaseService';
import { archiveEvaluationTransaction, ArchiveTransactionResult, getStoredDeployments } from '../../services/storage';
import { MASTER_SALES_EVALUATION_TEMPLATE } from '../../constants/masterSalesTemplate';
import { WorkflowProgressBar } from '../workflow/WorkflowProgressBar';
import { EvaluationProgressCard } from '../workflow/EvaluationProgressCard';
import { EvaluationTimeline } from '../workflow/EvaluationTimeline';
import { isUserDepartmentHead, determineWorkflowType, isEvaluationCompleted } from '../../utils/workflowUtils';
import { SignatureModal } from '../common/SignatureModal';
import { EvidenceUploadModal } from '../common/EvidenceUploadModal';
import { WorkflowAuditTrailModal } from './WorkflowAuditTrailModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import confetti from 'canvas-confetti';
import { ReturnRevisionModal } from './ReturnRevisionModal';
import { 
  Save, 
  Send, 
  PenTool, 
  Paperclip, 
  Printer, 
  CheckCircle2, 
  Crown,
  ShieldCheck,
  Sparkles,
  History,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface EvaluationFormProps {
  evaluation: Evaluation;
  currentUser: User;
  allUsers: User[];
  templates: EvaluationTemplate[];
  onSave: (updatedEvaluation: Evaluation) => void;
  onViewPrintable: () => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  evaluation: initialEvaluation,
  currentUser,
  allUsers,
  templates,
  onSave,
  onViewPrintable,
}) => {
  const [evalData, setEvalData] = useState<Evaluation>(initialEvaluation);
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigRole, setSigRole] = useState<'employee' | 'supervisor' | 'dept_head' | 'president' | 'pod' | 'hr'>('employee');
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'part1a' | 'part1b' | 'part2' | 'part3' | 'part4' | 'signatures'>('part1a');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<null | 'employee' | 'supervisor' | 'president' | 'pod'>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveFailure, setArchiveFailure] = useState<ArchiveTransactionResult | null>(null);

  const currentRole = currentUser.role;
  const isReadOnly = isEvaluationCompleted(evalData);
  const isSelfEval = Boolean(
    currentUser.role !== 'system_admin' && (
      (evalData.employeeId && (currentUser.id === evalData.employeeId || currentUser.employeeNumber === evalData.employeeId)) ||
      (evalData.employeeEmail && currentUser.email && evalData.employeeEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (evalData.employeeName && currentUser.name && evalData.employeeName.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
    )
  );

  const currentTemplate = (templates || []).find(t => t.id === evalData.templateId) || 
    (templates || []).find(t => evalData.templateTitle && (t.title?.toLowerCase().trim() === evalData.templateTitle.toLowerCase().trim())) ||
    (templates || []).find(t => t.departmentName && evalData.departmentName && t.departmentName.toLowerCase().trim() === evalData.departmentName.toLowerCase().trim()) || 
    (templates || []).find(t => t.departmentId && evalData.departmentId && t.departmentId === evalData.departmentId) ||
    (templates || []).find(t => evalData.departmentName && t.title?.toLowerCase().includes(evalData.departmentName.toLowerCase().trim())) ||
    templates?.[0] ||
    MASTER_SALES_EVALUATION_TEMPLATE;

  // Generate fallback KPI ratings from the resolved template if missing
  const defaultStandards: { rating: 1 | 2 | 3 | 4; label: string; description: string }[] = [
    { rating: 4, label: '4 - Exceeds', description: 'Exceeds target performance' },
    { rating: 3, label: '3 - Meets', description: 'Meets expected target' },
    { rating: 2, label: '2 - Barely Meets', description: 'Barely meets minimum target' },
    { rating: 1, label: '1 - Did Not Meet', description: 'Did not meet target performance' }
  ];

  const templateKpiRatings: KPIRating[] = (currentTemplate.kraCategories || []).flatMap((kra) =>
    (kra.kpis || []).map((kpi) => ({
      kpiId: kpi.id,
      kraId: kra.id,
      kraName: kra.name,
      name: kpi.name,
      weightPercent: Number(kpi.weightPercent || 0),
      selfRating: 0,
      supervisorRating: 0,
      presidentRating: 0,
      podRating: 0,
      weightedScore: 0,
      comments: '',
      standards: Array.isArray(kpi.standards) && kpi.standards.length > 0 ? kpi.standards : defaultStandards,
      evidenceRequired: Boolean(kpi.evidenceRequired),
      ratingHistory: []
    }))
  );

  const templateCoreValueRatings = (currentTemplate.coreValues && currentTemplate.coreValues.length > 0)
    ? currentTemplate.coreValues.map((cv) => ({
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

  // Self-heal: only populate kpiRatings/coreValueRatings if they are truly absent (no structure at all).
  // CRITICAL: Never overwrite existing ratings. If a KPI already has selfRating/supervisorRating data,
  // those are the employee's real submitted values and must not be reset to zero.
  useEffect(() => {
    let needsUpdate = false;
    let healed = { ...initialEvaluation };

    const hasExistingKpiStructure = Array.isArray(healed.kpiRatings) && healed.kpiRatings.length > 0;
    if (!hasExistingKpiStructure) {
      healed.kpiRatings = templateKpiRatings;
      needsUpdate = true;
    }

    const hasExistingCvStructure = Array.isArray(healed.coreValueRatings) && healed.coreValueRatings.length > 0;
    if (!hasExistingCvStructure) {
      healed.coreValueRatings = templateCoreValueRatings;
      needsUpdate = true;
    }

    // Always sync local evalData with the latest initialEvaluation from storage
    // (e.g. after dept head opens an evaluation submitted by employee)
    setEvalData(healed);

    // Only persist to storage if we had to add missing structure
    if (needsUpdate) {
      onSave(healed);
    }
  }, [initialEvaluation.id, currentTemplate.id]);

  const matchingDeployment = evalData.deploymentId 
    ? getStoredDeployments().find(d => d.id === evalData.deploymentId)
    : getStoredDeployments().find(d => (d.period && evalData.appraisalPeriod && d.period.toLowerCase().trim() === evalData.appraisalPeriod.toLowerCase().trim()) || (d.title && evalData.title && d.title.toLowerCase().trim() === evalData.title.toLowerCase().trim()));

  const evaluationTitle = evalData.title || matchingDeployment?.title || evalData.appraisalPeriod || currentTemplate.title;
  const evaluationTemplateName = evalData.templateTitle || matchingDeployment?.templateTitle || currentTemplate.title;

  const eligibilityWeight = Number(currentTemplate.formulaConfig?.eligibilityWeight || 85);
  const coreValuesWeight = Number(currentTemplate.formulaConfig?.coreValuesWeight || 15);

  // Strict Role-Based Section Locking Permissions
  const canEditEmployeeSection = !isReadOnly && isSelfEval && (evalData.status === 'draft' || evalData.status === 'reopened');

  const canEditDeptHeadSection = !isReadOnly && !isSelfEval && (
    evalData.status === 'pending_dept_head' ||
    evalData.status === 'employee_submitted' ||
    evalData.status === 'pending_supervisor'
  ) && (
    currentRole === 'dept_head' ||
    currentRole === 'supervisor' ||
    (Boolean(currentUser.isDepartmentHead) && currentRole !== 'pod') ||
    currentUser.id === currentUser.departmentHeadId ||
    (currentUser.departmentName === evalData.departmentName && currentRole !== 'pod') ||
    currentRole === 'system_admin'
  );

  const canEditPresidentSection = !isReadOnly && !isSelfEval && (
    evalData.status === 'pending_president' ||
    evalData.status === 'department_head_submitted'
  ) && (
    currentRole === 'president' ||
    currentRole === 'system_admin'
  );

  const canEditPODSection = !isReadOnly && (
    evalData.status === 'pending_pod' ||
    evalData.status === 'supervisor_completed' ||
    evalData.status === 'president_completed' ||
    evalData.status === 'department_head_submitted'
  ) && (
    currentRole === 'pod' ||
    currentRole === 'hr_admin' ||
    currentRole === 'system_admin'
  );

  // Privacy & Access Control Rules for Private Evaluation Activity History:
  // - Employee who owns the evaluation -> Can view their own evaluation history only.
  // - POD & System Administrator -> Can view history of all evaluations.
  // - Department Head & President -> Cannot access history after completing assigned review (only while assigned).
  const canViewActivityHistory = Boolean(
    currentUser.id === evalData.employeeId ||
    currentRole === 'pod' ||
    currentRole === 'system_admin' || 
    currentRole === 'hr_admin' ||
    ((currentRole === 'dept_head' || Boolean(currentUser.isDepartmentHead)) &&
      currentUser.id !== evalData.employeeId &&
      (evalData.status === 'pending_dept_head' || evalData.status === 'employee_submitted' || evalData.status === 'pending_supervisor')) ||
    (currentRole === 'president' &&
      currentUser.id !== evalData.employeeId &&
      (evalData.status === 'pending_president' || evalData.status === 'department_head_submitted'))
  );

  const handleConfirmReturn = (reason: string) => {
    const updatedEval: Evaluation = {
      ...evalData,
      status: 'reopened',
      returnReason: reason,
      returnedBy: currentUser.name,
      returnedByRole: currentUser.role,
      updatedAt: new Date().toISOString().substring(0, 10),
      auditTrail: [
        ...(evalData.auditTrail || []),
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          performedBy: currentUser.name,
          performedByRole: currentUser.role,
          assignedTo: evalData.employeeName,
          actionPerformed: 'Returned for Revision',
          previousStatus: evalData.status,
          newStatus: 'reopened',
          remarks: reason
        }
      ]
    };

    setEvalData(updatedEval);
    onSave(updatedEval);
    setShowReturnModal(false);

    triggerWorkflowNotification(
      evalData.employeeId,
      updatedEval,
      'Evaluation Returned for Revision',
      `Your evaluation was returned by ${currentUser.name} (${currentUser.role}). Reason: "${reason}". Please revise and resubmit.`,
      currentUser.name,
      'action_required'
    );

    showToast('Evaluation successfully returned for revision!');
  };

  const handleRatingChange = (kpiId: string, roleType: 'self' | 'supervisor' | 'president' | 'pod', ratingValue: number) => {
    const kpisToUpdate = (evalData.kpiRatings && evalData.kpiRatings.length > 0)
      ? evalData.kpiRatings
      : templateKpiRatings;

    const updatedKpis: KPIRating[] = kpisToUpdate.map((kpi: KPIRating): KPIRating => {
      if (kpi.kpiId === kpiId) {
        const selfRating = roleType === 'self' ? ratingValue : (kpi.selfRating || 0);
        const supervisorRating = roleType === 'supervisor' ? ratingValue : (kpi.supervisorRating || 0);
        const presidentRating = (roleType === 'president' || roleType === 'pod') ? ratingValue : (kpi.presidentRating || 0);
        const podRating = (roleType === 'pod' || roleType === 'president') ? ratingValue : (kpi.podRating ?? kpi.presidentRating ?? 0);

        const tempKpi: KPIRating = { ...kpi, selfRating, supervisorRating, presidentRating, podRating };
        const ratingToUse = getLatestAdjustedRating(tempKpi);
        const weightedScore = computeKPIWeightedScore(kpi.weightPercent, ratingToUse);

        let updatedKpi: KPIRating = { ...tempKpi, weightedScore };
        if ((roleType === 'supervisor' || roleType === 'president' || roleType === 'pod') && ratingValue !== 0) {
          const adjustedByName = currentUser?.name || currentUser?.role || 'Unknown';
          const adjustRole = (roleType === 'president' || roleType === 'pod') ? 'pod' : roleType;
          updatedKpi = appendRatingAdjustment(updatedKpi, adjustedByName, adjustRole as any, ratingValue);
        }
        return updatedKpi;
      }
      return kpi;
    });

    const cvsToUse = (evalData.coreValueRatings && evalData.coreValueRatings.length > 0)
      ? evalData.coreValueRatings
      : templateCoreValueRatings;

    recalculateAndSetState(updatedKpis, cvsToUse);
  };

  const handleKPICommentChange = (kpiId: string, comment: string) => {
    const kpisToUpdate = (evalData.kpiRatings && evalData.kpiRatings.length > 0)
      ? evalData.kpiRatings
      : templateKpiRatings;

    const updatedKpis = kpisToUpdate.map((kpi) => 
      kpi.kpiId === kpiId ? { ...kpi, comments: comment } : kpi
    );
    // Only update local state — onSave will be called on draft save or submission
    setEvalData(prev => ({ ...prev, kpiRatings: updatedKpis }));
  };

  const handleCoreValueRatingChange = (cvId: string, field: 'podRating' | 'peerRating' | 'isRating', value: number) => {
    const cvsToUpdate = (evalData.coreValueRatings && evalData.coreValueRatings.length > 0)
      ? evalData.coreValueRatings
      : templateCoreValueRatings;

    const updatedCVs = cvsToUpdate.map((cv) => {
      if (cv.coreValueId === cvId) {
        const pod = field === 'podRating' ? value : cv.podRating;
        const peer = field === 'peerRating' ? value : cv.peerRating;
        const is = field === 'isRating' ? value : cv.isRating;
        
        let count = 0;
        let sum = 0;
        if (pod > 0) { sum += pod; count++; }
        if (peer > 0) { sum += peer; count++; }
        if (is > 0) { sum += is; count++; }
        
        const avgRating = count > 0 ? Number((sum / count).toFixed(2)) : 0;
        const cvCount = cvsToUpdate.length || 4;
        const rawWeight = (cv as any).weightPercent ?? (coreValuesWeight / cvCount);
        const weightedScore = computeCoreValuesWeightedScore(avgRating, rawWeight);
        return {
          ...cv,
          podRating: pod,
          peerRating: peer,
          isRating: is,
          avgRating,
          weightedScore
        };
      }
      return cv;
    });

    const kpisToUse = (evalData.kpiRatings && evalData.kpiRatings.length > 0)
      ? evalData.kpiRatings
      : templateKpiRatings;

    recalculateAndSetState(kpisToUse, updatedCVs);
  };

  const handleCoreValueCommentChange = (cvId: string, comment: string) => {
    const cvsToUpdate = (evalData.coreValueRatings && evalData.coreValueRatings.length > 0)
      ? evalData.coreValueRatings
      : templateCoreValueRatings;

    const updatedCVs = cvsToUpdate.map((cv) => 
      cv.coreValueId === cvId ? { ...cv, comments: comment } : cv
    );
    // Only update local state — onSave will be called on draft save or submission
    setEvalData(prev => ({ ...prev, coreValueRatings: updatedCVs }));
  };

  const recalculateAndSetState = (kpiRatings = evalData.kpiRatings, coreValueRatings = evalData.coreValueRatings) => {
    const eligibilityScore = computeEligibilityScore(kpiRatings);
    const coreValuesAvg = computeCoreValuesAverage(coreValueRatings);
    const coreValuesWeightedScore = computeCoreValuesWeightedScore(coreValuesAvg, coreValuesWeight);
    const finalRating = computeFinalPerformanceRating(eligibilityScore, coreValuesWeightedScore);
    const classification = getRatingClassification(finalRating);

    // Only update local state here. onSave is called explicitly by submission handlers
    // and handleSaveDraft to avoid race conditions from rapid rating changes.
    setEvalData(prev => ({
      ...prev,
      kpiRatings,
      coreValueRatings,
      eligibilityScore,
      coreValuesScore: coreValuesAvg,
      totalEligibilityWeightedRating: eligibilityScore,
      totalCoreValuesWeightedRating: coreValuesWeightedScore,
      finalRating,
      ratingClassification: classification.label,
      updatedAt: new Date().toISOString()
    }));
  };

  const addAuditEntry = (actionPerformed: string, previousStatus: string, newStatus: string, assignedTo: string, remarks?: string) => {
    const newEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      performedBy: currentUser.name,
      performedByRole: currentUser.role.toUpperCase(),
      assignedTo,
      actionPerformed,
      previousStatus,
      newStatus,
      remarks,
      ipAddress: '192.168.1.100'
    };
    return [newEntry, ...(evalData.auditTrail || [])];
  };

  const handleSaveDraft = () => {
    const updatedAudit = addAuditEntry(
      'Saved evaluation draft',
      evalData.status,
      evalData.status,
      evalData.employeeName
    );
    const updated = { ...evalData, auditTrail: updatedAudit };
    setEvalData(updated);
    onSave(updated);
    showToast('Draft saved successfully!');
  };

  // Confirm dialog trigger handlers
  const handleConfirmAction = () => {
    if (confirmAction === 'employee') doSubmitEmployee();
    else if (confirmAction === 'supervisor') doFinalizeSupervisor();
    else if (confirmAction === 'president') doFinalizePresident();
    else if (confirmAction === 'pod') doValidatePOD();
    setConfirmAction(null);
  };

  // Workflow Submission Handlers with Pre-Validation Check
  const handleSubmitEmployee = () => {
    const kpisToSubmit = (evalData.kpiRatings && evalData.kpiRatings.length > 0) ? evalData.kpiRatings : templateKpiRatings;
    const cvsToSubmit = (evalData.coreValueRatings && evalData.coreValueRatings.length > 0) ? evalData.coreValueRatings : templateCoreValueRatings;
    
    const eligibilityScore = computeEligibilityScore(kpisToSubmit);
    const coreValuesAvg = computeCoreValuesAverage(cvsToSubmit);
    const coreValuesWeightedScore = computeCoreValuesWeightedScore(coreValuesAvg, coreValuesWeight);
    const finalRating = computeFinalPerformanceRating(eligibilityScore, coreValuesWeightedScore);
    const classification = getRatingClassification(finalRating);

    const readyEval: Evaluation = {
      ...evalData,
      kpiRatings: kpisToSubmit,
      coreValueRatings: cvsToSubmit,
      eligibilityScore,
      coreValuesScore: coreValuesAvg,
      totalEligibilityWeightedRating: eligibilityScore,
      totalCoreValuesWeightedRating: coreValuesWeightedScore,
      finalRating,
      ratingClassification: classification.label
    };

    const validation = validateEvaluationForSubmission(readyEval, currentUser, allUsers);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setEvalData(readyEval);
    setConfirmAction('employee');
  };

  const doSubmitEmployee = () => {
    const isDeptHeadUser = isUserDepartmentHead(currentUser) || evalData.isDepartmentHead || evalData.workflowType === 'WORKFLOW_DEPT_HEAD';

    if (isDeptHeadUser) {
      const presidentUser = allUsers.find(u => u.role === 'president') || { id: 'usr_pres_01', name: 'President & CEO' };
      const nextStatus = 'pending_president';
      const assignedTo = `${presidentUser.name} (President & CEO)`;

      const updatedAudit = addAuditEntry(
        'Department Head Self-Evaluation Submitted',
        evalData.status,
        nextStatus,
        assignedTo,
        'Submitted for President executive review.'
      );

      const updated: Evaluation = {
        ...evalData,
        workflowType: 'WORKFLOW_DEPT_HEAD',
        isDepartmentHead: true,
        status: nextStatus as any,
        auditTrail: updatedAudit,
        updatedAt: new Date().toISOString()
      };

      setEvalData(updated);
      onSave(updated);

      triggerWorkflowNotification(
        presidentUser.id,
        updated,
        'Action Required: Department Head Self-Evaluation Submitted',
        `Department Head ${currentUser.name} (${evalData.departmentName}) submitted their self-evaluation for executive review.`,
        currentUser.name
      );

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      showToast(`Self-evaluation submitted! Automatically routed to President: ${assignedTo}`);
    } else {
      const deptName = currentUser.departmentName || evalData.departmentName;
      const deptHeadUser = allUsers.find(
        u => (u.id === currentUser.departmentHeadId) || 
             (u.role === 'dept_head' && u.departmentName === deptName) ||
             (u.isDepartmentHead && u.departmentName === deptName)
      );

      const nextStatus = 'pending_dept_head';
      const assignedTo = deptHeadUser ? `${deptHeadUser.name} (${deptName} Department Head)` : `${deptName} Department Head`;

      const updatedAudit = addAuditEntry(
        'Self-Evaluation Submitted',
        evalData.status,
        nextStatus,
        assignedTo,
        'Submitted for Department Head review.'
      );

      const updated: Evaluation = {
        ...evalData,
        workflowType: 'WORKFLOW_REGULAR',
        isDepartmentHead: false,
        status: nextStatus as any,
        auditTrail: updatedAudit,
        updatedAt: new Date().toISOString()
      };

      setEvalData(updated);
      onSave(updated);

      if (deptHeadUser) {
        triggerWorkflowNotification(
          deptHeadUser.id,
          updated,
          'Action Required: Employee Self-Evaluation Submitted',
          `${currentUser.name} (${deptName}) has submitted their self-evaluation for your review.`,
          currentUser.name
        );
      }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      showToast(`Self-evaluation submitted! Automatically routed to Department Head: ${assignedTo}`);
    }
  };

  const handleFinalizeSupervisor = () => {
    const validation = validateEvaluationForSubmission(evalData, currentUser, allUsers);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setConfirmAction('supervisor');
  };

  const doFinalizeSupervisor = () => {
    const podUser = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { id: 'usr_dh_pohr', name: 'Malene Pellazo' };
    const assignedTo = `${podUser.name} (Department Head - People Operations / POD)`;

    const updatedAudit = addAuditEntry('Department Head Review Completed', evalData.status, 'pending_pod', assignedTo, 'Review completed and submitted to POD.');

    const finalizedKpis: KPIRating[] = evalData.kpiRatings.map(k => {
      const supRating = k.supervisorRating > 0 ? k.supervisorRating : (k.selfRating || 0);
      const effective = getLatestAdjustedRating({ ...k, supervisorRating: supRating });
      const weightedScore = computeKPIWeightedScore(k.weightPercent, effective);
      return {
        ...k,
        supervisorRating: supRating,
        weightedScore
      };
    });

    const updated: Evaluation = {
      ...evalData,
      kpiRatings: finalizedKpis,
      status: 'pending_pod' as const,
      auditTrail: updatedAudit,
      updatedAt: new Date().toISOString()
    };

    setEvalData(updated);
    onSave(updated);

    triggerWorkflowNotification(
      podUser.id,
      updated,
      'Action Required: Evaluation Pending POD Validation',
      `Department Head ${currentUser.name} completed review for ${evalData.employeeName}. Ready for final POD review by ${podUser.name}.`,
      currentUser.name
    );

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    showToast(`Department Head review finalized! Submitted to ${podUser.name} for POD validation.`);
  };

  const handleFinalizePresident = () => {
    const validation = validateEvaluationForSubmission(evalData, currentUser, allUsers);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setConfirmAction('president');
  };

  const doFinalizePresident = () => {
    const isPodEmployee = evalData.employeeEmail?.includes('pod') || 
                          evalData.employeeName?.includes('Malene') || 
                          evalData.departmentName?.includes('People Operations') || 
                          (allUsers.find(u => u.id === evalData.employeeId)?.role === 'pod');

    if (isPodEmployee) {
      // POD self-evaluation completed by President -> Auto-completes to pod_validated / archived
      const updatedAudit = addAuditEntry(
        'President Executive Approval & POD Auto-Validation Completed',
        evalData.status,
        'pod_validated',
        'System & POD',
        'POD Officer self-evaluation reviewed & approved by President. Workflow auto-completed and archived.'
      );

      const updated: Evaluation = {
        ...evalData,
        status: 'pod_validated',
        signatures: {
          ...evalData.signatures,
          pod: evalData.signatures.pod || {
            role: 'pod',
            signerName: 'People Operations (POD Auto-Validation)',
            signatureDataUrl: 'https://signature.apes.hdi/pod_auto_valid.png',
            signedAt: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
        auditTrail: updatedAudit,
        updatedAt: new Date().toISOString()
      };

      setEvalData(updated);
      onSave(updated);

      triggerWorkflowNotification(
        evalData.employeeId,
        updated,
        'POD Self-Evaluation Approved & Archived',
        `Your self-evaluation has been approved by President ${currentUser.name}. Workflow completed and archived.`,
        currentUser.name
      );

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      showToast(`POD Officer Evaluation approved by President! Automatically completed & archived.`);
      return;
    }

    const podUser = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { id: 'usr_dh_pohr', name: 'Malene Pellazo' };
    const assignedTo = `${podUser.name} (Department Head - People Operations / POD)`;

    const updatedAudit = addAuditEntry('President Executive Review Completed', evalData.status, 'pending_pod', assignedTo);

    const updated: Evaluation = {
      ...evalData,
      status: 'pending_pod' as const,
      auditTrail: updatedAudit,
      updatedAt: new Date().toISOString()
    };

    setEvalData(updated);
    onSave(updated);

    triggerWorkflowNotification(
      podUser.id,
      updated,
      'Action Required: Dept Head Scorecard Ready for POD Validation',
      `Executive review completed for ${evalData.employeeName}. Submitted for final POD review by ${podUser.name}.`,
      currentUser.name
    );

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    showToast(`Executive review completed! Submitted to ${podUser.name} for POD validation.`);
  };

  const handleValidatePOD = () => {
    const validation = validateEvaluationForSubmission(evalData, currentUser, allUsers);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setConfirmAction('pod');
  };

  const doValidatePOD = () => {
    const updatedAudit = addAuditEntry('POD Validation Completed & Archived', evalData.status, 'archived', 'System Archive');

    const updated: Evaluation = {
      ...evalData,
      status: 'archived' as const,
      auditTrail: updatedAudit,
      updatedAt: new Date().toISOString()
    };

    setEvalData(updated);
    onSave(updated);

    // Notify employee that evaluation has been finalized
    triggerWorkflowNotification(
      evalData.employeeId,
      updated,
      'Evaluation Cycle Finalized & Archived',
      `Your performance evaluation for period "${evalData.appraisalPeriod}" has been validated by POD and officially completed.`,
      currentUser.name,
      'success'
    );

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    showToast('Evaluation validated by POD and archived!');
  };

  const handleSaveSignature = (signature: DigitalSignature) => {
    const roleKey = signature.role === 'dept_head' ? 'deptHead' : signature.role;
    const newSigs = { 
      ...evalData.signatures, 
      [signature.role]: signature,
      [roleKey]: signature,
      ...(signature.role === 'dept_head' || signature.role === 'supervisor' ? {
        deptHead: signature,
        dept_head: signature,
        supervisor: signature
      } : {})
    };
    const updated = { ...evalData, signatures: newSigs };
    setEvalData(updated);
    onSave(updated);
    showToast(`${signature.signerName} digitally signed the evaluation!`);
  };

  const handleUploadEvidence = (file: EvidenceFile) => {
    const updated = { ...evalData, evidenceFiles: [...evalData.evidenceFiles, file] };
    setEvalData(updated);
    onSave(updated);
    showToast(`Evidence attached: ${file.fileName}`);
  };

  const handleRemoveEvidence = (fileId: string) => {
    const updated = {
      ...evalData,
      evidenceFiles: evalData.evidenceFiles.filter((f) => f.id !== fileId)
    };
    setEvalData(updated);
    onSave(updated);
    showToast('Evidence attachment removed.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const effectiveKpiRatings: KPIRating[] = (evalData.kpiRatings && evalData.kpiRatings.length > 0)
    ? evalData.kpiRatings
    : templateKpiRatings;

  const effectiveCoreValueRatings = (evalData.coreValueRatings && evalData.coreValueRatings.length > 0)
    ? evalData.coreValueRatings
    : templateCoreValueRatings;

  const krasMap = new Map<string, KPIRating[]>();
  effectiveKpiRatings.forEach((kpi) => {
    const kraName = kpi.kraName || '1. KEY RESULT AREA';
    if (!krasMap.has(kraName)) {
      krasMap.set(kraName, []);
    }
    krasMap.get(kraName)!.push(kpi);
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Pre-Submission Validation Errors Box */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Submission Blocked — Hierarchy & Completeness Validation Errors</span>
          </div>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Read Only Alert Banner */}
      {isReadOnly && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm">Evaluation Cycle Completed & Archived</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                This evaluation cycle has been fully validated and archived. Form is in read-only view mode and cannot be modified.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white uppercase tracking-wider shrink-0">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Workflow Stepper */}
      <WorkflowProgressBar 
        status={evalData.status} 
        workflowType={evalData.workflowType} 
        isDepartmentHead={evalData.isDepartmentHead || isUserDepartmentHead(currentUser)}
      />

      {/* Evaluation Progress Card */}
      <EvaluationProgressCard 
        evaluation={evalData} 
        allUsers={allUsers} 
        showActions={false} 
      />

      {/* Optional Timeline View */}
      {showTimeline && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <EvaluationTimeline evaluation={evalData} allUsers={allUsers} />
        </div>
      )}
      {/* Header Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {evalData.employeeName}
              </h2>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 uppercase">
                {evalData.departmentName}
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 uppercase">
                {evalData.workflowType.replace('WORKFLOW_', '')}
              </span>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {evalData.position}
              </p>
              <p className="font-normal text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-slate-900 dark:text-white">PERIOD:</strong> {evalData.appraisalPeriod}
              </p>
              <p className="font-normal text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-slate-900 dark:text-white">DATE:</strong> {evalData.appraisalDate}
              </p>
              <p className="font-normal text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-slate-900 dark:text-white">EVALUATION TITLE:</strong> {evaluationTitle}
              </p>
              <p className="font-normal text-slate-700 dark:text-slate-300">
                <strong className="font-bold text-slate-900 dark:text-white">EVALUATION TEMPLATE:</strong> {evaluationTemplateName}
              </p>
            </div>
          </div>

          {/* Computed Score Pill */}
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-750 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Performance Rating</p>
              <p className="text-2xl font-black text-hdi-red tracking-tight">
                {evalData.finalRating.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ 4.00</span>
              </p>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                {evalData.ratingClassification}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={onViewPrintable} 
              className="px-3.5 py-1.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white font-extrabold text-xs shadow-md shadow-orange-500/20 flex items-center space-x-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Scorecard PDF</span>
            </button>
            <button onClick={() => setShowEvidenceModal(true)} className="btn btn-secondary btn-sm">
              Evidence ({evalData.evidenceFiles.length})
            </button>
            <button onClick={() => setShowTimeline(!showTimeline)} className={`btn btn-sm ${showTimeline ? 'btn-primary' : 'btn-secondary'}`}>
              {showTimeline ? 'Hide Timeline' : 'View Timeline'}
            </button>
            <button onClick={() => setShowAuditModal(true)} className="btn btn-secondary btn-sm">
              Audit Trail
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && currentUser.role !== 'system_admin' && (
              <button onClick={handleSaveDraft} className="btn btn-secondary btn-sm">
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>
            )}

            {isSelfEval && (evalData.status === 'draft' || evalData.status === 'reopened') && (
              <button onClick={handleSubmitEmployee} className="btn btn-primary btn-sm">
                <Send className="w-3.5 h-3.5" />
                Submit Evaluation
              </button>
            )}

            {(currentRole === 'dept_head' || currentRole === 'supervisor' || (Boolean(currentUser.isDepartmentHead) && currentRole !== 'pod')) && 
             (evalData.status === 'pending_dept_head' || evalData.status === 'pending_supervisor' || evalData.status === 'employee_submitted') && (
              <button onClick={handleFinalizeSupervisor} className="btn btn-success btn-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submit to POD
              </button>
            )}

            {currentRole === 'president' && (evalData.status === 'pending_president' || evalData.status === 'department_head_submitted') && (
              <button onClick={handleFinalizePresident} className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white">
                <Crown className="w-3.5 h-3.5" />
                Approve & Submit to POD
              </button>
            )}

            {(currentRole === 'pod' || currentRole === 'hr_admin' || currentRole === 'system_admin') && !isSelfEval && 
             (evalData.status === 'pending_pod' || evalData.status === 'supervisor_completed' || evalData.status === 'president_completed' || evalData.status === 'department_head_submitted') && (
              <button onClick={handleValidatePOD} className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white">
                <ShieldCheck className="w-3.5 h-3.5" />
                Validate & Archive
              </button>
            )}

            {!isReadOnly && currentRole !== 'employee' && evalData.status !== 'draft' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="btn btn-sm bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return for Revision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Numbered Tab Stepper */}
      {(() => {
        const tabs = [
          { id: 'part1a' as const, step: 1, label: `1. KPI Evaluation (${eligibilityWeight}%)`, sub: 'Performance indicators' },
          { id: 'part1b' as const, step: 2, label: `2. Core Values (${coreValuesWeight}%)`, sub: 'Suitability factors' },
          { id: 'part2' as const, step: 3, label: '3. Development Plan', sub: 'Employee Self Section' },
          { id: 'part3' as const, step: 4, label: '4. Personnel Action', sub: 'Dept Head / President' },
          { id: 'part4' as const, step: 5, label: '5. POD Evaluation', sub: 'POD / HR Section' },
          { id: 'signatures' as const, step: 6, label: '6. Digital Signatures', sub: 'Verification & Audit' },
        ];
        return (
          <div className="flex overflow-x-auto gap-1 pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm transition-all shrink-0 ${
                     isActive
                       ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                   }`}
                 >
                   <span>{tab.label}</span>
                 </button>
              );
            })}
          </div>
        );
      })()}

      {/* SECTION CONTENT */}

      {/* PART 1A: KPI EVALUATION */}
      {activeTab === 'part1a' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                PART 1A: EVALUATION ON ELIGIBILITY FACTORS (KPIs - {eligibilityWeight}%)
              </h3>
              <p className="text-xs text-slate-500">
                Scale: 4 = Exceeds Expectations, 3 = Meets Expectations, 2 = Barely Meets, 1 = Did Not Meet
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase">Part 1A Score:</span>
              <span className="ml-2 text-xl font-black text-brand-600 dark:text-brand-400">
                {evalData.eligibilityScore.toFixed(2)}
              </span>
            </div>
          </div>

          {Array.from(krasMap.entries()).map(([kraName, kpis]) => {
            const kraWeightTotal = kpis.reduce((acc, k) => acc + k.weightPercent, 0);
            const kraWeightedScore = kpis.reduce((acc, k) => acc + k.weightedScore, 0).toFixed(2);

            return (
              <div key={kraName} className="border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                    {kraName}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Weight: {kraWeightTotal}%</span>
                    <span className="text-brand-700 dark:text-brand-300">Category Score: {kraWeightedScore}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700/80">
                  {kpis.map((kpi) => {
                    const latestRating = getLatestAdjustedRating(kpi);
                    const isSupervisorAdjusted = kpi.supervisorRating > 0 && kpi.selfRating > 0 && kpi.supervisorRating !== kpi.selfRating;
                    const podValue = kpi.presidentRating || kpi.podRating || 0;
                    const prevRatingBeforePod = kpi.supervisorRating || kpi.selfRating || 0;
                    const isPodAdjusted = podValue > 0 && prevRatingBeforePod > 0 && podValue !== prevRatingBeforePod;

                    const formatRatingText = (rating?: number): string => {
                      if (!rating || rating <= 0) return '—';
                      switch (rating) {
                        case 4: return '4 - Exceeds';
                        case 3: return '3 - Meets';
                        case 2: return '2 - Barely';
                        case 1: return '1 - Not Met';
                        default: return `${rating}.00`;
                      }
                    };

                    return (
                      <div key={kpi.kpiId} className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                          
                          {/* Column 1: KPI Details & Standards (lg:col-span-4) */}
                          <div className="lg:col-span-4 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{kpi.name}</p>
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Weight: {kpi.weightPercent}%
                              </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                              {kpi.standards.map((st: RatingStandard) => (
                                <div
                                  key={st.rating}
                                  className={`p-1 rounded text-[11px] ${
                                    latestRating === st.rating
                                      ? 'bg-brand-100 dark:bg-brand-950 font-bold text-brand-800 dark:text-brand-300 border border-brand-300 dark:border-brand-800'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  <strong>{st.rating}</strong>: {st.description}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Column 2: Rating Adjustment Workflow Pipeline (lg:col-span-5) */}
                          <div className="lg:col-span-5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                Rating Adjustment Pipeline
                              </span>
                              <span className="text-slate-600 dark:text-slate-300 text-xs">
                                Weighted Score: <strong className="text-brand-600 dark:text-brand-400 text-sm font-black">{kpi.weightedScore.toFixed(2)}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                              {/* Step 1: Initial (Self) */}
                              <div className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                canEditEmployeeSection
                                  ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 ring-1 ring-brand-500/30'
                                  : kpi.selfRating > 0
                                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30 text-slate-400'
                              }`}>
                                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                  1. Initial (Self)
                                </div>
                                {canEditEmployeeSection ? (
                                  <select
                                    value={kpi.selfRating || 0}
                                    onChange={(e) => handleRatingChange(kpi.kpiId, 'self', Number(e.target.value))}
                                    className="w-full px-1 py-1 rounded border border-brand-400 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-900 dark:text-white"
                                  >
                                    <option value={0}>Select...</option>
                                    <option value={4}>4 - Exceeds</option>
                                    <option value={3}>3 - Meets</option>
                                    <option value={2}>2 - Barely</option>
                                    <option value={1}>1 - Not Met</option>
                                  </select>
                                ) : (
                                  <div className="font-bold text-[11px] truncate">
                                    {kpi.selfRating > 0 ? formatRatingText(kpi.selfRating) : <span className="italic text-slate-400">None</span>}
                                  </div>
                                )}
                              </div>

                              {/* Step 2: Supervisor / IS Adjustment */}
                              <div className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                canEditDeptHeadSection
                                  ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500/30'
                                  : kpi.supervisorRating > 0
                                    ? 'border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30 text-slate-400'
                              }`}>
                                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                                  <span>2. IS Adjust</span>
                                  {isSupervisorAdjusted && (
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold">
                                      Adj
                                    </span>
                                  )}
                                </div>
                                {canEditDeptHeadSection ? (
                                  <select
                                    value={kpi.supervisorRating || 0}
                                    onChange={(e) => handleRatingChange(kpi.kpiId, 'supervisor', Number(e.target.value))}
                                    className="w-full px-1 py-1 rounded border border-purple-400 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-900 dark:text-white"
                                  >
                                    <option value={0}>Adjust...</option>
                                    <option value={4}>4 - Exceeds</option>
                                    <option value={3}>3 - Meets</option>
                                    <option value={2}>2 - Barely</option>
                                    <option value={1}>1 - Not Met</option>
                                  </select>
                                ) : (
                                  <div className="font-bold text-[11px] truncate">
                                    {kpi.supervisorRating > 0 ? (
                                      formatRatingText(kpi.supervisorRating)
                                    ) : (
                                      <span className="italic text-slate-400">—</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Step 3: POD / President Final Adjustment */}
                              <div className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                (canEditPresidentSection || canEditPODSection)
                                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/30'
                                  : podValue > 0
                                    ? 'border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30 text-slate-400'
                              }`}>
                                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                                  <span>3. POD Adjust</span>
                                  {isPodAdjusted && (
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold">
                                      Adj
                                    </span>
                                  )}
                                </div>
                                {(canEditPresidentSection || canEditPODSection) ? (
                                  <select
                                    value={podValue}
                                    onChange={(e) => handleRatingChange(kpi.kpiId, canEditPresidentSection ? 'president' : 'pod', Number(e.target.value))}
                                    className="w-full px-1 py-1 rounded border border-amber-400 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-900 dark:text-white"
                                  >
                                    <option value={0}>Adjust...</option>
                                    <option value={4}>4 - Exceeds</option>
                                    <option value={3}>3 - Meets</option>
                                    <option value={2}>2 - Barely</option>
                                    <option value={1}>1 - Not Met</option>
                                  </select>
                                ) : (
                                  <div className="font-bold text-[11px] truncate">
                                    {podValue > 0 ? (
                                      formatRatingText(podValue)
                                    ) : (
                                      <span className="italic text-slate-400">—</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Step 4: Final Effective Rating */}
                              <div className="p-2 rounded-lg border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 text-xs flex flex-col justify-between">
                                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                                  Final Rating
                                </div>
                                <div className="font-black text-[11px] text-emerald-800 dark:text-emerald-200 truncate">
                                  {latestRating > 0 ? formatRatingText(latestRating) : <span className="italic text-slate-400">Pending</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 3: Comments / STAR Evidence (lg:col-span-3) */}
                          <div className="lg:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">
                              Comments / STAR Evidence
                            </label>
                            <textarea
                              rows={3}
                              value={kpi.comments}
                              disabled={!canEditEmployeeSection && !canEditDeptHeadSection && !canEditPresidentSection && !canEditPODSection}
                              onChange={(e) => handleKPICommentChange(kpi.kpiId, e.target.value)}
                              placeholder="Specific evidence details..."
                              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                            />
                          </div>

                        </div>

                        {/* Rating Adjustment History Audit Sub-row */}
                        {Array.isArray(kpi.ratingHistory) && kpi.ratingHistory.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400">Adjustment History:</span>
                            {kpi.ratingHistory.map((adj: RatingAdjustment, hIdx: number) => (
                              <span key={hIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                <strong className="capitalize">{adj.role}</strong> ({adj.adjustedBy}): {adj.previousRating || 0} ➔ <strong className="text-brand-600 dark:text-brand-400">{adj.newRating}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PART 1B: CORE VALUES / SUITABILITY FACTORS */}
      {activeTab === 'part1b' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                PART 1B: EVALUATION ON SUITABILITY FACTORS (CORE VALUES - {coreValuesWeight}%)
              </h3>
              <p className="text-xs text-slate-500">
                Integrity, Respect, Accountability, Innovation, Customer Focus, Teamwork, Leadership
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase">Core Values Score:</span>
              <span className="ml-2 text-xl font-black text-brand-600 dark:text-brand-400">
                {evalData.totalCoreValuesWeightedRating.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {effectiveCoreValueRatings.map((cv) => (
              <div key={cv.coreValueId} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cv.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{cv.description}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-brand-600 dark:text-brand-400">
                     Weighted Score: {cv.weightedScore.toFixed(2)} ({((cv as any).weightPercent ?? (coreValuesWeight / (effectiveCoreValueRatings.length || 4))).toFixed(2)}%)
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">POD Rating (1-4)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={cv.podRating}
                      disabled={!canEditPODSection}
                      onChange={(e) => handleCoreValueRatingChange(cv.coreValueId, 'podRating', Number(e.target.value))}
                      className={`w-full px-3 py-1.5 rounded-lg border text-sm font-bold text-center ${
                        canEditPODSection ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20' : 'border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Peer Rating (1-4)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={cv.peerRating}
                      disabled={!canEditPODSection}
                      onChange={(e) => handleCoreValueRatingChange(cv.coreValueId, 'peerRating', Number(e.target.value))}
                      className={`w-full px-3 py-1.5 rounded-lg border text-sm font-bold text-center ${
                        canEditPODSection ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Supervisor / President</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={cv.isRating}
                      disabled={!canEditDeptHeadSection && !canEditPresidentSection}
                      onChange={(e) => handleCoreValueRatingChange(cv.coreValueId, 'isRating', Number(e.target.value))}
                      className={`w-full px-3 py-1.5 rounded-lg border text-sm font-bold text-center ${
                        canEditDeptHeadSection || canEditPresidentSection ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20' : 'border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Core Values Practice Comments</label>
                  <textarea
                    rows={2}
                    value={cv.comments}
                    disabled={!canEditEmployeeSection && !canEditPODSection}
                    onChange={(e) => {
                      const updated = evalData.coreValueRatings.map((c) => 
                        c.coreValueId === cv.coreValueId ? { ...c, comments: e.target.value } : c
                      );
                      setEvalData({ ...evalData, coreValueRatings: updated });
                    }}
                    placeholder="Mandatory narrative comments on core values..."
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PART 2: EMPLOYEE SELF EVALUATION & DEVELOPMENT PLAN */}
      {activeTab === 'part2' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                SECTION 1: EMPLOYEE SELF EVALUATION & DEVELOPMENT PLAN
              </h3>
              {!canEditEmployeeSection && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
                  Locked (Read-Only)
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  1. Key Strengths
                </label>
                <textarea
                  rows={3}
                  value={evalData.developmentPlan.strengths}
                  disabled={!canEditEmployeeSection}
                  onChange={(e) => setEvalData({
                    ...evalData,
                    developmentPlan: { ...evalData.developmentPlan, strengths: e.target.value }
                  })}
                  placeholder="Highlight key accomplishments and professional strengths..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  2. Areas for Improvement
                </label>
                <textarea
                  rows={3}
                  value={evalData.developmentPlan.areasForImprovement}
                  disabled={!canEditEmployeeSection}
                  onChange={(e) => setEvalData({
                    ...evalData,
                    developmentPlan: { ...evalData.developmentPlan, areasForImprovement: e.target.value }
                  })}
                  placeholder="Identify skills to develop and areas for improvement..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  3. Employee Remarks / Appraisee Summary Comment
                </label>
                <textarea
                  rows={2}
                  value={evalData.appraiseeSummaryComment || ''}
                  disabled={!canEditEmployeeSection}
                  onChange={(e) => setEvalData({
                    ...evalData,
                    appraiseeSummaryComment: e.target.value
                  })}
                  placeholder="Overall appraisee summary remarks..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PART 3: DEPARTMENT HEAD & PRESIDENT EVALUATION */}
      {activeTab === 'part3' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              SECTION 2 & 3: DEPARTMENT HEAD & PRESIDENT EVALUATION
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-1">
                Department Head / Immediate Superior Summary Remarks
              </label>
              <textarea
                rows={3}
                value={evalData.supervisorSummaryComment || ''}
                disabled={!canEditDeptHeadSection}
                onChange={(e) => setEvalData({ ...evalData, supervisorSummaryComment: e.target.value })}
                placeholder="Department Head evaluation remarks & performance summary..."
                className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {(evalData.workflowType === 'WORKFLOW_DEPT_HEAD' || evalData.isDepartmentHead || canEditPresidentSection || evalData.signatures.president) && (
              <div>
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">
                  President & CEO Executive Review Comments
                </label>
                <textarea
                  rows={3}
                  value={evalData.presidentSummaryComment || ''}
                  disabled={!canEditPresidentSection}
                  onChange={(e) => setEvalData({ ...evalData, presidentSummaryComment: e.target.value })}
                  placeholder="President executive remarks & recommendations for Department Head..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 mb-3">
                Personnel Action Recommendation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { type: 'promotion', label: 'Promotion Recommended', desc: 'Advancement to higher position' },
                  { type: 'salary_adjustment', label: 'Salary Adjustment', desc: 'Merit-based annual increase' },
                  { type: 'regularization', label: 'Regularization', desc: 'Confirm permanent status' },
                  { type: 'transfer', label: 'Transfer', desc: 'Reassignment to another unit' },
                  { type: 'pip', label: 'Performance/ Values Improvement Plan ( PIP/VIP)', desc: 'Required for NI/Satisfactory rating' },
                  { type: 'termination', label: 'Termination', desc: 'Separation of employment' },
                  { type: 'no_action', label: 'No Action Required', desc: 'Maintain current status' },
                ].map((item) => (
                  <label
                    key={item.type}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                      evalData.personnelAction.actionType === item.type
                        ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 dark:border-purple-600 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="personnelActionType"
                      checked={evalData.personnelAction.actionType === item.type}
                      disabled={!canEditDeptHeadSection && !canEditPresidentSection}
                      onChange={() => setEvalData({
                        ...evalData,
                        personnelAction: { ...evalData.personnelAction, actionType: item.type as ActionType }
                      })}
                      className="mt-1 text-purple-600"
                    />
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PART 4: POD / HR EVALUATION SECTION */}
      {activeTab === 'part4' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                SECTION 4: DEDICATED POD / HR EVALUATION & VALIDATION
              </h3>
              <p className="text-xs text-slate-500">
                To be accomplished by People Operations Development (POD)
              </p>
            </div>
            {!canEditPODSection && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
                Read-Only
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <h4 className="font-bold text-xs uppercase text-indigo-900 dark:text-indigo-200">
                POD Suitability & Quality Validation
              </h4>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Overall Core Values Weighted Rating: <strong>{evalData.totalCoreValuesWeightedRating.toFixed(2)}</strong> / {coreValuesWeight.toFixed(2)}%
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  POD Quality Audit & Validation Comments
                </label>
                <textarea
                  rows={3}
                  value={evalData.podValidationComment || ''}
                  disabled={!canEditPODSection}
                  onChange={(e) => setEvalData({ ...evalData, podValidationComment: e.target.value })}
                  placeholder="Enter POD validation notes, quality checks, and final approval remarks..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Personnel Action HR Enforcement</p>
                <p className="text-xs text-slate-500">Confirm and validate personnel recommendation for HR processing.</p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(evalData.personnelAction?.isApproved)}
                  disabled={!canEditPODSection}
                  onChange={(e) => setEvalData({
                    ...evalData,
                    personnelAction: { ...evalData.personnelAction, isApproved: e.target.checked }
                  })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Approved by HR</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURES TAB */}
      {activeTab === 'signatures' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                SECTION 5: DIGITAL SIGNATURES & AUDIT VERIFICATION
              </h3>
              <p className="text-xs text-slate-500">
                Timestamped digital signatures for each evaluation stage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Employee Signature Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">1. Employee Signature</span>
                {evalData.signatures.employee && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Signed</span>
                )}
              </div>
              {evalData.signatures.employee ? (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <img src={evalData.signatures.employee.signatureDataUrl} alt="Employee Sig" className="h-10 mx-auto object-contain" />
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-1">
                    {evalData.signatures.employee.signerName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">{evalData.signatures.employee.position || evalData.position}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{evalData.signatures.employee.department || evalData.departmentName}</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-1">
                    {evalData.signatures.employee.dateSigned || evalData.signatures.employee.signedAt} {evalData.signatures.employee.timeSigned || ''}
                  </p>
                </div>
              ) : canEditEmployeeSection ? (
                <button
                  onClick={() => { setSigRole('employee'); setShowSigModal(true); }}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm"
                >
                  Sign as Employee
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-400 italic">
                  Pending Employee Signature
                </div>
              )}
            </div>

            {/* Department Head Signature Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">2. Department Head</span>
                {(evalData.signatures.deptHead || evalData.signatures.supervisor) && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Signed</span>
                )}
              </div>
              {(evalData.signatures.deptHead || evalData.signatures.supervisor) ? (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <img src={(evalData.signatures.deptHead || evalData.signatures.supervisor)?.signatureDataUrl} alt="DH Sig" className="h-10 mx-auto object-contain" />
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-1">
                    {(evalData.signatures.deptHead || evalData.signatures.supervisor)?.signerName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">{(evalData.signatures.deptHead || evalData.signatures.supervisor)?.position || 'Department Head'}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{(evalData.signatures.deptHead || evalData.signatures.supervisor)?.department || evalData.departmentName}</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-1">
                    {(evalData.signatures.deptHead || evalData.signatures.supervisor)?.dateSigned || (evalData.signatures.deptHead || evalData.signatures.supervisor)?.signedAt} {(evalData.signatures.deptHead || evalData.signatures.supervisor)?.timeSigned || ''}
                  </p>
                </div>
              ) : canEditDeptHeadSection ? (
                <button
                  onClick={() => { setSigRole('dept_head'); setShowSigModal(true); }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm"
                >
                  Sign as Department Head
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-400 italic">
                  Pending Department Head Signature
                </div>
              )}
            </div>

            {/* President Signature Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">3. President & CEO</span>
                {evalData.signatures.president && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Signed</span>
                )}
              </div>
              {evalData.signatures.president ? (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <img src={evalData.signatures.president.signatureDataUrl} alt="President Sig" className="h-10 mx-auto object-contain" />
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-1">
                    {evalData.signatures.president.signerName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">{evalData.signatures.president.position || 'President & CEO'}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Executive Office</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-1">
                    {evalData.signatures.president.dateSigned || evalData.signatures.president.signedAt} {evalData.signatures.president.timeSigned || ''}
                  </p>
                </div>
              ) : canEditPresidentSection ? (
                <button
                  onClick={() => { setSigRole('president'); setShowSigModal(true); }}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                >
                  Sign as President
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-400 italic">
                  {evalData.workflowType === 'WORKFLOW_DEPT_HEAD' || evalData.isDepartmentHead ? 'Pending President Signature' : 'N/A (Regular Track)'}
                </div>
              )}
            </div>

            {/* POD / HR Signature Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">4. POD / HR Officer</span>
                {(evalData.signatures.pod || evalData.signatures.hr) && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Signed</span>
                )}
              </div>
              {(evalData.signatures.pod || evalData.signatures.hr) ? (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <img src={(evalData.signatures.pod || evalData.signatures.hr)?.signatureDataUrl} alt="POD Sig" className="h-10 mx-auto object-contain" />
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-1">
                    {(evalData.signatures.pod || evalData.signatures.hr)?.signerName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">{(evalData.signatures.pod || evalData.signatures.hr)?.position || 'POD Quality Lead'}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">People Operations Dev</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-1">
                    {(evalData.signatures.pod || evalData.signatures.hr)?.dateSigned || (evalData.signatures.pod || evalData.signatures.hr)?.signedAt} {(evalData.signatures.pod || evalData.signatures.hr)?.timeSigned || ''}
                  </p>
                </div>
              ) : canEditPODSection ? (
                <button
                  onClick={() => { setSigRole('pod'); setShowSigModal(true); }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
                >
                  Sign as POD Officer
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-400 italic">
                  Pending POD Signature
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Private Evaluation Activity History Timeline */}
      {canViewActivityHistory && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Evaluation Activity History
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Private chronological audit trail from assignment to completion
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Private Audit Trail ({evalData.auditTrail?.length || 0} events)
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6 my-2 pt-1">
            {(!evalData.auditTrail || evalData.auditTrail.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
            ) : (
              evalData.auditTrail.map((entry, idx) => (
                <div key={entry.id || idx} className="relative group">
                  {/* Timeline Node Bullet */}
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
                    ✓
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {entry.timestamp || 'Just now'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <strong>{entry.performedBy}</strong> {entry.performedByRole ? `(${entry.performedByRole})` : ''} {entry.actionPerformed}
                    </p>

                    {entry.newStatus && entry.previousStatus && entry.newStatus !== entry.previousStatus && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5 pt-0.5">
                        <span>Status changed:</span>
                        <span className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800">
                          {entry.newStatus}
                        </span>
                      </div>
                    )}

                    {entry.remarks && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80 mt-1 max-w-2xl leading-relaxed">
                        "{entry.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={
          confirmAction === 'employee' ? 'Submit Evaluation?' :
          confirmAction === 'supervisor' ? 'Submit to POD?' :
          confirmAction === 'president' ? 'Approve & Submit to POD?' :
          'Validate & Archive?'
        }
        message={
          confirmAction === 'employee' ? `You are about to submit your evaluation to the next reviewer. This cannot be undone unless it is returned to you.` :
          confirmAction === 'supervisor' ? `You are about to finalize your supervisor review for ${evalData.employeeName} and forward it to the POD team.` :
          confirmAction === 'president' ? `You are about to complete your executive review and forward this evaluation to the POD team.` :
          `You are about to validate and permanently archive this evaluation. This action cannot be undone.`
        }
        confirmLabel={
          confirmAction === 'employee' ? 'Submit' :
          confirmAction === 'pod' ? 'Validate & Archive' : 'Confirm & Submit'
        }
        variant={confirmAction === 'pod' ? 'danger' : 'info'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Modals */}
      <SignatureModal
        isOpen={showSigModal}
        onClose={() => setShowSigModal(false)}
        onSaveSignature={handleSaveSignature}
        role={sigRole}
        signerDefaultName={currentUser.name}
        signerPosition={currentUser.position || ''}
        signerDepartment={currentUser.departmentName || ''}
        employeeId={currentUser.employeeNumber || currentUser.id || ''}
      />

      <EvidenceUploadModal
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        onUploadFile={handleUploadEvidence}
        onRemoveFile={handleRemoveEvidence}
        existingFiles={evalData.evidenceFiles}
        onUploadFileToStorage={async (file) => {
          try {
            const url = await uploadFileToSupabaseStorage('apes-attachments', file.name, file);
            return url;
          } catch (err) {
            console.warn('[Evidence Upload] Storage upload failed, keeping local metadata only:', err);
            return null;
          }
        }}
      />

      <WorkflowAuditTrailModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        auditTrail={evalData.auditTrail || []}
        employeeName={evalData.employeeName}
      />

      <ReturnRevisionModal
        isOpen={showReturnModal}
        evaluation={evalData}
        currentUser={currentUser}
        onClose={() => setShowReturnModal(false)}
        onConfirmReturn={handleConfirmReturn}
      />

      {/* Archiving Loading Backdrop */}
      {isArchiving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm text-white space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 border-4 border-white/20 border-t-[#F28C28] rounded-full animate-spin" />
          <div className="text-center">
            <h3 className="font-bold text-lg">Archiving Performance Evaluation</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              Generating official scoreboard PDF, uploading attachments to storage, and storing permanent history records...
            </p>
          </div>
        </div>
      )}

      {/* Archiving Transaction Failure Modal */}
      {archiveFailure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-red-200 dark:border-red-900">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Evaluation Archive Transaction Failed</h3>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{archiveFailure.failedStep}</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl text-xs text-red-800 dark:text-red-200 font-mono">
              {archiveFailure.error || 'The evaluation remains available in its previous state. No evaluation data was lost.'}
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Detailed Step Breakdown:</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between">
                  <span>Data Integrity & Validation</span>
                  <span className={archiveFailure.stepResults.dataValidated ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {archiveFailure.stepResults.dataValidated ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Evidence Files Storage</span>
                  <span className={archiveFailure.stepResults.evidenceUploaded ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {archiveFailure.stepResults.evidenceUploaded ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Digital Signatures Storage</span>
                  <span className={archiveFailure.stepResults.signaturesUploaded ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {archiveFailure.stepResults.signaturesUploaded ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Official Scoreboard PDF Storage</span>
                  <span className={archiveFailure.stepResults.pdfUploaded ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
                    {archiveFailure.stepResults.pdfUploaded ? "✓ PASSED" : "⚠ WARNING"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Evaluation History Snapshot (`evaluation_history`)</span>
                  <span className={archiveFailure.stepResults.historySaved ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {archiveFailure.stepResults.historySaved ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Scorecard Archive Record (`evaluation_scorecard_archives`)</span>
                  <span className={archiveFailure.stepResults.archiveSaved ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {archiveFailure.stepResults.archiveSaved ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setArchiveFailure(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all"
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
