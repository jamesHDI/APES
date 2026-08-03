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
    setEditDeptId(u.departmentId || departments[0]?.id || '');
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
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black tracking-tight">HR Pending Account Approvals Queue</h2>
          </div>
          <p className="text-xs text-amber-200 mt-1">
            Review self-registered employee accounts, verify departments & positions, assign reporting lines, and activate accounts.
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs bg-amber-500 text-slate-950">
          {pendingList.length} Pending Requests
        </span>
      </div>

      {/* Pending Grid */}
      {pendingList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center space-y-3 border border-slate-200 dark:border-slate-700 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No Pending Approvals</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All user registration requests have been reviewed, verified, and activated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPending.map((u) => (
            <div key={u.id} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img src={u.avatarUrl} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-400" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</h4>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800">
                  Pending HR
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p><strong>Requested Dept:</strong> {u.departmentName}</p>
                <p><strong>Requested Position:</strong> {u.position}</p>
              </div>

              <button
                onClick={() => handleOpenReview(u)}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Verify & Review Registration</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review & Approve Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Verify Employee Registration — {selectedUser.name}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <UserX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <p className="font-bold">HR Verification Requirement:</p>
              <p>Confirm or adjust requested Department and Position, assign reporting managers, and grant PBAC role prior to activation.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirmed Department *</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="form-input font-bold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirmed Position *</label>
                <input
                  type="text"
                  required
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="form-input font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Immediate Supervisor (IS)</label>
                <select
                  value={editIsId}
                  onChange={(e) => setEditIsId(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Supervisor...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assigned PBAC System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="form-input font-bold"
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

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800"
              >
                Reject Registration
              </button>

              <div className="flex space-x-2">
                <button onClick={() => setSelectedUser(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400">
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  Approve & Activate Account
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
