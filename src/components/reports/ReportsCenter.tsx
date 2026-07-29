import React, { useState } from 'react';
import { Evaluation, Department } from '../../types';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  Award, 
  TrendingUp, 
  BookOpen, 
  UserCheck 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsCenterProps {
  evaluations: Evaluation[];
  departments: Department[];
}

export const ReportsCenter: React.FC<ReportsCenterProps> = ({ evaluations, departments }) => {
  const [selectedReportType, setSelectedReportType] = useState<
    'employee' | 'department' | 'core_values' | 'training' | 'personnel_action'
  >('employee');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  const filteredEvaluations = evaluations.filter((ev) => {
    const matchesSearch = ev.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ev.departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'ALL' || ev.departmentName === filterDept;
    return matchesSearch && matchesDept;
  });

  const exportToExcel = () => {
    let exportData: any[] = [];

    if (selectedReportType === 'employee') {
      exportData = filteredEvaluations.map(e => ({
        'Employee ID': e.employeeId,
        'Employee Name': e.employeeName,
        'Department': e.departmentName,
        'Position': e.position,
        'Appraisal Period': e.appraisalPeriod,
        'Eligibility Score (85%)': e.eligibilityScore,
        'Core Values Score (15%)': e.totalCoreValuesWeightedRating,
        'Total Rating': e.finalRating,
        'Rating Classification': e.ratingClassification,
        'Status': e.status
      }));
    } else if (selectedReportType === 'training') {
      filteredEvaluations.forEach(e => {
        e.developmentPlan.learningNeeds.forEach(ln => {
          exportData.push({
            'Employee Name': e.employeeName,
            'Department': e.departmentName,
            'Recommended Course / Program': ln.program,
            'Target Completion Date': ln.targetDate,
            'Responsible Person': ln.responsiblePerson,
            'Progress %': ln.progressPercent
          });
        });
      });
    } else if (selectedReportType === 'personnel_action') {
      exportData = filteredEvaluations.map(e => ({
        'Employee Name': e.employeeName,
        'Department': e.departmentName,
        'Final Rating': e.finalRating,
        'Classification': e.ratingClassification,
        'Recommended Action': e.personnelAction.actionType.toUpperCase(),
        'New Position': e.personnelAction.newPosition || 'N/A',
        'Effective Date': e.personnelAction.effectiveDate || 'N/A',
        'Remarks': e.personnelAction.remarks || ''
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'APES_Report');
    XLSX.writeFile(workbook, `APES_${selectedReportType}_Report_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-brand-300" />
            <h2 className="text-xl font-black tracking-tight">Enterprise Reports & Analytics Center</h2>
          </div>
          <p className="text-xs text-brand-200 mt-1">
            Generate, filter, and export performance reports across all departments in Excel and PDF formats.
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center space-x-2 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export to Excel (.xlsx)</span>
        </button>
      </div>

      {/* Report Type Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'employee', label: 'Employee Performance Report', icon: UserCheck },
          { id: 'department', label: 'Departmental Breakdown', icon: Award },
          { id: 'core_values', label: 'Core Values Summary', icon: TrendingUp },
          { id: 'training', label: 'Training & Development Needs', icon: BookOpen },
          { id: 'personnel_action', label: 'Personnel Action Recommendations', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = selectedReportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedReportType(item.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-bold uppercase">Filter Dept:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
        
        {selectedReportType === 'employee' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Eligibility Score (85%)</th>
                <th className="p-3">Core Values (15%)</th>
                <th className="p-3">Total Rating</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEvaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{ev.employeeName}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{ev.departmentName}</td>
                  <td className="p-3 font-bold text-brand-600">{ev.eligibilityScore.toFixed(2)}</td>
                  <td className="p-3 font-bold text-purple-600">{ev.totalCoreValuesWeightedRating.toFixed(2)}</td>
                  <td className="p-3 font-black text-hdi-red text-sm">{ev.finalRating.toFixed(2)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                      {ev.ratingClassification}
                    </span>
                  </td>
                  <td className="p-3 font-semibold uppercase text-[10px] text-slate-500">{ev.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReportType === 'training' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Recommended Program / Course</th>
                <th className="p-3">Target Completion Date</th>
                <th className="p-3">Responsible Party</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEvaluations.map((ev) => 
                ev.developmentPlan.learningNeeds.map((need) => (
                  <tr key={need.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{ev.employeeName}</td>
                    <td className="p-3 text-slate-600">{ev.departmentName}</td>
                    <td className="p-3 font-semibold text-brand-700 dark:text-brand-300">{need.program}</td>
                    <td className="p-3 text-slate-500">{need.targetDate}</td>
                    <td className="p-3 text-slate-600">{need.responsiblePerson}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {selectedReportType === 'personnel_action' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Final Rating</th>
                <th className="p-3">Recommended Personnel Action</th>
                <th className="p-3">New Position / Notes</th>
                <th className="p-3">Effective Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEvaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{ev.employeeName}</td>
                  <td className="p-3 text-slate-600">{ev.departmentName}</td>
                  <td className="p-3 font-bold text-hdi-red">{ev.finalRating.toFixed(2)}</td>
                  <td className="p-3 font-extrabold uppercase text-purple-700 dark:text-purple-300">
                    {ev.personnelAction.actionType.replace('_', ' ')}
                  </td>
                  <td className="p-3 text-slate-600">{ev.personnelAction.newPosition || 'N/A'}</td>
                  <td className="p-3 text-slate-500">{ev.personnelAction.effectiveDate || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
};
