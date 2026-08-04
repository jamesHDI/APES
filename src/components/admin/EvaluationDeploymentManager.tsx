import React, { useState } from 'react';
import { User, Department, EvaluationTemplate, EvaluationDeployment, DeploymentStatus, AssignmentType } from '../../types';
import { getStoredDeployments, saveDeployments, assignNewEvaluationToEmployee, saveSingleEvaluation } from '../../services/storage';
import { triggerWorkflowNotification } from '../../services/notificationService';
import { 
  Rocket, 
  PlusCircle, 
  Calendar, 
  Users, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Archive, 
  X, 
  Sparkles,
  SlidersHorizontal,
  FileCheck,
  AlertCircle
} from 'lucide-react';

interface EvaluationDeploymentManagerProps {
  currentUser: User;
  users: User[];
  departments: Department[];
  templates: EvaluationTemplate[];
  onRefreshData: () => void;
}

export const EvaluationDeploymentManager: React.FC<EvaluationDeploymentManagerProps> = ({
  currentUser,
  users,
  departments,
  templates,
  onRefreshData,
}) => {
  const [deployments, setDeployments] = useState<EvaluationDeployment[]>(getStoredDeployments());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('FY 2026 Mid-Year Performance Evaluation');
  const [period, setPeriod] = useState('January 1, 2026 - June 30, 2026');
  const [year, setYear] = useState<number>(2026);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || '');
  const [description, setDescription] = useState('Official enterprise performance appraisal cycle.');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState('2026-06-30');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  const [initialStatus, setInitialStatus] = useState<DeploymentStatus>('active');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCreateDeployment = (e: React.FormEvent) => {
    e.preventDefault();
    const template = templates.find(t => t.id === templateId) || templates[0];
    if (!template) {
      alert('Please select an evaluation template.');
      return;
    }

    // Determine target employees
    const isEligibleUser = (u: User) => {
      if (u.isActive === false) return false;
      if (u.isApproved === false || u.approvalStatus === 'pending' || u.approvalStatus === 'rejected') return false;
      return true;
    };

    const eligibleUsers = users.filter(isEligibleUser);

    let targetUsers: User[] = [];
    if (assignmentType === 'all') {
      targetUsers = eligibleUsers;
    } else if (assignmentType === 'departments') {
      // Map selected department IDs/names to full department records
      const selectedDeptRecords = departments.filter(
        d => selectedDepts.includes(d.id) || selectedDepts.includes(d.name)
      );

      const targetDeptNames = selectedDeptRecords.map(d => d.name.toLowerCase().trim());
      const targetDeptIds = selectedDeptRecords.map(d => d.id.toLowerCase().trim());
      const targetDeptCodes = selectedDeptRecords.map(d => (d.code || '').toLowerCase().trim()).filter(Boolean);

      targetUsers = eligibleUsers.filter(u => {
        const uDeptId = (u.departmentId || '').toLowerCase().trim();
        const uDeptName = (u.departmentName || '').toLowerCase().trim();

        const matchesId = targetDeptIds.includes(uDeptId);
        const matchesName = targetDeptNames.includes(uDeptName);
        const matchesCode = targetDeptCodes.includes(uDeptId) || targetDeptCodes.includes(uDeptName);

        // Case-insensitive substring match fallback (e.g. "Admin" matches "Admin Department" or "dept_adm")
        const partialNameMatch = targetDeptNames.some(
          tdn => tdn && (uDeptName.includes(tdn) || tdn.includes(uDeptName))
        );

        return matchesId || matchesName || matchesCode || partialNameMatch;
      });
    } else if (assignmentType === 'employees') {
      targetUsers = eligibleUsers.filter(u => selectedEmps.includes(u.id));
    }

    if (targetUsers.length === 0) {
      alert('No employees matched the selected assignment criteria.');
      return;
    }

    const deploymentId = `deploy_${Date.now()}`;
    const newDeployment: EvaluationDeployment = {
      id: deploymentId,
      title,
      period,
      year,
      templateId: template.id,
      templateTitle: template.title,
      description,
      startDate,
      endDate,
      assignmentType,
      targetDepartmentIds: selectedDepts,
      targetEmployeeIds: selectedEmps,
      status: initialStatus,
      totalAssigned: targetUsers.length,
      completedCount: 0,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10)
    };

    const updatedDeployments = [newDeployment, ...deployments];
    setDeployments(updatedDeployments);
    saveDeployments(updatedDeployments);

    // If active, generate evaluations and notify users
    if (initialStatus === 'active') {
      targetUsers.forEach(u => {
        const newEval = assignNewEvaluationToEmployee(u, template, period, currentUser.name);
        newEval.deploymentId = deploymentId;
        newEval.deadline = endDate;
        // Re-save so deploymentId & deadline are persisted to storage & Supabase
        saveSingleEvaluation(newEval);
        
        triggerWorkflowNotification(
          u.id,
          newEval,
          'New Evaluation Deployment Activated',
          `Evaluation cycle "${title}" (${period}) has been deployed by ${currentUser.name}. Deadline: ${endDate}.`,
          currentUser.name,
          'action_required'
        );
      });
    }

    showToast(`Successfully deployed evaluation cycle to ${targetUsers.length} employee(s)!`);
    setIsModalOpen(false);
    onRefreshData();
  };

  const handleUpdateStatus = (id: string, newStatus: DeploymentStatus) => {
    const updated = deployments.map(d => d.id === id ? { ...d, status: newStatus, updatedAt: new Date().toISOString().substring(0, 10) } : d);
    setDeployments(updated);
    saveDeployments(updated);
    showToast(`Deployment campaign status updated to ${newStatus.toUpperCase()}`);
    onRefreshData();
  };

  const activeDeployments = deployments.filter(d => d.status === 'active');

  return (
    <div className="space-y-6 pb-12">

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Evaluation Deployment & Cycle Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Deploy performance evaluation campaigns to employees, departments, or entire organization.
            </p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm shrink-0">
            <PlusCircle className="w-4 h-4" />
            Deploy New Cycle
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Campaigns</p>
            <p className="stat-number">{deployments.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Active Cycles</p>
            <p className="stat-number text-orange-600 dark:text-orange-400">{activeDeployments.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Total Assigned</p>
            <p className="stat-number">{deployments.reduce((acc, d) => acc + d.totalAssigned, 0)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Completed Reviews</p>
            <p className="stat-number text-emerald-600 dark:text-emerald-400">
              {deployments.reduce((acc, d) => acc + d.completedCount, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Evaluation Deployment Campaigns
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage cycle availability, schedule deadlines, and target assignments
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-750 text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Campaign Title</th>
                <th className="py-3 px-4">Period & Year</th>
                <th className="py-3 px-4">Target Scope</th>
                <th className="py-3 px-4">Schedule Deadline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {deployments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No evaluation deployment campaigns found.
                  </td>
                </tr>
              ) : (
                deployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {dep.title}
                      {dep.description && (
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">{dep.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {dep.period} ({dep.year})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {dep.assignmentType} ({dep.totalAssigned} users)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-400">
                      {dep.startDate} → {dep.endDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        dep.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                          : dep.status === 'scheduled'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {dep.completedCount} / {dep.totalAssigned} done
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {dep.status !== 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(dep.id, 'active')}
                          className="btn btn-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          Activate
                        </button>
                      )}
                      {dep.status === 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(dep.id, 'closed')}
                          className="btn btn-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(dep.id, 'archived')}
                        className="btn btn-xs btn-secondary"
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployment Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Deploy New Performance Evaluation Campaign
                </h3>
                <p className="text-xs text-slate-500">Configure cycle information, schedule deadlines, and target assignment.</p>
              </div>
            </div>

            <form onSubmit={handleCreateDeployment} className="space-y-4 pt-2">
              
              {/* General Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Evaluation Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Evaluation Period
                  </label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Evaluation Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Evaluation Template
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.departmentName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Description / Guidelines
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    End Date (Submission Deadline)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Assignment Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target Assignment Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentType('all')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      assignmentType === 'all'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    All Employees
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentType('departments')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      assignmentType === 'departments'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Specific Departments
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentType('employees')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      assignmentType === 'employees'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Specific Employees
                  </button>
                </div>
              </div>

              {/* Department Checkboxes if departments chosen */}
              {assignmentType === 'departments' && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Select Departments:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {departments.map(d => (
                      <label key={d.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDepts.includes(d.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDepts([...selectedDepts, d.id]);
                            else setSelectedDepts(selectedDepts.filter(id => id !== d.id));
                          }}
                          className="rounded text-brand-600"
                        />
                        <span className="text-slate-800 dark:text-slate-200">{d.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Deployment Initial Status
                </label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as DeploymentStatus)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="active">Active (Deploy & Notify Employees Immediately)</option>
                  <option value="scheduled">Scheduled (Activate Later)</option>
                  <option value="draft">Draft (Saved for Review)</option>
                </select>
              </div>

              {/* Action Buttons */}
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
                  className="btn btn-primary btn-sm font-bold shadow-md flex items-center space-x-1.5"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Deploy Evaluation Cycle</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
