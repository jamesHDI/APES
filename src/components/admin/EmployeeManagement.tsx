import React, { useState } from 'react';
import { User, Department, Role, EmploymentStatus, isPendingUser } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Download, 
  Edit3, 
  UserX, 
  UserCheck, 
  X, 
  CheckCircle2, 
  Building2, 
  Mail, 
  Sparkles, 
  Key, 
  Trash2,
  Briefcase,
  UserCircle,
  Check,
  RotateCcw
} from 'lucide-react';
import { RegisterEmployeeModal } from '../auth/RegisterEmployeeModal';
import { deleteEmployeeFromSupabase, saveEmployeeToSupabase } from '../../services/supabaseService';
import * as XLSX from 'xlsx';

interface EmployeeManagementProps {
  users: User[];
  departments: Department[];
  onSaveUsers: (updatedUsers: User[]) => Promise<void>;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  users,
  departments,
  onSaveUsers,
}) => {
  const [userList, setUserList] = useState<User[]>(users);
  const [activeTab, setActiveTab] = useState<'all' | 'dept_heads' | 'employees'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterPosition, setFilterPosition] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'INACTIVE'>('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State for Edit Modal
  const [formData, setFormData] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    departmentId: string;
    departmentName: string;
    position: string;
    role: Role;
    employmentStatus: EmploymentStatus;
    passwordInput: string;
    forcePasswordChange: boolean;
  }>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    departmentId: '',
    departmentName: '',
    position: '',
    role: 'employee',
    employmentStatus: 'Regular',
    passwordInput: '',
    forcePasswordChange: false,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Helper to determine if a user is a Department Head
  const isDeptHead = (u: User): boolean => {
    return Boolean(
      u.isDepartmentHead || 
      u.role === 'dept_head' || 
      u.position.toLowerCase().includes('department head') || 
      u.position.toLowerCase().includes('head of') ||
      u.position.toLowerCase().endsWith(' head')
    );
  };

  // Summary Statistics
  const totalEmployees = userList.length;
  const totalDeptHeads = userList.filter(isDeptHead).length;
  const activeCount = userList.filter(u => u.isActive !== false && u.isApproved !== false && u.approvalStatus !== 'pending').length;
  const pendingCount = userList.filter(isPendingUser).length;
  const inactiveCount = userList.filter(u => u.isActive === false).length;

  const availablePositions = Array.from(new Set(userList.map(u => u.position).filter(Boolean))).sort();

  // Filter & Search Logic
  const filteredUsers = userList.filter((u) => {
    const fullName = `${u.firstName || ''} ${u.middleName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employeeNumber && u.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDept = filterDept === 'ALL' || u.departmentName === filterDept;
    const matchesPosition = filterPosition === 'ALL' || u.position === filterPosition;
    
    let matchesStatus = true;
    if (filterStatus === 'ACTIVE') {
      matchesStatus = u.isActive !== false && u.isApproved !== false && u.approvalStatus !== 'pending';
    } else if (filterStatus === 'PENDING') {
      matchesStatus = u.approvalStatus === 'pending' || u.isApproved === false;
    } else if (filterStatus === 'INACTIVE') {
      matchesStatus = u.isActive === false;
    }

    const matchesSectionTab = 
      activeTab === 'all' || 
      (activeTab === 'dept_heads' ? isDeptHead(u) : !isDeptHead(u));

    return matchesSearch && matchesDept && matchesPosition && matchesStatus && matchesSectionTab;
  });

  // Alphabetical Sorting: Primary by Department Name, Secondary by Name
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const deptCompare = (a.departmentName || '').localeCompare(b.departmentName || '');
    if (deptCompare !== 0) return deptCompare;
    return (a.name || `${a.firstName} ${a.lastName}`).localeCompare(b.name || `${b.firstName} ${b.lastName}`);
  });

  const deptHeadUsers = sortedUsers.filter(isDeptHead);
  const regularEmployees = sortedUsers.filter(u => !isDeptHead(u));

  const handleOpenAdd = () => {
    setShowRegisterModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    // Find matching department by ID first, then by name, then leave blank
    const matchedDept = departments.find(d => d.id === user.departmentId) ||
      departments.find(d => d.name?.toLowerCase() === (user.departmentName || '').toLowerCase()) ||
      null;
    setFormData({
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      middleName: user.middleName || '',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email || '',
      contactNumber: user.contactNumber || '',
      departmentId: matchedDept?.id || user.departmentId || '',
      departmentName: matchedDept?.name || user.departmentName || '',
      position: user.position || '',
      role: user.role || 'employee',
      employmentStatus: user.employmentStatus || 'Regular',
      passwordInput: user.password || '',
      forcePasswordChange: Boolean(user.requiresPasswordChange),
    });
    setShowAddModal(true);
  };

  const handleToggleStatus = async (userId: string) => {
    const updated = userList.map((u) => {
      if (u.id === userId) {
        const nextStatus = !u.isActive;
        showToast(`${u.name} is now ${nextStatus ? 'Active' : 'Inactive'}`);
        return { ...u, isActive: nextStatus };
      }
      return u;
    });
    setUserList(updated);
    await onSaveUsers(updated);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === 'usr_default_admin' || user.email.toLowerCase() === 'admin.systemad@hdiadventures.com') {
      alert('The System Administrator account cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete employee record for ${user.name} (${user.email})?`)) {
      const updated = userList.filter(u => u.id !== user.id);
      setUserList(updated);
      await onSaveUsers(updated);
      deleteEmployeeFromSupabase(user.id);
      showToast(`Deleted account for ${user.name}`);
    }
  };

  const handleSaveEmployee = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in required fields: First Name, Last Name, Email');
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
    const dept = departments.find(d => d.id === formData.departmentId);
    const isDeptHeadPos = Boolean(
      formData.role === 'dept_head' || 
      formData.position.toLowerCase().includes('department head') || 
      formData.position.toLowerCase().includes('head of')
    );

    let savedTargetUser: User | null = null;

    if (editingUser) {
      const updated = userList.map((u) => {
        if (u.id === editingUser.id) {
          const userObj: User = {
            ...u,
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            name: fullName,
            email: cleanEmail,
            contactNumber: formData.contactNumber,
            departmentId: formData.departmentId,
            departmentName: dept?.name || formData.departmentName,
            position: formData.position,
            role: formData.role,
            employmentStatus: formData.employmentStatus,
            password: formData.passwordInput || u.password || 'password123',
            requiresPasswordChange: formData.forcePasswordChange,
            isDepartmentHead: isDeptHeadPos,
            isActive: true,
            isApproved: true,
            approvalStatus: 'approved',
          };
          savedTargetUser = userObj;
          return userObj;
        }
        return u;
      });
      setUserList(updated);
      await onSaveUsers(updated);
      if (savedTargetUser) {
        await saveEmployeeToSupabase(savedTargetUser);
      }
      showToast(`Updated personnel profile for ${fullName}`);
    }

    setShowAddModal(false);
  };

  const handleRegisterNewUser = async (newUser: User) => {
    const updated = [newUser, ...userList];
    setUserList(updated);
    await onSaveUsers(updated);
    showToast(`Registered new employee account for ${newUser.name}`);
  };

  const handleExportCSV = () => {
    const data = sortedUsers.map((u) => ({
      'Employee ID': u.employeeNumber || u.id,
      'Full Name': u.name,
      'Email': u.email,
      'Department': u.departmentName,
      'Position': u.position,
      'Organizational Level': isDeptHead(u) ? 'Department Head' : 'Employee',
      'Role': u.role,
      'Employment Status': u.employmentStatus || 'Regular',
      'Status': u.isActive ? (u.approvalStatus === 'pending' ? 'Pending Approval' : 'Active') : 'Inactive'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `Employee_Directory_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const renderUserCard = (u: User) => {
    const isHead = isDeptHead(u);
    const isPending = u.approvalStatus === 'pending' || u.isApproved === false;
    const isActive = u.isActive !== false && !isPending;

    return (
      <div key={u.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{u.name}</h4>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold truncate">{u.position}</p>
              <p className="text-[10px] text-slate-400 font-mono">ID: {u.employeeNumber || u.id}</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
            isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {isPending ? 'Pending' : isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <p className="flex items-center space-x-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{u.email}</span>
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            isHead ? 'bg-[#FFF4EA] text-[#E96B1A] dark:bg-brand-950 dark:text-brand-300 border border-[#F28C28]/30' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {isHead ? 'Department Head' : `Role: ${u.role}`}
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleOpenEdit(u)}
              className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit Personnel Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleToggleStatus(u.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                u.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
              }`}
              title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
            >
              {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleDeleteUser(u)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#F28C28]/50 flex items-center space-x-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-[#F28C28]" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Employee Directory & User Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage personnel profiles, position assignments, role permissions, and access credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
              <UserPlus className="w-4 h-4" />
              Register Employee
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Users</p>
            <p className="stat-number">{totalEmployees}</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Dept Heads</p>
            <p className="stat-number">{totalDeptHeads}</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Active</p>
            <p className="stat-number text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Pending</p>
            <p className="stat-number text-slate-600 dark:text-slate-400">{pendingCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Inactive</p>
            <p className="stat-number text-slate-500">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Directory Section Navigation Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-[#F28C28] text-white shadow-sm shadow-orange-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-[#F28C28]/40 hover:text-[#E96B1A]'
          }`}
        >
          All Users ({userList.length})
        </button>
        <button
          onClick={() => setActiveTab('dept_heads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'dept_heads'
              ? 'bg-[#F28C28] text-white shadow-sm shadow-orange-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-[#F28C28]/40 hover:text-[#E96B1A]'
          }`}
        >
          Department Heads ({totalDeptHeads})
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'employees'
              ? 'bg-[#F28C28] text-white shadow-sm shadow-orange-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-[#F28C28]/40 hover:text-[#E96B1A]'
          }`}
        >
          Regular Employees ({totalEmployees - totalDeptHeads})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, employee ID, position..."
            className="search-bar-input"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="form-input py-2 text-xs w-auto">
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="form-input py-2 text-xs w-auto max-w-[160px]">
            <option value="ALL">All Positions</option>
            {availablePositions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="form-input py-2 text-xs w-auto">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Users</option>
            <option value="PENDING">Pending Approval</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Directory Sections Render */}
      {activeTab === 'all' ? (
        <div className="space-y-8">
          {deptHeadUsers.length > 0 && (
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Department Heads ({deptHeadUsers.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptHeadUsers.map(renderUserCard)}
              </div>
            </div>
          )}

          {regularEmployees.length > 0 && (
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Regular Employees ({regularEmployees.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularEmployees.map(renderUserCard)}
              </div>
            </div>
          )}

          {sortedUsers.length === 0 && (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users match your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found in this section</p>
            </div>
          ) : (
            sortedUsers.map(renderUserCard)
          )}
        </div>
      )}

      {/* Register Modal */}
      <RegisterEmployeeModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegisterUser={handleRegisterNewUser}
        departments={departments}
        users={users}
      />

      {/* Edit Personnel Profile & Credentials Modal (Matching Screenshot UI) */}
      {showAddModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                    Edit Personnel Profile & Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update profile info, department assignment, role permissions, and default password.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  placeholder="Middle name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => {
                    const d = departments.find(dep => dep.id === e.target.value);
                    setFormData({ ...formData, departmentId: e.target.value, departmentName: d?.name || '' });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Select Department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Position Title</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Position title..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="employee">Employee (Staff)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="dept_head">Department Head</option>
                  <option value="president">President & CEO</option>
                  <option value="pod">POD Officer</option>
                  <option value="hr_admin">HR Administrator</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Employment Status</label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as EmploymentStatus })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contractual">Contractual</option>
                </select>
              </div>
            </div>

            {/* Account Password & Login Credentials Embedded Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    Account Password & Login Credentials
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={formData.passwordInput}
                    onChange={(e) => setFormData({ ...formData, passwordInput: e.target.value })}
                    placeholder="Enter password..."
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-6 flex items-center space-x-2 pt-4 sm:pt-0">
                  <input
                    type="checkbox"
                    id="forcePasswordCheck"
                    checked={formData.forcePasswordChange}
                    onChange={(e) => setFormData({ ...formData, forcePasswordChange: e.target.checked })}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="forcePasswordCheck" className="text-xs font-semibold text-amber-950 dark:text-amber-200 cursor-pointer">
                    Force password change on next login
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEmployee}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
