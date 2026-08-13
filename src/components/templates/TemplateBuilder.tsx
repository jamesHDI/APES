import React, { useState } from 'react';
import { EvaluationTemplate, KRACategory, KPITemplateItem, CoreValue, Department, User, Evaluation } from '../../types';
import { createMasterBasedTemplate, MASTER_SALES_EVALUATION_TEMPLATE } from '../../constants/masterSalesTemplate';
import { validateEvaluationTemplate } from '../../services/templateValidation';
import { assignNewEvaluationToEmployee, createDraftEvaluationInMemory } from '../../services/storage';
import { PrintableScorecard } from '../evaluation/PrintableScorecard';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Building2, 
  Layers, 
  Award,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Lock,
  Eye,
  X
} from 'lucide-react';

interface TemplateBuilderProps {
  currentUser?: User;
  templates: EvaluationTemplate[];
  departments: Department[];
  evaluations?: Evaluation[];
  onSaveTemplate: (template: EvaluationTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  currentUser,
  templates,
  departments,
  evaluations,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  // Always fallback to master template if templates array is empty
  const initialList = templates && templates.length > 0 ? templates : [MASTER_SALES_EVALUATION_TEMPLATE];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialList[0]?.id || MASTER_SALES_EVALUATION_TEMPLATE.id);
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate>(
    initialList.find(t => t.id === selectedTemplateId) || initialList[0]
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const canDelete = currentUser?.role === 'system_admin' || currentUser?.role === 'hr_admin' || currentUser?.role === 'pod';

  const handleDeleteTemplateAction = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!canDelete) {
      alert('Only System Administrators and POD Officers can delete evaluation templates.');
      return;
    }

    const tmplToDelete = templates.find(t => t.id === templateId);
    if (!tmplToDelete) return;

    // Check if the template is currently active or assigned to an ongoing evaluation
    const isInUse = evaluations?.some(
      (ev) => ev.templateId === templateId && ev.status !== 'archived'
    );

    if (isInUse) {
      alert('This template cannot be deleted because it is currently in use by an active evaluation.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this evaluation template?')) {
      if (onDeleteTemplate) {
        onDeleteTemplate(templateId);
      }
      const remaining = templates.filter(t => t.id !== templateId);
      if (selectedTemplateId === templateId && remaining.length > 0) {
        setSelectedTemplateId(remaining[0].id);
        setActiveTemplate(remaining[0]);
      }
      showToast('Evaluation template deleted successfully!');
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    setValidationErrors([]);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) setActiveTemplate(tmpl);
  };

  const handleCreateNewTemplate = () => {
    const defaultDept = departments[0] || { id: 'dept_acc', name: 'Accounting' };
    const newTemplate = createMasterBasedTemplate(
      defaultDept.id,
      defaultDept.name,
      `${defaultDept.name} Performance Evaluation Scorecard Template`,
      'January-September 2025'
    );

    onSaveTemplate(newTemplate);
    setActiveTemplate(newTemplate);
    setSelectedTemplateId(newTemplate.id);
    setValidationErrors([]);
    showToast(`New Master-Layout Template initialized for ${defaultDept.name}!`);
  };

  const handleAddKRA = () => {
    const newKra: KRACategory = {
      id: `kra_${Date.now()}`,
      name: `${activeTemplate.kraCategories.length + 1}. NEW KEY RESULT AREA`,
      categoryWeightPercent: 10,
      kpis: []
    };
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: [...activeTemplate.kraCategories, newKra]
    });
  };

  const handleRemoveKRA = (kraId: string) => {
    setActiveTemplate({
      ...activeTemplate,
      kraCategories: activeTemplate.kraCategories.filter(k => k.id !== kraId)
    });
  };

  const handleAddKPI = (kraId: string) => {
    const targetKra = activeTemplate.kraCategories.find(k => k.id === kraId);
    if (!targetKra) return;

    const newKpi: KPITemplateItem = {
      id: `kpi_${Date.now()}`,
      kraId,
      kraName: targetKra.name,
      name: 'New Performance Indicator',
      description: 'KPI description and performance goals.',
      weightPercent: 5,
      evidenceRequired: false,
      standards: [
        { rating: 4, label: '4 - Exceeds', description: 'Exceeds target performance' },
        { rating: 3, label: '3 - Meets', description: 'Meets expected target' },
        { rating: 2, label: '2 - Barely Meets', description: 'Barely meets minimum target' },
        { rating: 1, label: '1 - Did Not Meet', description: 'Fails to meet target' }
      ]
    };

    const updatedKras = activeTemplate.kraCategories.map((k) => {
      if (k.id === kraId) {
        return { ...k, kpis: [...k.kpis, newKpi] };
      }
      return k;
    });

    setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
  };

  const handleRemoveKPI = (kraId: string, kpiId: string) => {
    const updatedKras = activeTemplate.kraCategories.map((k) => {
      if (k.id === kraId) {
        return { ...k, kpis: k.kpis.filter(item => item.id !== kpiId) };
      }
      return k;
    });
    setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
  };

  const handleAddCoreValue = () => {
    const newCoreValue: CoreValue = {
      id: `cv_${Date.now()}`,
      name: 'New Core Value',
      description: 'Core value description.',
      weightPercent: 0,
      sortOrder: (activeTemplate.coreValues?.length || 0) + 1
    };
    setActiveTemplate({
      ...activeTemplate,
      coreValues: [...(activeTemplate.coreValues || []), newCoreValue]
    });
  };

  const handleRemoveCoreValue = (coreValueId: string) => {
    if (!window.confirm('Are you sure you want to remove this Core Value?')) return;
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).filter(cv => cv.id !== coreValueId)
    });
  };

  const handleUpdateCoreValue = (coreValueId: string, field: keyof CoreValue, value: string | number) => {
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).map(cv =>
        cv.id === coreValueId ? { ...cv, [field]: value } : cv
      )
    });
  };

  const recalculateCoreValueWeights = () => {
    const cvCount = activeTemplate.coreValues?.length || 0;
    if (cvCount === 0) return;
    const part1bWeight = activeTemplate.formulaConfig.coreValuesWeight || 0;
    const weightPerCV = Number((part1bWeight / cvCount).toFixed(4));
    setActiveTemplate({
      ...activeTemplate,
      coreValues: (activeTemplate.coreValues || []).map((cv, idx) => ({
        ...cv,
        weightPercent: Number(weightPerCV.toFixed(2)),
        sortOrder: idx + 1
      }))
    });
  };

  const formulaTotal = (activeTemplate.formulaConfig.eligibilityWeight || 0) + (activeTemplate.formulaConfig.coreValuesWeight || 0);
  const isFormulaValid = Math.abs(formulaTotal - 100) < 0.01;
  const totalCoreValueWeight = (activeTemplate.coreValues || []).reduce((sum, cv) => sum + (Number(cv.weightPercent) || 0), 0);
  const isCoreValuesValid = Math.abs(totalCoreValueWeight - (activeTemplate.formulaConfig.coreValuesWeight || 0)) < 0.01;

  const handleSave = () => {
    const valResult = validateEvaluationTemplate(activeTemplate);
    if (!valResult.isValid) {
      setValidationErrors(valResult.errors);
      showToast('Template validation failed. Fix errors before saving.');
      return;
    }
    setValidationErrors([]);
    onSaveTemplate(activeTemplate);
    showToast(`Template "${activeTemplate.title}" saved successfully!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculate total weights
  const totalKPIWeight = activeTemplate.kraCategories.reduce((acc, kra) => {
    return acc + (kra.kpis ? kra.kpis.reduce((kAcc, kpi) => kAcc + (kpi.weightPercent || 0), 0) : 0);
  }, 0);
  const eligibilityTarget = activeTemplate.formulaConfig.eligibilityWeight || 85;
  const isKpiTotalValid = Math.abs(totalKPIWeight - eligibilityTarget) < 0.01;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Validation Errors Box */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 font-extrabold text-xs uppercase text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Template Save Blocked — Validation Requirements Unfulfilled</span>
          </div>
          <ul className="list-disc pl-5 text-xs space-y-1 text-rose-800 dark:text-rose-200">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dynamic HR Evaluation Template & KPI Builder</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Create or customize performance scorecards for any department (IT, Sales, Accounting, HR, Operations, Engineering) without modifying source code.
          </p>
        </div>

        <button
          onClick={handleCreateNewTemplate}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center space-x-2 shrink-0 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Template Selector Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Active Department Templates ({templates.length})
          </h3>

          <div className="space-y-2">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedTemplateId === tmpl.id
                    ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                    {tmpl.departmentName}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">{tmpl.evaluationPeriod}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplateAction(tmpl.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Evaluation Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-2">
                  {tmpl.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {tmpl.kraCategories.length} KRAs • Formula: {tmpl.formulaConfig.eligibilityWeight}% KPI / {tmpl.formulaConfig.coreValuesWeight}% Core Values
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Template Workspace Editor */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            
            {/* Header Settings */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Template Properties</h3>
                <p className="text-xs text-slate-500">Configure department assignment, period, and weights</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap"
                  title="Preview Master Scorecard Layout PDF"
                >
                  Preview Master PDF
                </button>

                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTemplateAction(activeTemplate.id, e)}
                    className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap"
                    title="Delete Current Template"
                  >
                    Delete
                  </button>
                )}

                <button
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-xs font-bold shadow-md transition-all whitespace-nowrap"
                >
                  Save Template Changes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Template Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.title}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target Department
                </label>
                <select
                  value={activeTemplate.departmentId}
                  onChange={(e) => {
                    const dept = departments.find(d => d.id === e.target.value);
                    setActiveTemplate({
                      ...activeTemplate,
                      departmentId: e.target.value,
                      departmentName: dept?.name || 'SALES'
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Formula Weight Configuration */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Formula Weights</span>
                  <p className="text-[11px] text-slate-500">Part 1A Eligibility vs Part 1B Core Values</p>
                </div>
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Part 1A:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={activeTemplate.formulaConfig.eligibilityWeight}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setActiveTemplate({
                          ...activeTemplate,
                          formulaConfig: { ...activeTemplate.formulaConfig, eligibilityWeight: val === '' ? 0 : Number(val) }
                        });
                      }}
                      className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold"
                    />
                    <span className="text-slate-600 dark:text-slate-400 ml-1">%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Part 1B:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={activeTemplate.formulaConfig.coreValuesWeight}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setActiveTemplate({
                          ...activeTemplate,
                          formulaConfig: { ...activeTemplate.formulaConfig, coreValuesWeight: val === '' ? 0 : Number(val) }
                        });
                      }}
                      className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold"
                    />
                    <span className="text-slate-600 dark:text-slate-400 ml-1">%</span>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isFormulaValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center space-x-2">
                  {isFormulaValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>Formula Total: {Number(formulaTotal.toFixed(2))}%</span>
                </div>
                {!isFormulaValid && (
                  <span className="text-[11px] font-normal">Part 1A + Part 1B must total exactly 100%.</span>
                )}
              </div>
            </div>

          {/* Part 1A - EVALUATION ON ELIGIBILITY FACTORS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                EVALUATION ON ELIGIBILITY FACTORS
              </h3>
              <button
                onClick={handleAddKRA}
                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add KRA Category</span>
              </button>
            </div>

            {activeTemplate.kraCategories.map((kra, kraIdx) => (
              <div key={kra.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <input
                    type="text"
                    value={kra.name}
                    onChange={(e) => {
                      const updated = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, name: e.target.value } : k);
                      setActiveTemplate({ ...activeTemplate, kraCategories: updated });
                    }}
                    className="font-bold text-slate-900 dark:text-white text-sm bg-transparent border-b border-brand-300 focus:border-brand-500 outline-none w-full max-w-md"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAddKPI(kra.id)}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                    >
                      + Add KPI
                    </button>
                    <button
                      onClick={() => handleRemoveKRA(kra.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* KPI List under KRA */}
                <div className="space-y-3">
                  {kra.kpis.map((kpi) => (
                    <div key={kpi.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full space-y-2">
                          <input
                            type="text"
                            value={kpi.name}
                            onChange={(e) => {
                              const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, name: e.target.value } : item);
                              const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                              setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                            }}
                            className="w-full font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-500/20"
                            placeholder="KPI Name"
                          />
                          <input
                            type="text"
                            value={kpi.description}
                            onChange={(e) => {
                              const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, description: e.target.value } : item);
                              const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                              setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                            }}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-500/20"
                            placeholder="KPI Description / Performance standard summary"
                          />
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Weight %</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={kpi.weightPercent}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                const numVal = val === '' ? 0 : Number(val);
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, weightPercent: numVal } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-center font-bold text-xs"
                            />
                          </div>

                          <button
                            onClick={() => handleRemoveKPI(kra.id, kpi.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded mt-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rating Standards for Scale 1-4 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        {kpi.standards.map((st, stIdx) => (
                          <div key={st.rating} className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-500 dark:text-slate-400 w-4 shrink-0">{st.rating}:</span>
                            <input
                              type="text"
                              value={st.description}
                              onChange={(e) => {
                                const newSts = [...kpi.standards];
                                newSts[stIdx].description = e.target.value;
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, standards: newSts } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                            />
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>


            {/* Part 1B - EVALUATION ON SUITABILITY FACTORS */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">EVALUATION ON SUITABILITY FACTORS</span>
                  <p className="text-[11px] text-slate-500">Subdivisions of the Part 1B total weight</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={recalculateCoreValueWeights}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                    title="Redistribute Part 1B weight equally among all Core Values"
                  >
                    Recalculate Equally
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoreValue}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Core Value</span>
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isCoreValuesValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Part 1B Total: {activeTemplate.formulaConfig.coreValuesWeight || 0}% • Core Values: {activeTemplate.coreValues?.length || 0} • Sum: {Number(totalCoreValueWeight.toFixed(2))}%</span>
                </div>
                {!isCoreValuesValid && (
                  <span className="text-[11px] font-normal">Core Values must total exactly Part 1B weight.</span>
                )}
              </div>

              <div className="space-y-2">
                {(activeTemplate.coreValues || []).map((cv) => (
                  <div key={cv.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cv.name}
                          onChange={(e) => handleUpdateCoreValue(cv.id, 'name', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                          placeholder="Core Value Name"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cv.weightPercent || 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleUpdateCoreValue(cv.id, 'weightPercent', val === '' ? 0 : Number(val));
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                          placeholder="Weight %"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreValue(cv.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                        title="Remove Core Value"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cv.description || ''}
                      onChange={(e) => handleUpdateCoreValue(cv.id, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs"
                      placeholder="Core Value description"
                    />
                  </div>
                ))}
                {(activeTemplate.coreValues?.length || 0) === 0 && (
                  <p className="text-[11px] text-slate-500 italic">No Core Values defined. Click "Add Core Value" to create one.</p>
                )}
              </div>
            </div>
          </div>
      {/* Live Master Scorecard PDF Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-brand-500" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Live Master Scorecard Layout Preview — {activeTemplate.title}
                </h4>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
              <PrintableScorecard
                evaluation={createDraftEvaluationInMemory(
                  currentUser || { id: 'usr_preview', name: 'Sample Employee', role: 'employee', departmentName: activeTemplate.departmentName, position: 'Position Title' } as User,
                  activeTemplate,
                  activeTemplate.evaluationPeriod
                )}
                formulaConfig={activeTemplate.formulaConfig}
                onBack={() => setShowPreviewModal(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
