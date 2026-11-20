import React, { useState, useMemo } from 'react';
import { User, Department, EvaluationTemplate, EvaluationDeployment, DeploymentStatus, AssignmentType } from '../../types';
import { getStoredDeployments, saveDeployments, getStoredEvaluations, saveEvaluations, assignNewEvaluationToEmployee, saveSingleEvaluation, getStoredTemplates, saveTemplates } from '../../services/storage';
import { saveEvaluationTemplateToSupabase } from '../../services/supabaseService';
import { triggerWorkflowNotification } from '../../services/notificationService';
import { triggerRealtimeBroadcast, isSupabaseConfigured } from '../../services/supabaseClient';
import { sendEvaluationDeploymentEmail } from '../../services/emailService';
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
  AlertCircle,
  Search,
  Filter,
  Check,
  Trash2,
  Bookmark,
  Layers,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface EvaluationDeploymentManagerProps {
  currentUser: User;
  users: User[];
  departments: Department[];
  templates: EvaluationTemplate[];
  onRefreshData: () => void;
  onSaveTemplate?: (template: EvaluationTemplate) => void;
}

export const EvaluationDeploymentManager: React.FC<EvaluationDeploymentManagerProps> = ({
  currentUser,
  users,
  departments,
  templates,
  onRefreshData,
  onSaveTemplate,
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
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [initialStatus, setInitialStatus] = useState<DeploymentStatus>('active');

  // Template Selection & Management State
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateDeptFilter, setTemplateDeptFilter] = useState('all');
  const [templateTab, setTemplateTab] = useState<'available' | 'history' | 'archived'>('available');
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Distinct templates list (deduplicated by ID)
  const allTemplatesList = useMemo(() => {
    const combined = [...templates];
    const uniqueMap = new Map<string, EvaluationTemplate>();
    for (const t of combined) {
      if (t && t.id && !uniqueMap.has(t.id)) {
        uniqueMap.set(t.id, t);
      }
    }
    return Array.from(uniqueMap.values());
  }, [templates]);

  const selectedTemplate = useMemo(() => {
    return allTemplatesList.find(t => t.id === templateId) || allTemplatesList[0];
  }, [allTemplatesList, templateId]);

  const distinctTemplateDepts = useMemo(() => {
    const set = new Set<string>();
    departments.forEach(d => { if (d.name) set.add(d.name); });
    allTemplatesList.forEach(t => { if (t.departmentName) set.add(t.departmentName); });
    return Array.from(set).sort();
  }, [departments, allTemplatesList]);

  const filteredTemplatesForPicker = useMemo(() => {
    return allTemplatesList.filter(t => {
      // Tab filter
      if (templateTab === 'archived') {
        if (!t.isArchived) return false;
      } else if (templateTab === 'history') {
        if (t.isArchived) return false;
        if (t.status !== 'deployed') return false;
      } else {
        // available for deployment
        if (t.isArchived) return false;
        if (t.status === 'deployed') return false;
      }

      // Department filter
      if (templateDeptFilter !== 'all' && t.departmentName && t.departmentName !== templateDeptFilter) {
        return false;
      }

      // Search query filter
      if (templateSearchQuery.trim()) {
        const q = templateSearchQuery.toLowerCase().trim();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDept = (t.departmentName || '').toLowerCase().includes(q);
        const matchOwner = (t.createdByName || t.createdForEmployeeName || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDept && !matchOwner && !matchId) return false;
      }

      return true;
    });
  }, [allTemplatesList, templateTab, templateDeptFilter, templateSearchQuery]);

  // Archive / Restore / Safe Delete Actions
  const handleArchiveTemplate = async (tmplToArchive: EvaluationTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Are you sure you want to archive "${tmplToArchive.title}"? It will be hidden from active deployment selection.`)) return;
    const updated: EvaluationTemplate = {
      ...tmplToArchive,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedByUserId: currentUser.id,
    };
    const existing = getStoredTemplates();
    const updatedList = existing.map((t: EvaluationTemplate) => t.id === tmplToArchive.id ? updated : t);
    saveTemplates(updatedList);
    await saveEvaluationTemplateToSupabase(updated).catch(err => console.warn('[Deployment] Error archiving template:', err));
    if (onSaveTemplate) onSaveTemplate(updated);
    onRefreshData();
    showToast(`Template "${tmplToArchive.title}" archived successfully.`);
  };

  const handleUnarchiveTemplate = async (tmplToUnarchive: EvaluationTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated: EvaluationTemplate = {
      ...tmplToUnarchive,
      isArchived: false,
      archivedAt: undefined,
      archivedByUserId: undefined,
    };
    const existing = getStoredTemplates();
    const updatedList = existing.map((t: EvaluationTemplate) => t.id === tmplToUnarchive.id ? updated : t);
    saveTemplates(updatedList);
    await saveEvaluationTemplateToSupabase(updated).catch(err => console.warn('[Deployment] Error unarchiving template:', err));
    if (onSaveTemplate) onSaveTemplate(updated);
    onRefreshData();
    showToast(`Template "${tmplToUnarchive.title}" restored.`);
  };

  const handleSafeDeleteDraft = async (tmplToDelete: EvaluationTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tmplToDelete.status !== 'draft') {
      alert('Only unfinished draft templates can be safely deleted.');
      return;
    }
    if (!confirm(`Permanently delete unused draft "${tmplToDelete.title}"? This cannot be undone.`)) return;
    const existing = getStoredTemplates();
    const filtered = existing.filter((t: EvaluationTemplate) => t.id !== tmplToDelete.id);
    saveTemplates(filtered);
    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('../../services/supabaseClient');
        await supabase.from('evaluation_templates').delete().eq('id', tmplToDelete.id);
      } catch (err) {
        console.warn('[Deployment] Note deleting draft template in supabase:', err);
      }
    }
    if (templateId === tmplToDelete.id) {
      const remaining = filtered.find((t: EvaluationTemplate) => !t.isArchived);
      if (remaining) setTemplateId(remaining.id);
    }
    onRefreshData();
    showToast(`Draft template "${tmplToDelete.title}" deleted.`);
  };

  const isEligibleUser = (u: User) => {
    if (!u) return false;
    if (u.role === 'system_admin') return false; // System Administrators are administrative-only and not evaluated
    if (u.isActive === false) return false;
    if (u.approvalStatus === 'rejected') return false;
    if (u.isApproved === false) return false;
    return true;
  };

  const eligibleUsers = (users || []).filter(isEligibleUser);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    const template = templates.find(t => t.id === templateId) || templates[0];
    if (!template) {
      alert('Please select an evaluation template.');
      return;
    }

    let targetUsers: User[] = [];
    if (assignmentType === 'all') {
      targetUsers = eligibleUsers;
    } else if (assignmentType === 'departments') {
      const selectedDeptRecords = departments.filter(
        d => selectedDepts.includes(d.id) || selectedDepts.includes(d.name)
      );

      targetUsers = eligibleUsers.filter(u => {
        const uDeptId = (u.departmentId || '').toLowerCase().trim();
        const uDeptName = (u.departmentName || '').toLowerCase().trim();

        return selectedDeptRecords.some(d => {
          const dId = (d.id || '').toLowerCase().trim();
          const dName = (d.name || '').toLowerCase().trim();
          const dCode = (d.code || '').toLowerCase().trim();

          if (uDeptId && (uDeptId === dId || uDeptId === dCode)) return true;
          if (uDeptName && (uDeptName === dName || uDeptName === dCode)) return true;
          if (dName && uDeptName && (dName.includes(uDeptName) || uDeptName.includes(dName))) return true;
          if (dCode && (uDeptId.includes(dCode) || uDeptName.includes(dCode))) return true;

          const dTokens = dName.split(/[\s_,-]+/).filter(t => t.length > 1);
          const uTokens = uDeptName.split(/[\s_,-]+/).filter(t => t.length > 1);
          return dTokens.some(dt => uTokens.includes(dt));
        });
      });
    } else if (assignmentType === 'employees') {
      targetUsers = eligibleUsers.filter(u => {
        const uId = u.id;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();
        return selectedEmps.some(se => {
          const cleanSe = se.toLowerCase().trim();
          return se === uId || cleanSe === uEmail || cleanSe === uName;
        });
      });
    }

    if (targetUsers.length === 0) {
      alert('No employees matched the selected assignment criteria.');
      return;
    }

    const deploymentId = `deploy_${Date.now()}`;

    // Authoritative template synchronization across Evaluation Deployment and Evaluation Template modules:
    // Every deployed template is updated with status 'deployed', cycle association, timestamp, and deploying POD user
    const deployedTemplate: EvaluationTemplate = {
      ...template,
      status: 'deployed',
      isLocked: true,
      deployedAt: new Date().toISOString(),
      deployedByUserId: currentUser.id,
      deployedByName: currentUser.name,
      deploymentCycleId: deploymentId,
      deploymentCycleName: title,
    };
    const existingTemplates = getStoredTemplates();
    const updatedTemplates = existingTemplates.map((t: EvaluationTemplate) => t.id === template.id ? deployedTemplate : t);
    saveTemplates(updatedTemplates);
    saveEvaluationTemplateToSupabase(deployedTemplate).catch((err: any) => {
      console.warn('[Deployment] Note saving deployed template to Supabase:', err);
    });
    if (onSaveTemplate) {
      onSaveTemplate(deployedTemplate);
    }
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
      let failed = 0;
      const errors: string[] = [];
      for (const u of targetUsers) {
        try {
          const newEval = await assignNewEvaluationToEmployee(u, template, period, currentUser.name, title);
          newEval.deploymentId = deploymentId;
          newEval.deadline = endDate;
          newEval.title = title;
          newEval.templateId = template.id;
          newEval.templateTitle = template.title;
          newEval.departmentName = u.departmentName || template.departmentName || 'Admin';
          // Re-save so deploymentId & deadline are persisted to storage & Supabase
          await saveSingleEvaluation(newEval);

          // Resolve the permanent Supabase UUID for notifications to ensure targeted delivery
          let targetUuid = newEval.employeeId || u.id;
          if (isSupabaseConfigured) {
            try {
              const { findEmployeeInSupabase, ensureUuid } = await import('../../services/supabaseService');
              const sbUser = await findEmployeeInSupabase(u.id) || await findEmployeeInSupabase(u.email);
              if (sbUser && sbUser.id && ensureUuid(sbUser.id) === sbUser.id) {
                targetUuid = sbUser.id;
              }
            } catch (e) {
              console.warn('[Deployment] Could not resolve notification target UUID:', e);
            }
          }

          await triggerWorkflowNotification(
            targetUuid,
            newEval,
            'New Evaluation Deployment Activated',
            `Evaluation cycle "${title}" (${period}) has been deployed by ${currentUser.name}. Deadline: ${endDate}.`,
            currentUser.name,
            'action_required'
          );
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Deployment] Failed to deploy evaluation for ${u.name}:`, msg);
          errors.push(`${u.name}: ${msg}`);
        }
      }
      if (failed > 0) {
        alert(
          `Deployment completed with errors.\n\n${failed} out of ${targetUsers.length} employees failed.\n\n` +
          errors.slice(0, 5).join('\n') +
          (errors.length > 5 ? `\n\n...and ${errors.length - 5} more. Check browser console for full details.` : '')
        );
      }
      triggerRealtimeBroadcast('data_changed', { type: 'evaluation_deployment', deploymentId });
      triggerRealtimeBroadcast('template_workflow', {
        templateId: template.id,
        status: 'deployed',
        action: 'deploy',
        deploymentId,
        deploymentCycleName: title,
        deployedByName: currentUser.name,
        timestamp: new Date().toISOString()
      });

      // Send Outlook / inbox email notification to each assigned employee
      const emailRecipients = targetUsers
        .filter(u => u.email && u.email.includes('@'))
        .map(u => ({ name: u.name, email: u.email }));

      if (emailRecipients.length > 0) {
        try {
          const emailResult = await sendEvaluationDeploymentEmail({
            recipients: emailRecipients,
            deploymentTitle: title,
            period,
            deadline: endDate,
            deployedBy: currentUser.name,
          });
          if (emailResult) {
            console.log(`[Deployment] Email notifications: ${emailResult.sent} sent, ${emailResult.failed} failed.`);
          }
        } catch (emailErr) {
          // Email failure should never block the deployment from completing
          console.warn('[Deployment] Email notification error (non-critical):', emailErr);
        }
      }
    }

    showToast(`Successfully deployed evaluation cycle to ${targetUsers.length} employee(s)!`);
    setIsModalOpen(false);
    onRefreshData();
   };

  const [extendModal, setExtendModal] = useState<{
    isOpen: boolean;
    deployment: EvaluationDeployment | null;
    newDeadline: string;
    isReactivating: boolean;
  }>({
    isOpen: false,
    deployment: null,
    newDeadline: '',
    isReactivating: false,
  });

  const handleUpdateStatus = (id: string, newStatus: DeploymentStatus, newEndDate?: string) => {
    const updated = deployments.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: newStatus,
          endDate: newEndDate || d.endDate,
          updatedAt: new Date().toISOString().substring(0, 10)
        };
      }
      return d;
    });
    setDeployments(updated);
    saveDeployments(updated);

    // If a new deadline is specified, also sync deadline across evaluations assigned under this deployment
    if (newEndDate) {
      try {
        const allEvals = getStoredEvaluations();
        const updatedEvals = allEvals.map(e => {
          if (e.deploymentId === id || (!e.deploymentId && e.appraisalPeriod === updated.find(d => d.id === id)?.period)) {
            return { ...e, deadline: newEndDate };
          }
          return e;
        });
        saveEvaluations(updatedEvals);
      } catch (err) {
        console.warn('[Deployment] Could not sync deadline to stored evaluations:', err);
      }
    }

    triggerRealtimeBroadcast('data_changed', { type: 'evaluation_deployment', deploymentId: id, status: newStatus });

    if (newStatus === 'closed') {
      showToast(`Deployment campaign CLOSED. Intended recipients can no longer open, access, or edit evaluations under this campaign.`);
    } else if (newStatus === 'active') {
      showToast(`Deployment campaign ACTIVATED.${newEndDate ? ` Deadline set to ${newEndDate}.` : ''} Intended recipients can now access and complete their evaluations.`);
    } else {
      showToast(`Deployment campaign status updated to ${newStatus.toUpperCase()}`);
    }
    onRefreshData();
  };

  const handleActivateClick = (dep: EvaluationDeployment) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const isPastDeadline = Boolean(dep.endDate && dep.endDate < todayStr);
    if (isPastDeadline) {
      // If overdue, prompt with reactivate modal to set a new active deadline
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 14);
      setExtendModal({
        isOpen: true,
        deployment: dep,
        newDeadline: nextDate.toISOString().substring(0, 10),
        isReactivating: true,
      });
    } else {
      handleUpdateStatus(dep.id, 'active');
    }
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
                      <div className="inline-flex flex-col items-start px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 leading-tight">
                        <span>{dep.assignmentType}</span>
                        <span className="whitespace-nowrap font-extrabold text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                          ({dep.totalAssigned} USERS)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <div>{dep.startDate} → {dep.endDate}</div>
                      {dep.endDate && dep.endDate < new Date().toISOString().substring(0, 10) && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        dep.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                          : dep.status === 'scheduled'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : dep.status === 'closed'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
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
                          onClick={() => handleActivateClick(dep)}
                          className="btn btn-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          title="Activate campaign so intended recipients can access and edit"
                        >
                          Activate
                        </button>
                      )}
                      {dep.status === 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(dep.id, 'closed')}
                          className="btn btn-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                          title="Close campaign and restrict recipient access"
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setExtendModal({
                            isOpen: true,
                            deployment: dep,
                            newDeadline: dep.endDate,
                            isReactivating: false,
                          });
                        }}
                        className="btn btn-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold"
                        title="Extend or change campaign deadline"
                      >
                        Extend
                      </button>
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

                {/* Searchable & Filterable Evaluation Template Selector */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Selected Evaluation Scorecard / Template
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
                      className="text-xs font-bold text-[#E96B1A] hover:underline flex items-center space-x-1"
                    >
                      <span>{isTemplatePickerOpen ? 'Close Selector' : 'Change Template'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTemplatePickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Active Selected Card Display */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#E96B1A]/10 text-[#E96B1A] dark:text-[#f97316]">
                          v{selectedTemplate?.version || 1}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {selectedTemplate?.departmentName || 'All Departments'}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          selectedTemplate?.status === 'deployed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : selectedTemplate?.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {selectedTemplate?.status === 'deployed' 
                            ? 'Deployed / Active' 
                            : selectedTemplate?.status === 'draft' 
                            ? 'Draft (Auto-Promotes)' 
                            : 'Approved for Deployment'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {selectedTemplate?.title || 'No Template Selected'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Author: {selectedTemplate?.createdByName || selectedTemplate?.createdForEmployeeName || 'POD Administration'}
                        {selectedTemplate?.deploymentCycleName && ` • Previously deployed in "${selectedTemplate.deploymentCycleName}"`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTemplatePickerOpen(!isTemplatePickerOpen)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0"
                    >
                      {isTemplatePickerOpen ? 'Hide' : 'Browse'}
                    </button>
                  </div>

                  {/* Expandable Searchable Picker Panel */}
                  {isTemplatePickerOpen && (
                    <div className="mt-2.5 p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 shadow-md space-y-3">
                      {/* Search and Filters */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[180px]">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={templateSearchQuery}
                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            placeholder="Search by title, author, department, or version..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        <select
                          value={templateDeptFilter}
                          onChange={(e) => setTemplateDeptFilter(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                        >
                          <option value="all">All Departments</option>
                          {distinctTemplateDepts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Picker Tabs */}
                      <div className="flex items-center space-x-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <button
                          type="button"
                          onClick={() => setTemplateTab('available')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            templateTab === 'available'
                              ? 'bg-[#E96B1A] text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Available for Deployment ({allTemplatesList.filter(t => !t.isArchived && t.status !== 'deployed').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateTab('history')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            templateTab === 'history'
                              ? 'bg-[#E96B1A] text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Deployment History ({allTemplatesList.filter(t => !t.isArchived && t.status === 'deployed').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateTab('archived')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            templateTab === 'archived'
                              ? 'bg-slate-700 text-white shadow-sm'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Archived ({allTemplatesList.filter(t => t.isArchived).length})
                        </button>
                      </div>

                      {/* Templates List */}
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {filteredTemplatesForPicker.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            No templates match the current filter criteria.
                          </div>
                        ) : (
                          filteredTemplatesForPicker.map((tmpl) => {
                            const isChosen = templateId === tmpl.id;
                            return (
                              <div
                                key={tmpl.id}
                                onClick={() => {
                                  setTemplateId(tmpl.id);
                                  setIsTemplatePickerOpen(false);
                                }}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                  isChosen
                                    ? 'bg-orange-50 dark:bg-orange-950/40 border-[#E96B1A] ring-1 ring-[#E96B1A]/40'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                      v{tmpl.version || 1}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-500">
                                      {tmpl.departmentName || 'General'}
                                    </span>
                                    {tmpl.status === 'draft' && (
                                      <span className="text-[8.5px] font-bold px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        Draft
                                      </span>
                                    )}
                                    {tmpl.isReusable && (
                                      <span className="text-[8.5px] font-bold px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                        Reusable
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {tmpl.title}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Author: {tmpl.createdByName || tmpl.createdForEmployeeName || 'POD'}
                                    {tmpl.deploymentCycleName && ` • Cycle: ${tmpl.deploymentCycleName}`}
                                  </p>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTemplateId(tmpl.id);
                                      setIsTemplatePickerOpen(false);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                      isChosen
                                        ? 'bg-[#E96B1A] text-white'
                                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isChosen ? 'Selected' : 'Select'}
                                  </button>

                                  {/* Archive / Unarchive Action */}
                                  {tmpl.isArchived ? (
                                    <button
                                      type="button"
                                      onClick={(e) => handleUnarchiveTemplate(tmpl, e)}
                                      className="p-1 text-emerald-600 hover:text-emerald-500 rounded"
                                      title="Restore Template"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => handleArchiveTemplate(tmpl, e)}
                                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                      title="Archive Template"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Safe Delete Draft Action (only if draft and not deployed) */}
                                  {tmpl.status === 'draft' && !tmpl.deploymentCycleId && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleSafeDeleteDraft(tmpl, e)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      title="Delete Unused Draft"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
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

              {/* Specific Employees Selection List */}
              {assignmentType === 'employees' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Select Target Employees ({selectedEmps.length} selected):
                    </p>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedEmps(eligibleUsers.map(u => u.id))}
                        className="font-bold text-[#E96B1A] hover:underline"
                      >
                        Select All ({eligibleUsers.length})
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEmps([])}
                        className="font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={empSearchQuery}
                      onChange={(e) => setEmpSearchQuery(e.target.value)}
                      placeholder="Search by name, position, or department..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-white dark:bg-slate-950 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {eligibleUsers
                      .filter(u => {
                        const q = empSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (u.name || '').toLowerCase().includes(q) ||
                          (u.position || '').toLowerCase().includes(q) ||
                          (u.departmentName || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          (u.employeeNumber || '').toLowerCase().includes(q)
                        );
                      })
                      .map((u) => {
                        const isChecked = selectedEmps.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${
                              isChecked ? 'bg-orange-50/80 dark:bg-orange-950/30' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmps(prev => [...prev, u.id]);
                                  } else {
                                    setSelectedEmps(prev => prev.filter(id => id !== u.id));
                                  }
                                }}
                                className="rounded text-[#E96B1A] focus:ring-[#E96B1A] w-3.5 h-3.5"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {u.name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {u.position || 'Employee'} • {u.departmentName || 'No Dept'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                              {u.employeeNumber || ''}
                            </span>
                          </label>
                        );
                      })}
                    {eligibleUsers.filter(u => {
                      const q = empSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.position || '').toLowerCase().includes(q) ||
                        (u.departmentName || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.employeeNumber || '').toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center">
                        No employees found matching "{empSearchQuery}".
                      </p>
                    )}
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

      {/* Extend Deadline / Reactivate Campaign Modal */}
      {extendModal.isOpen && extendModal.deployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 relative">
            <button
              onClick={() => setExtendModal({ isOpen: false, deployment: null, newDeadline: '', isReactivating: false })}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {extendModal.isReactivating ? 'Reactivate Campaign & Set Deadline' : 'Extend Campaign Deadline'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                  {extendModal.deployment.title}
                </p>
              </div>
            </div>

            {extendModal.isReactivating && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                The deadline for this campaign had expired ({extendModal.deployment.endDate}). Setting a future deadline will reactivate the campaign and allow intended recipients to access and complete their evaluations.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New Deadline Date
              </label>
              <input
                type="date"
                value={extendModal.newDeadline}
                onChange={(e) => setExtendModal(prev => ({ ...prev, newDeadline: e.target.value }))}
                min={new Date().toISOString().substring(0, 10)}
                className="input text-sm w-full font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setExtendModal({ isOpen: false, deployment: null, newDeadline: '', isReactivating: false })}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!extendModal.newDeadline) {
                    alert('Please select a valid deadline date.');
                    return;
                  }
                  handleUpdateStatus(
                    extendModal.deployment!.id,
                    extendModal.isReactivating ? 'active' : extendModal.deployment!.status,
                    extendModal.newDeadline
                  );
                  setExtendModal({ isOpen: false, deployment: null, newDeadline: '', isReactivating: false });
                }}
                className="btn btn-primary btn-sm font-bold shadow-md"
              >
                {extendModal.isReactivating ? 'Reactivate Campaign' : 'Save New Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
