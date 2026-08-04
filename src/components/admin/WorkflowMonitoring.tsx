import React, { useState } from 'react';
import { User, Evaluation, Department, EvaluationTemplate } from '../../types';
import { getCurrentReviewerInfo, isEvaluationCompleted } from '../../utils/workflowUtils';
import { assignNewEvaluationToEmployee } from '../../services/storage';
import { triggerWorkflowNotification } from '../../services/notificationService';
import { StatusBadge } from '../common/StatusBadge';
import { 
  GitBranch, 
  Search, 
  PlusCircle, 
  Users, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  X,
  FileCheck
} from 'lucide-react';

interface WorkflowMonitoringProps {
  currentUser: User;
  users: User[];
  evaluations: Evaluation[];
  departments: Department[];
  templates: EvaluationTemplate[];
  onOpenEvaluation: (evalId: string) => void;
  onRefreshEvaluations: () => void;
}

export const WorkflowMonitoring: React.FC<WorkflowMonitoringProps> = ({
  currentUser,
  users,
  evaluations,
  departments,
  templates,
  onOpenEvaluation,
  onRefreshEvaluations,
}) => {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  
  // Assign Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'individual' | 'department'>('individual');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(users[0]?.id || '');
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>(departments[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [appraisalPeriod, setAppraisalPeriod] = useState<string>('January - December 2026');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Metrics
  const pendingDeptHead = evaluations.filter(e => e.status === 'pending_dept_head' || e.status === 'employee_submitted' || e.status === 'pending_supervisor');
  const pendingPOD = evaluations.filter(e => e.status === 'pending_pod' || e.status === 'supervisor_completed' || e.status === 'president_completed');
  const completed = evaluations.filter(e => isEvaluationCompleted(e));

  // Filtered Evaluations
  const filteredEvaluations = evaluations.filter(e => {
    const matchSearch = search === '' || 
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      e.appraisalPeriod.toLowerCase().includes(search.toLowerCase());

    const matchDept = selectedDept === 'all' || e.departmentName === selectedDept;

    let matchStage = true;
    if (selectedStage === 'draft') matchStage = e.status === 'draft' || e.status === 'reopened';
    else if (selectedStage === 'dept_head') matchStage = e.status === 'pending_dept_head' || e.status === 'employee_submitted' || e.status === 'pending_supervisor';
    else if (selectedStage === 'pod') matchStage = e.status === 'pending_pod' || e.status === 'supervisor_completed' || e.status === 'president_completed';
    else if (selectedStage === 'completed') matchStage = isEvaluationCompleted(e);

    return matchSearch && matchDept && matchStage;
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
    if (!template) {
      alert('Please select a valid evaluation template.');
      return;
    }

    if (assignMode === 'individual') {
      const targetUser = users.find(u => u.id === targetEmployeeId);
      if (!targetUser) {
        alert('Please select an employee.');
        return;
      }
      const newEval = assignNewEvaluationToEmployee(targetUser, template, appraisalPeriod, currentUser.name);
      triggerWorkflowNotification(
        targetUser.id,
        newEval,
        'New Performance Evaluation Cycle Assigned',
        `A new evaluation form (${appraisalPeriod}) has been assigned to you by ${currentUser.name}.`,
        currentUser.name,
        'action_required'
      );
      showToast(`Assigned evaluation template to ${targetUser.name}!`);
    } else {
      const targetDept = departments.find(d => d.id === targetDepartmentId);
      if (!targetDept) {
        alert('Please select a department.');
        return;
      }
      const deptEmployees = users.filter(u => u.departmentId === targetDept.id || u.departmentName === targetDept.name);
      if (deptEmployees.length === 0) {
        alert(`No active employees found in department ${targetDept.name}.`);
        return;
      }

      let count = 0;
      deptEmployees.forEach(emp => {
        const newEval = assignNewEvaluationToEmployee(emp, template, appraisalPeriod, currentUser.name);
        triggerWorkflowNotification(
          emp.id,
          newEval,
          'New Performance Evaluation Cycle Assigned',
          `A new evaluation form (${appraisalPeriod}) has been assigned to your department by ${currentUser.name}.`,
          currentUser.name,
          'action_required'
        );
        count++;
      });
      showToast(`Assigned evaluation template to ${count} employee(s) in ${targetDept.name}!`);
    }

    setIsModalOpen(false);
    onRefreshEvaluations();
  };

  const departmentNames = Array.from(new Set(departments.map(d => d.name)));

  return (
    <div className="space-y-6 pb-12">

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Hero Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Organization Workflow & Evaluation Monitoring</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Real-time evaluation cycle tracking, reviewer assignment audit, and new evaluation form assignment.
            </p>
          </div>

          {(currentUser.role === 'system_admin' || currentUser.role === 'hr_admin' || currentUser.role === 'pod') && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm shrink-0">
              <PlusCircle className="w-4 h-4" />
              Assign New Evaluation
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Evaluations</p>
            <p className="stat-number">{evaluations.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">In Progress</p>
            <p className="stat-number text-orange-600 dark:text-orange-400">
              {evaluations.filter(e => !isEvaluationCompleted(e)).length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Completed & Archived</p>
            <p className="stat-number text-emerald-600 dark:text-emerald-400">
              {evaluations.filter(e => isEvaluationCompleted(e)).length}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Dept Head Workflows</p>
            <p className="stat-number">
              {evaluations.filter(e => (e as any).workflowType === 'WORKFLOW_DEPT_HEAD' || (e as any).isDepartmentHead).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Monitoring Table Card */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Active Evaluation Workflows
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filtered by employee, department, and reviewer stage
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee or period..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Departments</option>
              {departmentNames.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Stages</option>
              <option value="draft">Self Evaluation (Draft)</option>
              <option value="dept_head">Under Dept Head Review</option>
              <option value="pod">Under POD Review</option>
              <option value="completed">Completed & Archived</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-750 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Position</th>
                <th className="py-3 px-4">Appraisal Period</th>
                <th className="py-3 px-4">Current Reviewer</th>
                <th className="py-3 px-4">Stage Status</th>
                <th className="py-3 px-4">Days Waiting</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No evaluations match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => {
                  const revInfo = getCurrentReviewerInfo(ev, users);
                  const isDone = isEvaluationCompleted(ev);
                  const updatedDate = new Date(ev.updatedAt || ev.createdAt || Date.now());
                  const daysWaiting = Math.max(0, Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 3600 * 24)));
                  const deadlineDate = ev.deadline || '2026-12-31';
                  const isOverdue = !isDone && new Date().getTime() > new Date(deadlineDate).getTime();

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {ev.employeeName}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{ev.position}</p>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                          {ev.departmentName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        {ev.appraisalPeriod}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{revInfo.reviewerName}</p>
                        <p className="text-[10px] text-slate-500">{revInfo.reviewerRole}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ev.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {isDone ? '-' : `${daysWaiting} d`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOverdue 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {deadlineDate} {isOverdue ? '(OVERDUE)' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenEvaluation(ev.id)}
                          className="btn btn-xs btn-secondary font-semibold"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{isDone ? 'View Scorecard' : 'Monitor'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign New Evaluation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Assign New Evaluation Cycle
                </h3>
                <p className="text-xs text-slate-500">Initiate a new evaluation scorecard for an employee or department.</p>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
              {/* Assignment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Assignment Target
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignMode('individual')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 ${
                      assignMode === 'individual'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Single Employee</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode('department')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 ${
                      assignMode === 'department'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Entire Department</span>
                  </button>
                </div>
              </div>

              {/* Target Selector */}
              {assignMode === 'individual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Select Employee
                  </label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.position} ({u.departmentName})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Select Department
                  </label>
                  <select
                    value={targetDepartmentId}
                    onChange={(e) => setTargetDepartmentId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.employeeCount || 0} employees)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Evaluation Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Appraisal Period
                </label>
                <input
                  type="text"
                  value={appraisalPeriod}
                  onChange={(e) => setAppraisalPeriod(e.target.value)}
                  placeholder="e.g. January - December 2026"
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm font-bold shadow-md"
                >
                  Assign & Begin Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
