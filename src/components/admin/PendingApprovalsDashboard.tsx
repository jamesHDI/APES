import React, { useState } from 'react';
import { User, Department, Role, isPendingUser } from '../../types';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Search, 
  Edit3, 
  Sparkles, 
  ShieldAlert 
} from 'lucide-react';

interface PendingApprovalsDashboardProps {
  users: User[];
  departments: Department[];
  onApproveUser: (updatedUser: User) => void;
  onRejectUser: (userId: string, remarks: string) => void;
}

export const PendingApprovalsDashboard: React.FC<PendingApprovalsDashboardProps> = ({
  users,
  departments,
  onApproveUser,
  onRejectUser,
}) => {
  // Only show accounts that are currently pending review — approved & rejected accounts automatically leave the queue
  const pendingList = users.filter(isPendingUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Verification Form State
  const [editDeptId, setEditDeptId] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<Role>('employee');
  const [editIsId, setEditIsId] = useState('');
  const [editDeptHeadId, setEditDeptHeadId] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredPending = pendingList.filter((u) => {
    const s = searchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.departmentName || '').toLowerCase().includes(s)
    );
  });

  const handleOpenReview = (u: User) => {
    setSelectedUser(u);
    const matchedDept = departments.find(d => 
      d.id === u.departmentId || 
      d.name.toLowerCase() === (u.departmentName || '').toLowerCase() ||
      (d.code && d.code.toLowerCase() === (u.departmentName || '').toLowerCase()) ||
      d.name.toLowerCase().includes((u.departmentName || '').toLowerCase()) ||
      (u.departmentName || '').toLowerCase().includes(d.name.toLowerCase())
    );
    setEditDeptId(matchedDept?.id || u.departmentId || departments[0]?.id || '');
    setEditPosition(u.position || '');
    setEditRole(u.role || 'employee');
    setEditIsId(u.immediateSuperiorId || '');
    setEditDeptHeadId(u.departmentHeadId || '');
  };

  const handleApprove = () => {
    if (!selectedUser) return;
    if (!editDeptId || !editPosition) {
      alert('Department and Position must be assigned before approving registration.');
      return;
    }

    const dept = departments.find(d => d.id === editDeptId);
    const isUser = users.find(u => u.id === editIsId);
    const deptHeadUser = users.find(u => u.id === editDeptHeadId);

    const approvedUser: User = {
      ...selectedUser,
      departmentId: editDeptId,
      departmentName: dept?.name || selectedUser.departmentName,
      position: editPosition,
      role: editRole,
      immediateSuperiorId: editIsId || undefined,
      immediateSuperiorName: isUser?.name,
      departmentHeadId: editDeptHeadId || undefined,
      departmentHeadName: deptHeadUser?.name,
      isApproved: true,
      isActive: true,
      approvalStatus: 'approved'
    };

    onApproveUser(approvedUser);
    showToast(`Account for ${approvedUser.name} has been Approved and Activated!`);
    setSelectedUser(null);
  };

  const handleConfirmReject = () => {
    if (!selectedUser) return;
    onRejectUser(selectedUser.id, rejectionRemarks || 'Registration rejected by HR Administrator.');
    showToast(`Registration request for ${selectedUser.name} was rejected.`);
    setShowRejectModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#F28C28]/50 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-[#F28C28]" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">HR Pending Account Approvals Queue</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review self-registered accounts, verify departments & positions, assign reporting lines.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#FFF4EA] text-[#E96B1A] border border-[#F28C28]/20 shrink-0">
            {pendingList.length} Pending
          </span>
        </div>
      </div>

      {/* Pending Grid */}
      {pendingList.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No Pending Approvals</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All user registration requests have been reviewed, verified, and activated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPending.map((u) => (
            <div key={u.id} className="card p-5 space-y-4 border-l-4 border-l-amber-400">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={u.avatarUrl} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-[#F28C28]/30" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</h4>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                <span className="badge badge-pending text-[10px] font-extrabold uppercase">
                  Pending HR
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p><strong>Requested Dept:</strong> {u.departmentName}</p>
                <p><strong>Requested Position:</strong> {u.position}</p>
              </div>

              <button
                onClick={() => handleOpenReview(u)}
                className="btn btn-warning btn-sm w-full justify-center"
              >
                <UserCheck className="w-4 h-4" />
                Verify & Review Registration
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review & Approve Modal */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl p-6 sm:p-8 space-y-6 animate-slide-up max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                  Verify Employee Registration
                </h3>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                  Appraisee: {selectedUser.name} &nbsp;·&nbsp; {selectedUser.email}
                </p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close verification dialog"
              >
                <UserX className="w-5 h-5" />
              </button>
            </div>

            {/* Alert Banner */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
              <p className="font-extrabold text-xs text-amber-950 dark:text-amber-100 uppercase tracking-wider">HR Verification Requirement</p>
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                Confirm or adjust requested Department and Position, assign reporting managers, and grant PBAC role prior to account activation.
              </p>
            </div>

            {/* Form Fields Grid */}
            <div className="space-y-5">
              {/* Row 1: Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Confirmed Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="form-input font-bold py-2.5 px-3.5 text-xs w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Confirmed Position <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="form-input font-bold py-2.5 px-3.5 text-xs w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Row 2: Immediate Supervisor & PBAC Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Immediate Supervisor (IS)
                  </label>
                  <select
                    value={editIsId}
                    onChange={(e) => setEditIsId(e.target.value)}
                    className="form-input font-semibold py-2.5 px-3.5 text-xs w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Supervisor...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Assigned PBAC System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="form-input font-bold py-2.5 px-3.5 text-xs w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="employee">Employee (Appraisee)</option>
                    <option value="supervisor">Immediate Supervisor (IS)</option>
                    <option value="dept_head">Department Head</option>
                    <option value="president">President</option>
                    <option value="pod">POD Reviewer</option>
                    <option value="hr_admin">HR Administrator</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons Footer */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors flex items-center justify-center gap-2"
              >
                <UserX className="w-4 h-4" />
                <span>Reject Registration</span>
              </button>

              <div className="w-full sm:w-auto flex items-center justify-end gap-3">
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Activate Account</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Reject Confirmation Sub-Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Reject Registration Request</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Provide HR rejection remarks for {selectedUser.name}:</p>

            <textarea
              rows={3}
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              placeholder="Reason for rejection..."
              className="form-input"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowRejectModal(false)} className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
