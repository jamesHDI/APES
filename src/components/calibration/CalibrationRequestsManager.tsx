import React, { useState, useEffect } from "react";
import { CalibrationRequest, CalibrationStatus, Evaluation, KPIRating, User } from "../../types";
import { 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Sliders, 
  Sparkles, 
  Calculator, 
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { saveCalibrationRequestToSupabase, fetchCalibrationRequestsFromSupabase, saveEvaluationToSupabase } from "../../services/supabaseService";
import { getStoredEvaluations, saveSingleEvaluation } from "../../services/storage";
import { computeKPIWeightedScore, computeEligibilityScore, computeFinalPerformanceRating } from "../../services/computationEngine";
import confetti from "canvas-confetti";

const STATUS_LABELS: Record<CalibrationStatus, string> = {
  pending_dept_head: "Pending Dept Head Review",
  accepted: "Accepted by Dept Head",
  rejected: "Rejected",
  resubmitted_to_pod: "Resubmitted to POD",
  pod_approved: "POD Approved",
  pod_rejected: "POD Rejected",
  deployed: "Deployed",
};

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  pending_dept_head: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  resubmitted_to_pod: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  pod_approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pod_rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  deployed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

interface RebalanceKpiItem {
  id: string;
  kpiId: string;
  kraName: string;
  name: string;
  originalWeight: number;
  newWeight: number;
  isTarget: boolean;
}

interface CalibrationRequestsManagerProps {
  currentUser: User;
  evaluations?: Evaluation[];
  onUpdateEvaluation?: (updated: Evaluation) => void;
}

export const CalibrationRequestsManager: React.FC<CalibrationRequestsManagerProps> = ({ 
  currentUser, 
  evaluations = [], 
  onUpdateEvaluation 
}) => {
  const [requests, setRequests] = useState<CalibrationRequest[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  // Interactive Rebalance Modal State
  const [rebalanceModalReq, setRebalanceModalReq] = useState<CalibrationRequest | null>(null);
  const [targetEvaluation, setTargetEvaluation] = useState<Evaluation | null>(null);
  const [rebalanceKpis, setRebalanceKpis] = useState<RebalanceKpiItem[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  const isDeptHead = currentUser.role === "dept_head";
  const isPOD = currentUser.role === "pod" || currentUser.role === "hr_admin" || currentUser.role === "system_admin";

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    const all = await fetchCalibrationRequestsFromSupabase();
    if (!all) return;
    if (isDeptHead) {
      setRequests(all.filter(r =>
        r.departmentId === currentUser.departmentId ||
        r.departmentName?.toLowerCase() === currentUser.departmentName?.toLowerCase()
      ));
    } else if (isPOD) {
      setRequests(all.filter(r => ["accepted", "resubmitted_to_pod", "deployed", "pod_approved"].includes(r.status)));
    } else {
      setRequests(all);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDeptHeadAction = async (req: CalibrationRequest, decision: "accepted" | "rejected") => {
    const updated: CalibrationRequest = {
      ...req,
      status: decision === "accepted" ? "accepted" : "rejected",
      deptHeadDecision: decision,
      deptHeadRemark: remarks[req.id] || undefined,
      deptHeadReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveCalibrationRequestToSupabase(updated);
    if (saved) {
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
      showToast(`Request ${decision === "accepted" ? "accepted" : "rejected"} successfully.`);
    } else {
      showToast("Failed to update request. Please try again.");
    }
  };

  const handleDeptHeadResubmit = async (req: CalibrationRequest) => {
    const updated: CalibrationRequest = {
      ...req,
      status: "resubmitted_to_pod",
      deptHeadRemark: remarks[req.id] || req.deptHeadRemark,
      deptHeadReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveCalibrationRequestToSupabase(updated);
    if (saved) {
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
      showToast("Request resubmitted to POD for final approval.");
    } else {
      showToast("Failed to resubmit. Please try again.");
    }
  };

  // Open Rebalance Modal for POD
  const openRebalanceModal = (req: CalibrationRequest) => {
    const allEvals = evaluations.length > 0 ? evaluations : getStoredEvaluations();
    const targetEval = allEvals.find(e => 
      e.id === req.evaluationId || 
      e.employeeId === req.employeeId || 
      (e.employeeName && req.employeeName && e.employeeName.toLowerCase() === req.employeeName.toLowerCase())
    );

    if (!targetEval || !targetEval.kpiRatings || targetEval.kpiRatings.length === 0) {
      showToast("Could not locate active evaluation form KPIs for this employee.");
      return;
    }

    setTargetEvaluation(targetEval);

    // Extract requested target weight number if specified
    const numericMatch = req.requestedValue.match(/(\d+(\.\d+)?)/);
    const parsedRequestedWeight = numericMatch ? parseFloat(numericMatch[0]) : null;

    // Check if requested component matches a specific KPI
    const kpis: RebalanceKpiItem[] = targetEval.kpiRatings.map((kpi, idx) => {
      const isTarget = Boolean(
        (req.requestedComponent && req.requestedComponent.toLowerCase().includes(kpi.name.toLowerCase())) ||
        (req.requestedComponent && req.requestedComponent.toLowerCase().includes((kpi.kraName || '').toLowerCase())) ||
        (idx === 0 && (!req.requestedComponent || !req.requestedComponent.toLowerCase().startsWith('kpi:')))
      );

      const targetWeight = (isTarget && parsedRequestedWeight !== null) ? parsedRequestedWeight : kpi.weightPercent;

      return {
        id: kpi.kpiId || `kpi_${idx}`,
        kpiId: kpi.kpiId || kpi.name,
        kraName: kpi.kraName || 'GENERAL',
        name: kpi.name,
        originalWeight: kpi.weightPercent,
        newWeight: targetWeight,
        isTarget
      };
    });

    setRebalanceKpis(kpis);
    setRebalanceModalReq(req);
  };

  const handleKpiWeightChange = (index: number, val: number) => {
    setRebalanceKpis(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], newWeight: Math.max(0, Math.min(100, Number(val) || 0)) };
      return copy;
    });
  };

  // Auto-balance remaining non-target KPIs so sum equals target total (85%)
  const handleAutoBalance = () => {
    const targetTotal = Number(targetEvaluation?.formulaConfig?.eligibilityWeight ?? 85);
    const targetKpi = rebalanceKpis.find(k => k.isTarget);
    const targetWeight = targetKpi ? targetKpi.newWeight : 0;
    
    const otherKpis = rebalanceKpis.filter(k => !k.isTarget);
    if (otherKpis.length === 0) return;

    const remainingWeight = Math.max(0, targetTotal - targetWeight);
    const originalOtherSum = otherKpis.reduce((acc, k) => acc + k.originalWeight, 0) || 1;

    setRebalanceKpis(prev => prev.map(k => {
      if (k.isTarget) return k;
      const proportion = k.originalWeight / originalOtherSum;
      const balanced = Number((remainingWeight * proportion).toFixed(2));
      return { ...k, newWeight: balanced };
    }));
  };

  // Compute live total
  const currentTotalWeight = Number(rebalanceKpis.reduce((sum, k) => sum + (Number(k.newWeight) || 0), 0).toFixed(2));
  const targetTotalWeight = Number(targetEvaluation?.formulaConfig?.eligibilityWeight ?? 85);
  const isWeightBalanced = Math.abs(currentTotalWeight - targetTotalWeight) < 0.05;

  // Execute Automatic Calibration Form Deployment
  const handleDeployCalibration = async () => {
    if (!rebalanceModalReq || !targetEvaluation) return;
    if (!isWeightBalanced) {
      showToast(`Total weight must equal ${targetTotalWeight}% (Current: ${currentTotalWeight}%).`);
      return;
    }

    setIsDeploying(true);

    try {
      // 1. Update KPI ratings with newly calibrated weights and recalculate individual weighted scores
      const updatedKpiRatings: KPIRating[] = targetEvaluation.kpiRatings.map(kpi => {
        const matchingRebalance = rebalanceKpis.find(r => r.kpiId === kpi.kpiId || r.name === kpi.name);
        const newWeight = matchingRebalance ? matchingRebalance.newWeight : kpi.weightPercent;
        
        // Recalculate effective weighted score
        const effectiveRating = kpi.presidentRating || kpi.supervisorRating || kpi.selfRating || 0;
        const weightedScore = computeKPIWeightedScore(newWeight, effectiveRating);

        return {
          ...kpi,
          weightPercent: newWeight,
          weightedScore
        };
      });

      // 2. Recalculate overall evaluation scores
      const newEligibilityScore = computeEligibilityScore(updatedKpiRatings);
      const coreValuesWeight = Number(targetEvaluation.formulaConfig?.coreValuesWeight ?? 15);
      const totalCvScore = Number(targetEvaluation.totalCoreValuesWeightedRating || 0);
      const newFinalRating = computeFinalPerformanceRating(newEligibilityScore, totalCvScore);

      // 3. Add immutable audit trail entry
      const auditTrail = [
        ...(targetEvaluation.auditTrail || []),
        {
          id: `audit_cal_${Date.now()}`,
          timestamp: new Date().toISOString(),
          performedBy: currentUser.name,
          performedByRole: currentUser.role.toUpperCase(),
          assignedTo: targetEvaluation.employeeName,
          actionPerformed: 'Calibration Weights Deployed & Live Form Rebalanced',
          previousStatus: targetEvaluation.status,
          newStatus: targetEvaluation.status,
          remarks: `POD Approved Calibration for ${rebalanceModalReq.requestedComponent}: Weights adjusted and automatically deployed.`
        }
      ];

      const updatedEvaluation: Evaluation = {
        ...targetEvaluation,
        kpiRatings: updatedKpiRatings,
        eligibilityScore: newEligibilityScore,
        totalEligibilityWeightedRating: newEligibilityScore,
        finalRating: newFinalRating,
        auditTrail,
        updatedAt: new Date().toISOString()
      };

      // 4. Save updated evaluation to Supabase and Local Storage
      await saveSingleEvaluation(updatedEvaluation);
      onUpdateEvaluation?.(updatedEvaluation);

      // 5. Update Calibration Request status to 'deployed'
      const updatedReq: CalibrationRequest = {
        ...rebalanceModalReq,
        status: 'deployed',
        podDecision: 'approved',
        podRemark: remarks[rebalanceModalReq.id] || 'Calibration approved and automatically deployed to live evaluation form.',
        podReviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveCalibrationRequestToSupabase(updatedReq);
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));

      setIsDeploying(false);
      setRebalanceModalReq(null);

      confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      showToast(`Success! Calibration deployed and live form automatically rebalanced.`);
    } catch (err) {
      console.error("Error deploying calibration:", err);
      setIsDeploying(false);
      showToast("An error occurred while deploying calibration. Please try again.");
    }
  };

  const filteredRequests = isDeptHead
    ? requests.filter(r => r.status === "pending_dept_head")
    : requests;

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center gap-2 animate-in fade-in">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {isDeptHead ? "Department Calibration Requests" : "Calibration POD Review & Weight Rebalancing"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDeptHead
              ? "Review and act on calibration requests submitted by your department employees."
              : "Review calibration requests accepted by Department Heads and adjust live evaluation form weights."}
          </p>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pending calibration requests.</p>
          <p className="text-xs text-slate-400 mt-0.5">All submitted calibration requests have been addressed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => (
            <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{req.requestedComponent}</p>
                    <p className="text-[10px] text-slate-400">
                      {req.employeeName} • {req.departmentName} • {req.evaluationTitle}
                    </p>
                    <p className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {expandedId === req.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {expandedId === req.id && (
                <div className="px-4 pb-4 space-y-3 text-xs border-t border-slate-100 dark:border-slate-700 pt-3">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-750">
                    <div>
                      <p className="text-slate-400 uppercase font-semibold text-[10px]">Current Value</p>
                      <p className="text-slate-800 dark:text-white font-medium">{req.currentValue || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase font-semibold text-[10px]">Requested Value</p>
                      <p className="text-brand-600 dark:text-brand-400 font-bold">{req.requestedValue}</p>
                    </div>
                  </div>

                  {req.employeeRemark && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 italic text-slate-600 dark:text-slate-300">
                      "{req.employeeRemark}"
                    </div>
                  )}

                  {/* Remarks input */}
                  {req.status !== 'deployed' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Reviewer Remarks (Optional)
                      </label>
                      <textarea
                        placeholder="Add review remarks..."
                        value={remarks[req.id] || ""}
                        onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs resize-none"
                      />
                    </div>
                  )}

                  {/* Dept Head Actions */}
                  {isDeptHead && req.status === "pending_dept_head" && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={() => handleDeptHeadAction(req, "accepted")}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept Request
                      </button>
                      <button
                        onClick={() => handleDeptHeadResubmit(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Accept & Submit to POD
                      </button>
                      <button
                        onClick={() => handleDeptHeadAction(req, "rejected")}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {/* POD Actions with Live Rebalancing Modal */}
                  {isPOD && (req.status === "accepted" || req.status === "resubmitted_to_pod") && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={() => openRebalanceModal(req)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-brand-600 hover:from-orange-600 hover:to-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Review & Adjust Live Form Weights
                      </button>
                      <button
                        onClick={async () => {
                          const updated: CalibrationRequest = {
                            ...req,
                            status: "pod_rejected",
                            podDecision: "rejected",
                            podRemark: remarks[req.id] || "Rejected by POD.",
                            podReviewedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          await saveCalibrationRequestToSupabase(updated);
                          setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
                          showToast("Calibration request rejected by POD.");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {/* Previous decision display */}
                  {req.deptHeadRemark && (
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Dept Head Remarks</p>
                      <p className="mt-0.5 text-slate-700 dark:text-slate-300">{req.deptHeadRemark}</p>
                    </div>
                  )}
                  {req.podRemark && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">POD Remarks</p>
                      <p className="mt-0.5 text-slate-700 dark:text-slate-300">{req.podRemark}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE CALIBRATION WEIGHT REBALANCING & AUTO-DEPLOY MODAL */}
      {/* ========================================================================= */}
      {rebalanceModalReq && targetEvaluation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-750">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Calibrate & Rebalance KPI Weights
                  </h3>
                  <p className="text-xs text-slate-500">
                    {targetEvaluation.employeeName} ({targetEvaluation.departmentName}) • {targetEvaluation.title || 'Evaluation Form'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRebalanceModalReq(null)} 
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Requested Calibration Overview Card */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Target Requested Adjustment
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                    Pending Deployment
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Component:</span>
                    <p className="font-extrabold text-slate-900 dark:text-white">{rebalanceModalReq.requestedComponent}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Requested Value:</span>
                    <p className="font-black text-brand-600 dark:text-brand-400 text-sm">{rebalanceModalReq.requestedValue}</p>
                  </div>
                </div>
                {rebalanceModalReq.employeeRemark && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1">
                    "{rebalanceModalReq.employeeRemark}"
                  </p>
                )}
              </div>

              {/* Live KPI Weight Rebalancing Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                    Part 1A KPI Weights Breakdown
                  </h4>
                  <button
                    onClick={handleAutoBalance}
                    className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-indigo-200 dark:border-indigo-800"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Auto-Balance Remaining KPIs
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">KRA / Performance Indicator</th>
                        <th className="p-3 text-center w-24">Original Weight</th>
                        <th className="p-3 text-center w-32">Adjusted Weight (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {rebalanceKpis.map((kpi, idx) => (
                        <tr 
                          key={kpi.id || idx} 
                          className={kpi.isTarget ? 'bg-amber-50/70 dark:bg-amber-950/30' : 'bg-white dark:bg-slate-800'}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {kpi.isTarget && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[9px] uppercase shrink-0">
                                  Target
                                </span>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{kpi.name}</p>
                                <p className="text-[10px] text-slate-400">[{kpi.kraName}]</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-500">
                            {kpi.originalWeight}%
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.5"
                                value={kpi.newWeight}
                                onChange={(e) => handleKpiWeightChange(idx, parseFloat(e.target.value) || 0)}
                                className={`w-20 px-2.5 py-1.5 rounded-xl border text-center font-bold text-xs ${
                                  kpi.isTarget 
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20' 
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                }`}
                              />
                              <span className="font-bold text-slate-400 text-xs">%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Balance Validation Bar */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                isWeightBalanced 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  {isWeightBalanced ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-extrabold text-xs">
                      {isWeightBalanced ? 'Weights Perfectly Balanced (Ready to Deploy)' : 'Weights Must Total Exactly 85%'}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {isWeightBalanced 
                        ? 'All KPI weights sum to 85%. Clicking deploy will automatically update the live evaluation.' 
                        : `Current Total: ${currentTotalWeight}% (Difference: ${currentTotalWeight > targetTotalWeight ? '+' : ''}${(currentTotalWeight - targetTotalWeight).toFixed(2)}%)`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase opacity-70">Total KPI Weight:</span>
                  <p className={`text-xl font-black ${isWeightBalanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {currentTotalWeight}% <span className="text-xs font-normal text-slate-500">/ {targetTotalWeight}%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 flex items-center justify-between">
              <button
                onClick={() => setRebalanceModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleDeployCalibration}
                disabled={!isWeightBalanced || isDeploying}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FileCheck className="w-4 h-4" />
                {isDeploying ? 'Deploying to Live Form...' : 'Approve & Deploy to Live Form'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

