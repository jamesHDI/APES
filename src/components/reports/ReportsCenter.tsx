import React, { useState } from 'react';
import { Evaluation, Department, EvaluationTemplate } from '../../types';
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
  templates: EvaluationTemplate[];
}

export const ReportsCenter: React.FC<ReportsCenterProps> = ({ evaluations, departments, templates }) => {
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

  const getWeightsForEvaluation = (evaluation: Evaluation) => {
    const template = templates.find(t => t.id === evaluation.templateId);
    const eligibilityWeight = template?.formulaConfig?.eligibilityWeight ?? 85;
    const coreValuesWeight = template?.formulaConfig?.coreValuesWeight ?? 15;
    return { eligibilityWeight, coreValuesWeight };
  };

  const exportToExcel = () => {
    let exportData: any[] = [];

    if (selectedReportType === 'employee') {
      exportData = filteredEvaluations.map(e => {
        const { eligibilityWeight, coreValuesWeight } = getWeightsForEvaluation(e);
        return {
          'Employee ID': e.employeeId,
          'Employee Name': e.employeeName,
          'Department': e.departmentName,
          'Position': e.position,
          'Appraisal Period': e.appraisalPeriod,
          [`Eligibility Score (${eligibilityWeight}%)`]: e.eligibilityScore,
          [`Core Values Score (${coreValuesWeight}%)`]: e.totalCoreValuesWeightedRating,
          'Total Rating': e.finalRating,
          'Rating Classification': e.ratingClassification,
          'Status': e.status
        };
      });
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
      <div className="hero-card">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFF4EA] dark:from-transparent to-transparent pointer-events-none rounded-r-2xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Reports & Analytics Center</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate, filter, and export performance reports across all departments.
            </p>
          </div>
          <button onClick={exportToExcel} className="btn btn-success btn-sm shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Report Type Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'employee', label: 'Employee Performance Report' },
          { id: 'department', label: 'Departmental Breakdown' },
          { id: 'core_values', label: 'Core Values Summary' },
          { id: 'training', label: 'Training & Development Needs' },
          { id: 'personnel_action', label: 'Personnel Action Recommendations' },
        ].map((item) => {
          const isActive = selectedReportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedReportType(item.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-[#F28C28] text-white border-[#F28C28] shadow-sm shadow-orange-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#F28C28]/40 hover:text-[#E96B1A]'
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or department..."
            className="search-bar-input"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold">Department:</span>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="form-input py-2 text-xs w-auto">
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="apes-table-wrap overflow-x-auto">
        {selectedReportType === 'employee' && (
          <table className="apes-table">
            <thead className="apes-thead">
              <tr>
                <th className="apes-th">Employee</th>
                <th className="apes-th">Department</th>
                {(() => {
                  const { eligibilityWeight, coreValuesWeight } = filteredEvaluations.length > 0
                    ? getWeightsForEvaluation(filteredEvaluations[0])
                    : { eligibilityWeight: 85, coreValuesWeight: 15 };
                  return (
                    <>
                      <th className="apes-th">Eligibility Score ({eligibilityWeight}%)</th>
                      <th className="apes-th">Core Values ({coreValuesWeight}%)</th>
                    </>
                  );
                })()}
                <th className="apes-th">Total Rating</th>
                <th className="apes-th">Classification</th>
                <th className="apes-th">Status</th>
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
                  <td className="p-3 font-semibold uppercase text-[10px] text-slate-500 dark:text-slate-400">{ev.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReportType === 'training' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-400 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
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
                    <td className="p-3 text-slate-600 dark:text-slate-300">{ev.departmentName}</td>
                    <td className="p-3 font-semibold text-brand-700 dark:text-brand-300">{need.program}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{need.targetDate}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{need.responsiblePerson}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {selectedReportType === 'personnel_action' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-400 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
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
                  <td className="p-3 text-slate-600 dark:text-slate-300">{ev.departmentName}</td>
                  <td className="p-3 font-bold text-hdi-red">{ev.finalRating.toFixed(2)}</td>
                  <td className="p-3 font-extrabold uppercase text-purple-700 dark:text-purple-300">
                    {ev.personnelAction.actionType.replace('_', ' ')}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{ev.personnelAction.newPosition || 'N/A'}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{ev.personnelAction.effectiveDate || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
};
