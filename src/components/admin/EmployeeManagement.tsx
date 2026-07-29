import React, { useState } from 'react';
import { User, Department, Role, EmploymentStatus } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit3, 
  UserX, 
  UserCheck, 
  X, 
  CheckCircle2, 
  FileSpreadsheet,
  Building2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Key
} from 'lucide-react';
import { RegisterEmployeeModal } from '../auth/RegisterEmployeeModal';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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

  const filteredUsers = userList.filter((u) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.employeeNumber && u.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDept = filterDept === 'ALL' || u.departmentName === filterDept;
    const matchesActive = filterStatus === 'ALL' || (filterStatus === 'ACTIVE' ? u.isActive : !u.isActive);

    return matchesSearch && matchesDept && matchesActive;
  });

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

    if (editingUser) {
      const updated = userList.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            ...formData,
            name: fullName,
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
    const data = filteredUsers.map((u) => ({
      'Employee ID': u.id,
      'Employee Number': u.employeeNumber || 'N/A',
      'First Name': u.firstName || '',
      'Middle Name': u.middleName || '',
      'Last Name': u.lastName || '',
      'Full Name': u.name,
      'Email': u.email,
      'Contact Number': u.contactNumber || 'N/A',
      'Department': u.departmentName,
      'Position': u.position,
      'User Role': u.role,
      'Employment Status': u.employmentStatus || 'Regular',
      'Date Hired': u.dateHired || 'N/A',
      'Immediate Supervisor': u.immediateSuperiorName || 'N/A',
      'Active Status': u.isActive ? 'Active' : 'Inactive'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `HDI_Employee_Directory_${new Date().toISOString().substring(0, 10)}.xlsx`);
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
      <div className="bg-gradient-to-r from-brand-900 via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-brand-300" />
            <h2 className="text-xl font-black tracking-tight">Employee Directory & Account Registration</h2>
          </div>
          <p className="text-xs text-brand-200 mt-1">
            Manage complete personnel profiles, credentials, department assignments, and PBAC permissions.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold shadow-lg flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Employee Account</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, employee ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Employees</option>
            <option value="INACTIVE">Archived / Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <div key={u.id} className={`p-5 rounded-2xl border transition-all space-y-3 bg-white dark:bg-slate-800 ${
            u.isActive ? 'border-slate-200 dark:border-slate-700 shadow-sm' : 'border-rose-200 bg-rose-50/30 opacity-70'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img src={u.avatarUrl} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-brand-500/20" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</h4>
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{u.position}</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <p className="flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department: <strong>{u.departmentName}</strong></span>
              </p>
              <p className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{u.email}</span>
              </p>
              <p className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Status: {u.employmentStatus || 'Regular'}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                Role: {u.role}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Edit Profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleStatus(u.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    u.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title={u.isActive ? 'Deactivate / Archive Employee' : 'Reactivate Employee'}
                >
                  {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Register Modal */}
      <RegisterEmployeeModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegisterUser={handleRegisterNewUser}
        departments={departments}
        users={users}
      />

    </div>
  );
};
