import React, { useState } from 'react';
import { User, Department, Role, EmploymentStatus } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  UserX, 
  UserCheck, 
  X, 
  CheckCircle2, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  Sparkles, 
  Key, 
  Trash2,
  Crown,
  ShieldAlert,
  Clock,
  Briefcase
} from 'lucide-react';
import { RegisterEmployeeModal } from '../auth/RegisterEmployeeModal';
import { deleteEmployeeFromSupabase } from '../../services/supabaseService';
import * as XLSX from 'xlsx';

interface EmployeeManagementProps {
  users: User[];
  departments: Department[];
  onSaveUsers: (updatedUsers: User[]) => void;
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
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    departmentId: departments[0]?.id || 'dept_sales',
    departmentName: departments[0]?.name || 'Sales',
    position: 'Staff Specialist',
    role: 'employee',
    employmentStatus: 'Regular',
    dateHired: new Date().toISOString().substring(0, 10),
    username: '',
    isActive: true,
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

  // Live Summary Statistics Calculation
  const totalEmployees = userList.length;
  const totalDeptHeads = userList.filter(isDeptHead).length;
  const activeCount = userList.filter(u => u.isActive !== false && u.isApproved !== false && u.approvalStatus !== 'pending').length;
  const pendingCount = userList.filter(u => u.approvalStatus === 'pending' || u.isApproved === false).length;
  const inactiveCount = userList.filter(u => u.isActive === false).length;

  // Extract unique positions for position filter
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
    setFormData({ ...user });
    setShowAddModal(true);
  };

  const handleToggleStatus = (userId: string) => {
    const updated = userList.map((u) => {
      if (u.id === userId) {
        const nextStatus = !u.isActive;
        showToast(`${u.name} is now ${nextStatus ? 'Active' : 'Archived/Inactive'}`);
        return { ...u, isActive: nextStatus };
      }
      return u;
    });
    setUserList(updated);
    onSaveUsers(updated);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === 'usr_default_admin' || user.email === 'Admin.Systemad@hdiadventures.com') {
      alert('The System Administrator account cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete employee record for ${user.name} (${user.email})?`)) {
      const updated = userList.filter(u => u.id !== user.id);
      setUserList(updated);
      onSaveUsers(updated);
      deleteEmployeeFromSupabase(user.id);
      showToast(`Deleted employee account for ${user.name}`);
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPasswordInput.trim()) return;

    const updated = userList.map((u) => {
      if (u.id === passwordResetUser.id) {
        return { ...u, password: newPasswordInput.trim(), requiresPasswordChange: false };
      }
      return u;
    });

    setUserList(updated);
    onSaveUsers(updated);
    setPasswordResetUser(null);
    setNewPasswordInput('');
    showToast(`Password updated successfully for ${passwordResetUser.name}!`);
  };

  const handleRegisterNewUser = (newUser: User) => {
    const updated = [newUser, ...userList];
    setUserList(updated);
    onSaveUsers(updated);
    showToast(`Registered new employee account for ${newUser.name}`);
  };

  const handleSaveEmployee = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in required fields: First Name, Last Name, Email');
      return;
    }

    const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`;
    const dept = departments.find(d => d.id === formData.departmentId);
    const isDeptHeadPos = Boolean(formData.position?.toLowerCase().includes('department head') || formData.position?.toLowerCase().includes('head of'));

    if (editingUser) {
      const updated = userList.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            ...formData,
            name: fullName,
            isDepartmentHead: isDeptHeadPos || formData.isDepartmentHead,
            departmentName: dept?.name || formData.departmentName || 'Sales'
          } as User;
        }
        return u;
      });
      setUserList(updated);
      onSaveUsers(updated);
      showToast(`Updated employee profile for ${fullName}`);
    }

    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    const data = sortedUsers.map((u) => ({
      'Employee ID': u.employeeNumber || u.id,
      'Full Name': u.name,
      'Email': u.email,
      'Contact Number': u.contactNumber || 'N/A',
      'Department': u.departmentName,
      'Position': u.position,
      'Category': isDeptHead(u) ? 'Department Head' : 'Regular Employee',
      'User Role': u.role,
      'Employment Status': u.employmentStatus || 'Regular',
      'Date Hired': u.dateHired || 'N/A',
      'Account Status': u.isActive ? (u.approvalStatus === 'pending' ? 'Pending Approval' : 'Active') : 'Inactive'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Directory');
    XLSX.writeFile(workbook, `HDI_Employee_Directory_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const renderUserCard = (u: User) => {
    const isHead = isDeptHead(u);
    const isPending = u.approvalStatus === 'pending' || u.isApproved === false;
    const isActive = u.isActive !== false && !isPending;

    return (
      <div key={u.id} className={`p-5 rounded-2xl border transition-all space-y-3 bg-white dark:bg-slate-800 ${
        isHead ? 'border-purple-200 dark:border-purple-900/60 shadow-sm' :
        isActive ? 'border-slate-200 dark:border-slate-700 shadow-sm' : 
        isPending ? 'border-amber-200 bg-amber-50/20' : 'border-rose-200 bg-rose-50/30 opacity-75'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'} alt={u.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-500/20 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{u.name}</h4>
                {isHead && (
                  <span title="Department Head">
                    <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold truncate">{u.position}</p>
              <p className="text-[10px] text-slate-400 font-mono">ID: {u.employeeNumber || u.id}</p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
            isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
            isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 
            'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {isPending ? 'Pending Approval' : isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <p className="flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Department: <strong>{u.departmentName}</strong></span>
          </p>
          <p className="flex items-center space-x-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{u.email}</span>
          </p>
          <p className="flex items-center space-x-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Status: {u.employmentStatus || 'Regular'}</span>
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            isHead ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {isHead ? 'Department Head' : `Role: ${u.role}`}
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleOpenEdit(u)}
              className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Edit Profile & Department"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setPasswordResetUser(u)}
              className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              title="Reset Password"
            >
              <Key className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleToggleStatus(u.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                u.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
              }`}
              title={u.isActive ? 'Deactivate / Archive Account' : 'Reactivate Account'}
            >
              {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleDeleteUser(u)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              title="Permanently Delete Employee Account"
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
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-brand-300" />
            <h2 className="text-xl font-black tracking-tight">Employee Directory & Account Governance</h2>
          </div>
          <p className="text-xs text-brand-200 mt-1">
            Organized personnel directory categorized automatically by Position & Leadership level.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Employee Account</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Directory</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalEmployees}</p>
          <p className="text-[10px] text-slate-500 font-semibold">Registered Accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Dept Heads</p>
            <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-900 dark:text-purple-100">{totalDeptHeads}</p>
          <p className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">Leadership Accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Active</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{activeCount}</p>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Operational Users</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pending</p>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-100">{pendingCount}</p>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Approval Required</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Inactive</p>
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-100">{inactiveCount}</p>
          <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold">Archived / Suspended</p>
        </div>
      </div>

      {/* Directory Section Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Accounts ({userList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dept_heads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'dept_heads'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-300" />
          <span>Department Heads ({totalDeptHeads})</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'employees'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Regular Employees ({totalEmployees - totalDeptHeads})</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name, Email, Employee ID, Position..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Position Filter */}
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none max-w-[160px] truncate"
          >
            <option value="ALL">All Positions</option>
            {availablePositions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="ALL">All Account Status</option>
            <option value="ACTIVE">Active Users</option>
            <option value="PENDING">Pending Approval</option>
            <option value="INACTIVE">Archived / Inactive</option>
          </select>
        </div>
      </div>

      {/* Directory Sections Render */}
      {activeTab === 'all' ? (
        <div className="space-y-8">
          {/* Section 1: Department Heads */}
          {deptHeadUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-purple-200 dark:border-purple-900/60">
                <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Department Heads ({deptHeadUsers.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptHeadUsers.map(renderUserCard)}
              </div>
            </div>
          )}

          {/* Section 2: Regular Employees */}
          {regularEmployees.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" />
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
            <div className="py-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or dropdown filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found in this section</p>
            </div>
          ) : (
            sortedUsers.map(renderUserCard)
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Reset Password — {passwordResetUser.name}
                </h3>
              </div>
              <button onClick={() => setPasswordResetUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new temporary password..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
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

      {/* Edit Employee & Credentials Modal */}
      {showAddModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <img src={editingUser.avatarUrl} alt={editingUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/20" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                    Edit Employee Profile — {editingUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID: {editingUser.employeeNumber || editingUser.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={formData.contactNumber || ''}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => {
                    const d = departments.find(dep => dep.id === e.target.value);
                    setFormData({ ...formData, departmentId: e.target.value, departmentName: d?.name || '' });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Position Title</label>
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Department Head - Legal / Sales Specialist"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">System User Role</label>
                <select
                  value={formData.role || 'employee'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="dept_head">Department Head</option>
                  <option value="president">President & CEO</option>
                  <option value="pod">POD Officer</option>
                  <option value="hr_admin">HR Administrator</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Employment Status</label>
                <select
                  value={formData.employmentStatus || 'Regular'}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as EmploymentStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Probationary">Probationary</option>
                  <option value="Regular">Regular</option>
                  <option value="Contractual">Contractual</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEmployee}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
