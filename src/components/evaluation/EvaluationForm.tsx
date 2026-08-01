import React, { useState, useEffect } from 'react';
import { Evaluation, User, Role, DigitalSignature, EvidenceFile, PersonnelAction, ActionType } from '../../types';
import { 
  computeKPIWeightedScore, 
  computeEligibilityScore, 
  computeCoreValuesAverage, 
  computeCoreValuesWeightedScore, 
  computeFinalPerformanceRating, 
  getRatingClassification 
} from '../../services/computationEngine';
import { validateEvaluationForSubmission } from '../../services/validationService';
import { triggerWorkflowNotification } from '../../services/notificationService';
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
  onSave: (updatedEvaluation: Evaluation) => void;
  onViewPrintable: () => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  evaluation: initialEvaluation,
  currentUser,
  allUsers,
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

  useEffect(() => {
    setEvalData(initialEvaluation);
  }, [initialEvaluation]);

  const currentRole = currentUser.role;
  const isReadOnly = isEvaluationCompleted(evalData);
  const isSelfEval = currentUser.id === evalData.employeeId;

  // Strict Role-Based Section Locking Permissions
  const canEditEmployeeSection = !isReadOnly && isSelfEval && (evalData.status === 'draft' || evalData.status === 'reopened');

  const canEditDeptHeadSection = !isReadOnly && !isSelfEval && (
    evalData.status === 'pending_dept_head' ||
    evalData.status === 'employee_submitted' ||
    evalData.status === 'pending_supervisor'
  ) && (
    currentRole === 'dept_head' ||
    currentRole === 'supervisor' ||
    Boolean(currentUser.isDepartmentHead) ||
    currentUser.id === currentUser.departmentHeadId ||
    currentUser.departmentName === evalData.departmentName ||
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
    evalData.status === 'pending_pod'
  ) && (
    currentRole === 'pod' ||
    currentRole === 'hr_admin' ||
    currentRole === 'system_admin'
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

  const handleRatingChange = (kpiId: string, roleType: 'self' | 'supervisor' | 'president', ratingValue: number) => {
    const updatedKpis = evalData.kpiRatings.map((kpi) => {
      if (kpi.kpiId === kpiId) {
        const selfRating = roleType === 'self' ? ratingValue : kpi.selfRating;
        const supervisorRating = roleType === 'supervisor' ? ratingValue : kpi.supervisorRating;
        const presidentRating = roleType === 'president' ? ratingValue : kpi.presidentRating;
        
        const ratingToUse = presidentRating || supervisorRating || selfRating || 0;
        const weightedScore = computeKPIWeightedScore(kpi.weightPercent, ratingToUse);
        return {
          ...kpi,
          selfRating,
          supervisorRating,
          presidentRating,
          weightedScore,
        };
      }
      return kpi;
    });

    recalculateAndSetState(updatedKpis, evalData.coreValueRatings);
  };

  const handleKPICommentChange = (kpiId: string, comment: string) => {
    const updatedKpis = evalData.kpiRatings.map((kpi) => 
      kpi.kpiId === kpiId ? { ...kpi, comments: comment } : kpi
    );
    setEvalData({ ...evalData, kpiRatings: updatedKpis });
  };

  const handleCoreValueRatingChange = (cvId: string, field: 'podRating' | 'peerRating' | 'isRating', value: number) => {
    const updatedCVs = evalData.coreValueRatings.map((cv) => {
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
        const weightedScore = computeCoreValuesWeightedScore(avgRating, 15);
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

    recalculateAndSetState(evalData.kpiRatings, updatedCVs);
  };

  const recalculateAndSetState = (kpiRatings = evalData.kpiRatings, coreValueRatings = evalData.coreValueRatings) => {
    const eligibilityScore = computeEligibilityScore(kpiRatings);
    const coreValuesAvg = computeCoreValuesAverage(coreValueRatings);
    const coreValuesWeightedScore = computeCoreValuesWeightedScore(coreValuesAvg, 15);
    const finalRating = computeFinalPerformanceRating(eligibilityScore, coreValuesWeightedScore);
    const classification = getRatingClassification(finalRating);

    setEvalData({
      ...evalData,
      kpiRatings,
      coreValueRatings,
      eligibilityScore,
      coreValuesScore: coreValuesAvg,
      totalEligibilityWeightedRating: eligibilityScore,
      totalCoreValuesWeightedRating: coreValuesWeightedScore,
      finalRating,
      ratingClassification: classification.label,
      updatedAt: new Date().toISOString()
    });
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
    onSave(evalData);
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
    const validation = validateEvaluationForSubmission(evalData, currentUser, allUsers);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
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

    const updated: Evaluation = {
      ...evalData,
      status: 'pending_pod' as const,
      auditTrail: updatedAudit,
      updatedAt: new Date().toISOString()
    };

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
    const podUser = allUsers.find(u => u.role === 'pod' || u.id === 'usr_dh_pohr') || { id: 'usr_dh_pohr', name: 'Malene Pellazo' };
    const assignedTo = `${podUser.name} (Department Head - People Operations / POD)`;

    const updatedAudit = addAuditEntry('President Executive Review Completed', evalData.status, 'pending_pod', assignedTo);

    const updated: Evaluation = {
      ...evalData,
      status: 'pending_pod' as const,
      auditTrail: updatedAudit,
      updatedAt: new Date().toISOString()
    };

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
    const newSigs = { ...evalData.signatures, [signature.role]: signature };
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

  const krasMap = new Map<string, typeof evalData.kpiRatings>();
  evalData.kpiRatings.forEach((kpi) => {
    if (!krasMap.has(kpi.kraName)) {
      krasMap.set(kpi.kraName, []);
    }
    krasMap.get(kpi.kraName)!.push(kpi);
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
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                {evalData.workflowType.replace('WORKFLOW_', '')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {evalData.position} • Period: <strong className="text-slate-800 dark:text-slate-200">{evalData.appraisalPeriod}</strong> • Date: {evalData.appraisalDate}
            </p>
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
            <button onClick={onViewPrintable} className="btn btn-secondary btn-sm">
              <Printer className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button onClick={() => setShowEvidenceModal(true)} className="btn btn-secondary btn-sm">
              <Paperclip className="w-3.5 h-3.5 text-brand-500" />
              Evidence ({evalData.evidenceFiles.length})
            </button>
            <button onClick={() => setShowTimeline(!showTimeline)} className={`btn btn-sm ${showTimeline ? 'btn-primary' : 'btn-secondary'}`}>
              <History className="w-3.5 h-3.5 text-brand-500" />
              {showTimeline ? 'Hide Timeline' : 'View Timeline'}
            </button>
            <button onClick={() => setShowAuditModal(true)} className="btn btn-secondary btn-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Audit Trail
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <button onClick={handleSaveDraft} className="btn btn-secondary btn-sm">
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>
            )}

            {(currentRole === 'employee' || currentRole === 'dept_head') && (evalData.status === 'draft' || evalData.status === 'reopened') && (
              <button onClick={handleSubmitEmployee} className="btn btn-primary btn-sm">
                <Send className="w-3.5 h-3.5" />
                Submit Evaluation
              </button>
            )}

            {(currentRole === 'dept_head' || currentRole === 'supervisor' || currentUser.isDepartmentHead) && 
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

            {currentRole === 'pod' && (
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
      {/* Numbered Tab Stepper */}
      {(() => {
        const tabs = [
          { id: 'part1a' as const, step: 1, label: '1. KPI Evaluation (85%)', sub: 'Performance indicators' },
          { id: 'part1b' as const, step: 2, label: '2. Core Values (15%)', sub: 'Suitability factors' },
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shrink-0 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{tab.step}</span>
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
                PART 1A: EVALUATION ON ELIGIBILITY FACTORS (KPIs - 85%)
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
              <div key={kraName} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 dark:bg-slate-750 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                    {kraName}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="text-slate-500">Weight: {kraWeightTotal}%</span>
                    <span className="text-brand-700 dark:text-brand-300">Category Score: {kraWeightedScore}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {kpis.map((kpi) => (
                    <div key={kpi.kpiId} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        
                        <div className="lg:col-span-5 space-y-1.5">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{kpi.name}</p>
                          <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                            {kpi.standards.map((st) => (
                              <div
                                key={st.rating}
                                className={`p-1 rounded text-[11px] ${
                                  (kpi.presidentRating || kpi.supervisorRating || kpi.selfRating) === st.rating
                                    ? 'bg-brand-100 dark:bg-brand-950 font-bold text-brand-800 dark:text-brand-300 border border-brand-300'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <strong>{st.rating}</strong>: {st.description}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-4 space-y-3">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500">Weight: <strong>{kpi.weightPercent}%</strong></span>
                            <span className="text-slate-500">Score: <strong className="text-brand-600 text-sm font-bold">{kpi.weightedScore.toFixed(2)}</strong></span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Self Rating</p>
                              <select
                                value={kpi.selfRating || 0}
                                disabled={!canEditEmployeeSection}
                                onChange={(e) => handleRatingChange(kpi.kpiId, 'self', Number(e.target.value))}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                  canEditEmployeeSection
                                    ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <option value={0}>Select...</option>
                                <option value={4}>4 - Exceeds</option>
                                <option value={3}>3 - Meets</option>
                                <option value={2}>2 - Barely Meets</option>
                                <option value={1}>1 - Did Not Meet</option>
                              </select>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">IS Rating</p>
                              <select
                                value={kpi.supervisorRating || 0}
                                disabled={!canEditDeptHeadSection}
                                onChange={(e) => handleRatingChange(kpi.kpiId, 'supervisor', Number(e.target.value))}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                  canEditDeptHeadSection 
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20' 
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <option value={0}>Select...</option>
                                <option value={4}>4 - Exceeds</option>
                                <option value={3}>3 - Meets</option>
                                <option value={2}>2 - Barely Meets</option>
                                <option value={1}>1 - Did Not Meet</option>
                              </select>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">President</p>
                              <select
                                value={kpi.presidentRating || 0}
                                disabled={!canEditPresidentSection}
                                onChange={(e) => handleRatingChange(kpi.kpiId, 'president', Number(e.target.value))}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                  canEditPresidentSection
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 ring-2 ring-amber-500/20'
                                    : 'border-slate-300 dark:border-slate-600 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <option value={0}>Select...</option>
                                <option value={4}>4 - Exceeds</option>
                                <option value={3}>3 - Meets</option>
                                <option value={2}>2 - Barely Meets</option>
                                <option value={1}>1 - Did Not Meet</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">
                            Comments / STAR Evidence
                          </label>
                          <textarea
                            rows={3}
                            value={kpi.comments}
                            disabled={!canEditEmployeeSection && !canEditDeptHeadSection && !canEditPresidentSection}
                            onChange={(e) => handleKPICommentChange(kpi.kpiId, e.target.value)}
                            placeholder="Specific evidence details..."
                            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                          />
                        </div>

                      </div>
                    </div>
                  ))}
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
                PART 1B: EVALUATION ON SUITABILITY FACTORS (CORE VALUES - 15%)
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
            {evalData.coreValueRatings.map((cv) => (
              <div key={cv.coreValueId} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cv.name}</h4>
                    <p className="text-xs text-slate-500">{cv.description}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border text-xs font-bold text-brand-600">
                    Weighted Score: {cv.weightedScore.toFixed(2)} (15%)
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
                  { type: 'pip', label: 'Performance Improvement Plan (PIP)', desc: 'Required for NI/Satisfactory rating' },
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
                Overall Core Values Weighted Rating: <strong>{evalData.totalCoreValuesWeightedRating.toFixed(2)}</strong> / 15.00%
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

    </div>
  );
};
