import React, { useState } from 'react';
import { EvaluationTemplate, KRACategory, KPITemplateItem, Department, User, Evaluation } from '../../types';
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
  HelpCircle
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate>(
    templates.find(t => t.id === selectedTemplateId) || templates[0]
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      alert('This template cannot be deleted because it is currently in use.');
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
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) setActiveTemplate(tmpl);
  };

  const handleCreateNewTemplate = () => {
    const newId = `tmpl_${Date.now()}`;
    const newTemplate: EvaluationTemplate = {
      id: newId,
      title: 'New Department Scorecard Template',
      departmentId: departments[1]?.id || 'dept_it',
      departmentName: departments[1]?.name || 'IT & SYSTEMS',
      evaluationPeriod: 'January-September 2025',
      formulaConfig: { eligibilityWeight: 85, coreValuesWeight: 15 },
      classificationRanges: [
        { min: 3.51, max: 4.00, label: 'Exceeds Expectations (EE)', code: 'EE', color: 'emerald' },
        { min: 3.00, max: 3.50, label: 'Meets Expectations (ME)', code: 'ME', color: 'blue' },
        { min: 2.00, max: 2.99, label: 'Barely Meets Expectations (BME)', code: 'BME', color: 'amber' },
        { min: 1.00, max: 1.99, label: 'Did Not Meet Expectations (DME)', code: 'DME', color: 'rose' }
      ],
      kraCategories: [
        {
          id: `kra_${Date.now()}`,
          name: '1. TECHNICAL EXCELLENCE',
          categoryWeightPercent: 50,
          kpis: [
            {
              id: `kpi_${Date.now()}_1`,
              kraId: `kra_${Date.now()}`,
              kraName: '1. TECHNICAL EXCELLENCE',
              name: 'A. System Uptime & Reliability',
              description: 'Maintain server uptime standards.',
              weightPercent: 30,
              evidenceRequired: true,
              standards: [
                { rating: 4, label: '4 - Exceeds', description: '99.9% Uptime achieved' },
                { rating: 3, label: '3 - Meets', description: '99.5% Uptime achieved' },
                { rating: 2, label: '2 - Barely Meets', description: '98.0% Uptime achieved' },
                { rating: 1, label: '1 - Did Not Meet', description: 'Below 98.0% Uptime' }
              ]
            }
          ]
        }
      ],
      isActive: true,
      createdAt: new Date().toISOString().substring(0, 10)
    };

    setActiveTemplate(newTemplate);
    setSelectedTemplateId(newId);
    showToast('New template initialized!');
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

  const handleSave = () => {
    onSaveTemplate(activeTemplate);
    showToast('Dynamic Evaluation Template saved successfully!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculate total weights
  const totalKPIWeight = activeTemplate.kraCategories.reduce((acc, kra) => {
    return acc + kra.kpis.reduce((kAcc, kpi) => kAcc + kpi.weightPercent, 0);
  }, 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center space-x-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-6 h-6 text-brand-300" />
            <h2 className="text-xl font-black tracking-tight">Dynamic HR Evaluation Template & KPI Builder</h2>
          </div>
          <p className="text-xs text-brand-200 mt-1 max-w-2xl">
            Create or customize performance scorecards for any department (IT, Sales, Accounting, HR, Operations, Engineering) without modifying source code.
          </p>
        </div>

        <button
          onClick={handleCreateNewTemplate}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold shadow-lg flex items-center space-x-2 shrink-0"
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
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTemplateAction(activeTemplate.id, e)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                    title="Delete Current Template"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Template Changes</span>
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Formula Weights</span>
                <p className="text-[11px] text-slate-500">Eligibility Factors Weight % vs Core Values Weight %</p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-bold">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 mr-1">Eligibility:</span>
                  <input
                    type="number"
                    value={activeTemplate.formulaConfig.eligibilityWeight}
                    onChange={(e) => setActiveTemplate({
                      ...activeTemplate,
                      formulaConfig: { ...activeTemplate.formulaConfig, eligibilityWeight: Number(e.target.value) }
                    })}
                    className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold"
                  />
                  <span className="text-slate-600 dark:text-slate-400 ml-1">%</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 mr-1">Core Values:</span>
                  <input
                    type="number"
                    value={activeTemplate.formulaConfig.coreValuesWeight}
                    onChange={(e) => setActiveTemplate({
                      ...activeTemplate,
                      formulaConfig: { ...activeTemplate.formulaConfig, coreValuesWeight: Number(e.target.value) }
                    })}
                    className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold"
                  />
                  <span className="text-slate-600 dark:text-slate-400 ml-1">%</span>
                </div>
              </div>
            </div>

            {/* Weight Validation Indicator */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
              totalKPIWeight === 85
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Total KPI Weights: {totalKPIWeight}% (Target: 85%)</span>
              </div>
              {totalKPIWeight !== 85 && (
                <span className="text-[11px] font-normal">Adjust KPI weights to total exactly 85%.</span>
              )}
            </div>
          </div>

          {/* KRAs & KPIs Configuration List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                Key Result Areas (KRAs) & KPIs
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
                    <div key={kpi.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
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
                            className="w-full font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
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
                            className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500"
                            placeholder="KPI Description / Performance standard summary"
                          />
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Weight %</label>
                            <input
                              type="number"
                              value={kpi.weightPercent}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updatedKpis = kra.kpis.map(item => item.id === kpi.id ? { ...item, weightPercent: val } : item);
                                const updatedKras = activeTemplate.kraCategories.map(k => k.id === kra.id ? { ...k, kpis: updatedKpis } : k);
                                setActiveTemplate({ ...activeTemplate, kraCategories: updatedKras });
                              }}
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-bold text-xs"
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
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        {kpi.standards.map((st, stIdx) => (
                          <div key={st.rating} className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-400 w-4">{st.rating}:</span>
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
                              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
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
    </div>
  );
};
