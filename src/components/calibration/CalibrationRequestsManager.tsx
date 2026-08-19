import React, { useState, useEffect } from "react";
import { CalibrationRequest, CalibrationStatus, User } from "../../types";
import { ShieldCheck, MessageSquare, CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp, Send } from "lucide-react";
import { saveCalibrationRequestToSupabase, fetchCalibrationRequestsFromSupabase } from "../../services/supabaseService";

const STATUS_LABELS: Record<CalibrationStatus, string> = {
  pending_dept_head: "Pending Dept Head Review",
  accepted: "Accepted",
  rejected: "Rejected",
  resubmitted_to_pod: "Resubmitted to POD",
  pod_approved: "POD Approved",
  pod_rejected: "POD Rejected",
  deployed: "Deployed",
};

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  pending_dept_head: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  resubmitted_to_pod: "bg-purple-100 text-purple-700",
  pod_approved: "bg-emerald-100 text-emerald-700",
  pod_rejected: "bg-rose-100 text-rose-700",
  deployed: "bg-emerald-100 text-emerald-700",
};

interface CalibrationRequestsManagerProps {
  currentUser: User;
}

export const CalibrationRequestsManager: React.FC<CalibrationRequestsManagerProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<CalibrationRequest[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

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
      setRequests(all.filter(r => ["accepted", "resubmitted_to_pod"].includes(r.status)));
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

  const handlePODAction = async (req: CalibrationRequest, decision: "pod_approved" | "pod_rejected" | "deployed") => {
    const updated: CalibrationRequest = {
      ...req,
      status: decision,
      podDecision: decision === "pod_approved" || decision === "deployed" ? "approved" : "rejected",
      podRemark: remarks[req.id] || undefined,
      podReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveCalibrationRequestToSupabase(updated);
    if (saved) {
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
      showToast(`Calibration request ${decision.replace("_", " ")}.`);
    } else {
      showToast("Failed to update. Please try again.");
    }
  };

  const filteredRequests = isDeptHead
    ? requests.filter(r => r.status === "pending_dept_head")
    : requests;

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500">
          {toastMsg}
        </div>
      )}

      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {isDeptHead ? "Department Calibration Requests" : "Calibration POD Review"}
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {isDeptHead
            ? "Review and act on calibration requests submitted by your department employees."
            : "Review calibration requests that have been accepted by Department Heads and require POD approval."}
        </p>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No pending calibration requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => (
            <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
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
                      <p className="text-slate-800 dark:text-white">{req.currentValue || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase font-semibold text-[10px]">Requested Value</p>
                      <p className="text-slate-800 dark:text-white font-bold">{req.requestedValue}</p>
                    </div>
                  </div>
                  {req.employeeRemark && (
                    <p className="text-slate-600 dark:text-slate-300 italic">Employee says: "{req.employeeRemark}"</p>
                  )}

                  {/* Remarks input */}
                  <textarea
                    placeholder="Add your remarks (optional)..."
                    value={remarks[req.id] || ""}
                    onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs resize-none"
                  />

                  {/* Dept Head Actions */}
                  {isDeptHead && req.status === "pending_dept_head" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleDeptHeadAction(req, "accepted")}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Adjust
                      </button>
                      <button
                        onClick={() => handleDeptHeadResubmit(req)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Accept & Resubmit to POD
                      </button>
                      <button
                        onClick={() => handleDeptHeadAction(req, "rejected")}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {/* POD Actions */}
                  {isPOD && (req.status === "accepted" || req.status === "resubmitted_to_pod") && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handlePODAction(req, "pod_approved")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handlePODAction(req, "deployed")}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Approve & Deploy
                      </button>
                      <button
                        onClick={() => handlePODAction(req, "pod_rejected")}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {/* Previous decision display */}
                  {req.deptHeadRemark && (
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                      <p className="text-[10px] font-bold text-blue-700 uppercase">Dept Head Remarks</p>
                      <p className="mt-0.5">{req.deptHeadRemark}</p>
                    </div>
                  )}
                  {req.podRemark && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">POD Remarks</p>
                      <p className="mt-0.5">{req.podRemark}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
