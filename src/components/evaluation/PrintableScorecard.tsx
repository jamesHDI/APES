import React, { useState } from 'react';
import { Evaluation } from '../../types';
import { getLatestAdjustedRating } from '../../services/computationEngine';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';

interface PrintableScorecardProps {
  evaluation: Evaluation;
  formulaConfig?: {
    eligibilityWeight: number;
    coreValuesWeight: number;
  };
  onBack: () => void;
}

type PaperSize = 'a4' | 'letter';

export const PrintableScorecard: React.FC<PrintableScorecardProps> = ({ evaluation, formulaConfig, onBack }) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const eligibilityWeight = Number(formulaConfig?.eligibilityWeight ?? 85);
  const coreValuesWeight = Number(formulaConfig?.coreValuesWeight ?? 15);

  const safeEvaluation = evaluation || ({} as Evaluation);
  const departmentName = safeEvaluation.departmentName || 'General';
  const employeeName = safeEvaluation.employeeName || 'Employee';
  const position = safeEvaluation.position || 'Staff Specialist';
  const appraisalPeriod = safeEvaluation.appraisalPeriod || 'Annual Appraisal';
  const appraisalDate = safeEvaluation.appraisalDate || new Date().toISOString().substring(0, 10);
  const eligibilityScore = Number(safeEvaluation.eligibilityScore || 0);
  const finalRating = Number(safeEvaluation.finalRating || 0);
  const totalCoreValuesWeightedRating = Number(safeEvaluation.totalCoreValuesWeightedRating || 0);
  const kpiRatings = Array.isArray(safeEvaluation.kpiRatings) ? safeEvaluation.kpiRatings : [];
  const coreValueRatings = Array.isArray(safeEvaluation.coreValueRatings) ? safeEvaluation.coreValueRatings : [];
  const devPlan = safeEvaluation.developmentPlan || { strengths: '', areasForImprovement: '', learningNeeds: [] };
  const learningNeeds = Array.isArray(devPlan.learningNeeds) ? devPlan.learningNeeds : [];
  const personnelAction = safeEvaluation.personnelAction || { actionType: 'no_action' };
  const signatures = safeEvaluation.signatures || {};

  const handlePrint = () => {
    const content = document.getElementById('printable-scorecard-content');
    if (!content) { window.print(); return; }

    // ── Clone the DOM so we can safely mutate without touching the live page ──
    const clone = content.cloneNode(true) as HTMLElement;

    // ── Inline all background/color classes as style attributes.
    //    Tailwind uses CSS variables (--tw-bg-opacity) which may not resolve
    //    before print fires in a new window, so we bake the values in directly. ──
    const inlineMap: Array<[string, Record<string, string>]> = [
      ['bg-slate-100', { 'background-color': '#f1f5f9' }],
      ['bg-slate-200', { 'background-color': '#e2e8f0' }],
      ['bg-slate-50',  { 'background-color': '#f8fafc' }],
      ['bg-amber-50',  { 'background-color': '#fffbeb' }],
      ['bg-white',     { 'background-color': '#ffffff' }],
      ['text-hdi-red',    { 'color': '#cc0000' }],
      ['text-brand-700',  { 'color': '#c2440f' }],
      ['text-brand-500',  { 'color': '#ea580c' }],
      ['text-slate-900',  { 'color': '#0f172a' }],
      ['text-slate-700',  { 'color': '#334155' }],
      ['text-slate-600',  { 'color': '#475569' }],
      ['text-slate-500',  { 'color': '#64748b' }],
      ['text-slate-400',  { 'color': '#94a3b8' }],
      ['border-slate-400', { 'border-color': '#94a3b8' }],
      ['border-slate-500', { 'border-color': '#64748b' }],
      ['border-hdi-red',   { 'border-color': '#cc0000' }],
    ];

    inlineMap.forEach(([cls, props]) => {
      clone.querySelectorAll(`.${cls}`).forEach((el) => {
        Object.entries(props).forEach(([prop, val]) => {
          (el as HTMLElement).style.setProperty(prop, val, 'important');
        });
      });
    });

    // ── Strip classes that should be hidden in print ──
    clone.querySelectorAll('.no-print').forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });
    clone.querySelectorAll('.page-break').forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }

    const safePrintName = employeeName;
    const html = clone.outerHTML;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>APES Scorecard — ${safePrintName}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    html, body {
      margin: 0; padding: 0; background: #ffffff;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* Typography utilities */
    .font-bold, .font-semibold, .font-extrabold, .font-black { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .italic { font-style: italic; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .underline { text-decoration: underline; }
    /* Grid & Flex */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .space-y-6 > * + * { margin-top: 16px; }
    .space-y-3 > * + * { margin-top: 8px; }
    .space-y-2 > * + * { margin-top: 6px; }
    .space-y-1 > * + * { margin-top: 3px; }
    .space-x-3 > * + * { margin-left: 8px; }
    .space-x-1\\.5 > * + * { margin-left: 4px; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .col-span-8 { grid-column: span 8 / span 8; }
    .col-span-4 { grid-column: span 4 / span 4; }
    .gap-4 { gap: 10px; }
    .gap-3 { gap: 8px; }
    .gap-2 { gap: 6px; }
    /* Borders & padding */
    .border { border-style: solid; border-width: 1px; }
    .border-b-2 { border-bottom-width: 2px; }
    .border-t-2 { border-top-width: 2px; }
    .border-b { border-bottom-width: 1px; }
    .border-t { border-top-width: 1px; }
    .p-8 { padding: 12px; }
    .p-3 { padding: 6px 8px; }
    .p-2 { padding: 4px 6px; }
    .p-1\\.5 { padding: 3px 5px; }
    .p-1 { padding: 2px 4px; }
    .pb-3 { padding-bottom: 6px; }
    .pt-4 { padding-top: 8px; }
    .pt-2 { padding-top: 4px; }
    .mb-4 { margin-bottom: 8px; }
    .mb-2 { margin-bottom: 4px; }
    .mt-1 { margin-top: 2px; }
    .mt-0\\.5 { margin-top: 1px; }
    .list-disc { list-style-type: disc; }
    .pl-4 { padding-left: 12px; }
    .shrink-0 { flex-shrink: 0; }
    /* Page layout */
    #printable-scorecard-content { width: 100%; max-width: 100%; margin: 0; padding: 0; }
    #printable-scorecard-content > * { margin: 0 !important; }
    #scorecard-page-1 {
      width: 100%; margin: 0; padding: 6mm 4mm;
      page-break-after: always; break-after: page;
    }
    #scorecard-page-2 {
      width: 100%; margin: 0; padding: 6mm 4mm;
      page-break-before: always; break-before: page;
    }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr    { page-break-inside: avoid; }
    thead { page-break-after: avoid; }
    td, th { padding: 4px 6px; }
    /* Image */
    img { max-height: 40px; width: auto; object-fit: contain; }
  </style>
</head>
<body>
  <div id="printable-scorecard-content">${html}</div>
</body>
</html>`);

    printWindow.document.close();

    const doPrint = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => { if (!printWindow.closed) printWindow.close(); }, 2000);
    };

    // Small delay so the new window finishes layout before triggering print
    setTimeout(doPrint, 600);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const page1Elem = document.getElementById('scorecard-page-1');
      const page2Elem = document.getElementById('scorecard-page-2');

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      if (page1Elem) {
        const canvas1 = await html2canvas(page1Elem, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight1, pdfHeight));
      }

      if (page2Elem) {
        pdf.addPage();
        const canvas2 = await html2canvas(page2Elem, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight2, pdfHeight));
      }

      const safeName = (employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safePeriod = (appraisalPeriod || 'Scorecard').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`APES_Scorecard_${safeName}_${safePeriod}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF file. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Evaluation Workspace</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#F28C28] hover:bg-[#E96B1A] text-white text-sm font-bold shadow-md shadow-[#F28C28]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download official PDF file to your computer"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF File'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            title="Open browser print dialog"
          >
            <Printer className="w-4 h-4" />
            <span>Print Scorecard</span>
          </button>
        </div>
      </div>

      {/* Official 2-Page Document Sheet */}
      <div id="printable-scorecard-content" className={`max-w-5xl mx-auto space-y-6 print-${paperSize}`}>
        
        {/* PAGE 1 CONTENT */}
        <div id="scorecard-page-1" className="bg-white text-black p-8 sm:p-10 rounded-none shadow-xl border border-slate-300 space-y-6 leading-snug">
          <div className="flex items-center justify-between border-b-2 border-hdi-red pb-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="shrink-0 flex items-center">
                <img src="/hdi-logo.png" alt="HDI Hive" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                  SCORECARD / PERFORMANCE EVALUATION
                </h1>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  HDI HIVE • STRICTLY CONFIDENTIAL
                </p>
              </div>
            </div>
            <div className="text-left text-[11px] shrink-0">
              <p><strong className="uppercase">DEPARTMENT/SUBSIDIARY:</strong> {departmentName}</p>
              <p><strong className="uppercase">NAME OF EMPLOYEE:</strong> {employeeName}</p>
              <p><strong className="uppercase">APPRAISAL PERIOD:</strong> {appraisalPeriod}</p>
              <p><strong className="uppercase">APPRAISAL DATE:</strong> {appraisalDate}</p>
            </div>
          </div>

          {/* PART 1A HEADER */}
          <div className="bg-slate-100 p-2 font-bold text-center border border-slate-400 uppercase text-[11px] mb-2">
            PART 1A: EVALUATION ON ELIGIBILITY FACTORS (WEIGHT: {eligibilityWeight}%)
            <div className="font-normal text-[10px] lowercase italic text-slate-600 mt-0.5">
              STANDARD: 1- Did not Meet Expectations; 2- Barely Meets Expectations; 3- Meets Expectations; 4- Exceeds Expectations
            </div>
          </div>

          {/* PART 1A TABLE */}
          <table className="w-full border-collapse border border-slate-400 text-[10px]">
            <thead>
              <tr className="bg-slate-200 text-center font-bold border-b border-slate-400">
                <th className="border border-slate-400 p-1.5 w-[14%]">KEY RESULT AREAS (KRA)</th>
                <th className="border border-slate-400 p-1.5 w-[28%]">PERFORMANCE INDICATORS (KPI)</th>
                <th className="border border-slate-400 p-1.5 w-[10%]">SCALE</th>
                <th className="border border-slate-400 p-1.5 w-[24%]">COMMENTS (ACTUAL EVIDENCES - STAR FORMAT)</th>
                <th className="border border-slate-400 p-1.5 w-[8%]">WEIGHT</th>
                <th className="border border-slate-400 p-1.5 w-[6%]">RATING</th>
                <th className="border border-slate-400 p-1.5 w-[10%]">WEIGHTED SCORE</th>
              </tr>
            </thead>
            <tbody>
              {kpiRatings.map((kpi, idx) => {
                const isFirstInKra = idx === 0 || kpiRatings[idx - 1]?.kraName !== kpi.kraName;
                const kraKpis = kpiRatings.filter(k => k.kraName === kpi.kraName);
                const kraWeightSum = kraKpis.reduce((acc, k) => acc + (Number(k.weightPercent) || 0), 0);
                const kraWeightedScoreSum = kraKpis.reduce((acc, k) => acc + (Number(k.weightedScore) || 0), 0).toFixed(2);
                const standards = Array.isArray(kpi.standards) && kpi.standards.length > 0
                  ? [...kpi.standards].sort((a, b) => b.rating - a.rating)  // Sort 4→1 descending like paper
                  : [];
                const weightPercent = Number(kpi.weightPercent || 0);
                const weightedScore = Number(kpi.weightedScore || 0).toFixed(2);
                const activeRating = getLatestAdjustedRating(kpi);
                const stdCount = Math.max(standards.length, 1);

                return (
                  <React.Fragment key={kpi.kpiId || `kpi_${idx}`}>
                    {/* KRA sub-category subheader row */}
                    {isFirstInKra && (
                      <tr className="bg-slate-100 font-bold border-t border-b border-slate-400">
                        <td colSpan={4} className="border border-slate-400 p-1.5 uppercase bg-slate-100">
                          {kpi.kraName || 'GENERAL'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{kraWeightSum}%</td>
                        <td className="border border-slate-400 p-1.5"></td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{kraWeightedScoreSum}</td>
                      </tr>
                    )}

                    {/* KPI rows — one row per standard, matching original paper layout */}
                    {standards.length > 0 ? standards.map((st, stIdx) => (
                      <tr key={`${kpi.kpiId}_st_${st.rating}`} className={activeRating === st.rating ? 'bg-brand-50' : ''}>
                        {/* KRA column: only on the first standard row, spans all standard rows */}
                        {stIdx === 0 && (
                          <td
                            rowSpan={stdCount}
                            className="border border-slate-400 p-1.5 font-semibold align-top"
                          >
                            {kpi.name}
                          </td>
                        )}
                        {/* PERFORMANCE INDICATORS (KPI): the standard description */}
                        <td className={`border border-slate-400 p-1.5 align-middle text-[10px] ${
                          activeRating === st.rating ? 'font-bold text-brand-700' : 'text-slate-700'
                        }`}>
                          {st.description}
                        </td>
                        {/* SCALE */}
                        <td className={`border border-slate-400 p-1.5 text-center align-middle text-[10px] ${
                          activeRating === st.rating ? 'font-bold text-brand-700 underline' : 'text-slate-600'
                        }`}>
                          {st.rating} - {st.rating === 4 ? 'Exceeds' : st.rating === 3 ? 'Meets' : st.rating === 2 ? 'Barely Meets' : 'Did Not Meet'}
                        </td>
                        {/* COMMENTS: only on first row, spans all standard rows */}
                        {stIdx === 0 && (
                          <td
                            rowSpan={stdCount}
                            className="border border-slate-400 p-1.5 align-top text-[9.5px] text-slate-700 italic"
                          >
                            {kpi.comments || ''}
                          </td>
                        )}
                        {/* WEIGHT: only on first row */}
                        {stIdx === 0 && (
                          <td
                            rowSpan={stdCount}
                            className="border border-slate-400 p-1.5 text-center align-middle font-medium"
                          >
                            {weightPercent}%
                          </td>
                        )}
                        {/* RATING: only on first row */}
                        {stIdx === 0 && (
                          <td
                            rowSpan={stdCount}
                            className="border border-slate-400 p-1.5 text-center align-middle font-bold text-sm"
                          >
                            {activeRating > 0 ? activeRating : '-'}
                          </td>
                        )}
                        {/* WEIGHTED SCORE: only on first row */}
                        {stIdx === 0 && (
                          <td
                            rowSpan={stdCount}
                            className="border border-slate-400 p-1.5 text-center align-middle font-bold text-sm"
                          >
                            {weightedScore}
                          </td>
                        )}
                      </tr>
                    )) : (
                      // Fallback when no standards defined
                      <tr>
                        <td className="border border-slate-400 p-1.5 font-semibold align-top">{kpi.name}</td>
                        <td className="border border-slate-400 p-1.5 text-slate-400 italic" colSpan={2}>No standards defined</td>
                        <td className="border border-slate-400 p-1.5 align-top text-[9.5px] italic">{kpi.comments || ''}</td>
                        <td className="border border-slate-400 p-1.5 text-center">{weightPercent}%</td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{activeRating > 0 ? activeRating : '-'}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{weightedScore}</td>
                      </tr>
                    )}

                    {/* Rating Adjustment History row */}
                    {kpi.ratingHistory && kpi.ratingHistory.length > 0 && (
                      <tr key={`${kpi.kpiId}_history`}>
                        <td colSpan={7} className="border border-slate-300 px-3 py-1.5 bg-slate-50">
                          <div className="text-[9px] text-slate-500 font-semibold uppercase mb-1">Rating Adjustment History</div>
                          <div className="flex flex-wrap gap-2">
                            {kpi.ratingHistory.map((entry, hi) => (
                              <div key={hi} className="flex items-center gap-1 text-[9px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                <span className="font-bold capitalize">{entry.role}:</span>
                                <span>{entry.adjustedBy}</span>
                                <span className="text-slate-400">•</span>
                                <span>{entry.previousRating} → <strong>{entry.newRating}</strong></span>
                                {entry.remark && <span className="text-slate-400 italic">({entry.remark})</span>}
                                <span className="text-slate-400">{new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Total Eligibility Summary Row */}
              <tr className="bg-amber-50 font-bold border-t-2 border-slate-500 text-sm">
                <td colSpan={4} className="border border-slate-400 p-2 text-right uppercase">
                  TOTAL WEIGHTED ELIGIBILITY RATING (PART 1A):
                </td>
                <td className="border border-slate-400 p-2 text-center text-brand-700">{eligibilityWeight}%</td>
                <td className="border border-slate-400 p-2"></td>
                <td className="border border-slate-400 p-2 text-center text-hdi-red font-black">
                  {eligibilityScore.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="pt-2 text-right text-[9px] text-slate-400 font-bold uppercase">
            HDI HIVE • STRICTLY CONFIDENTIAL • Page 1 of 2
          </div>
        </div>

        {/* Page Break demarcation */}
        <div className="page-break"></div>

        {/* PAGE 2 CONTENT */}
        <div id="scorecard-page-2" className="bg-white text-black p-8 sm:p-10 rounded-none shadow-xl border border-slate-300 space-y-6 leading-snug">
          
          {/* PART 1B: CORE VALUES */}
          <div className="bg-slate-100 p-2 font-bold text-center border border-slate-400 uppercase text-[11px] mb-2">
            PART 1B: EVALUATION ON SUITABILITY FACTORS (CORE VALUES - WEIGHT: {coreValuesWeight}%)
            <div className="font-normal text-[10px] lowercase italic text-slate-600 mt-0.5">
              (4): Category A Actively promotes core values | (3): Category B Actively supports core values | (2): Category C Not consistent
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-[10.5px] mb-4">
            <thead>
              <tr className="bg-slate-200 text-center font-bold">
                <th className="border border-slate-400 p-2 w-[35%]">EVALUATION ON SUITABILITY FACTORS</th>
                <th className="border border-slate-400 p-2 w-[15%]">ASSESSOR</th>
                <th className="border border-slate-400 p-2 w-[15%]">RATING</th>
                <th className="border border-slate-400 p-2 w-[15%]">WEIGHT</th>
                <th className="border border-slate-400 p-2 w-[20%]">TOTAL WEIGHTED RATING</th>
              </tr>
            </thead>
            <tbody>
              {coreValueRatings.map((cv, idx) => {
                const cvCount = coreValueRatings.length || 1;
                const rawWeight = (cv as any).weightPercent ?? (coreValuesWeight / cvCount);
                const formattedWeight = Number.isInteger(rawWeight)
                  ? `${rawWeight}%`
                  : `${Number(Number(rawWeight).toFixed(2))}%`;
                const weightedScore = Number(cv.weightedScore || 0).toFixed(2);

                return (
                  <React.Fragment key={cv.coreValueId || `cv_${idx}`}>
                    <tr>
                      <td rowSpan={3} className="border border-slate-400 p-2 font-semibold align-top">
                        {cv.name}
                        <p className="text-[10px] font-normal text-slate-600 mt-1">{cv.comments}</p>
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center">POD</td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.podRating || 0}</td>
                      <td rowSpan={3} className="border border-slate-400 p-2 text-center align-middle font-bold">{formattedWeight}</td>
                      <td rowSpan={3} className="border border-slate-400 p-2 text-center align-middle font-bold text-sm">
                        {weightedScore}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-1.5 text-center">Peer</td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.peerRating || 0}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-1.5 text-center">IS (Superior)</td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.isRating || 0}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* PART 1C: EVALUATION SUMMARY */}
          <div className="bg-slate-100 p-2 font-bold text-center border border-slate-400 uppercase text-[11px] mb-2">
            PART 1C: EVALUATION SUMMARY
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <table className="col-span-8 border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-slate-200 text-center font-bold">
                  <th className="border border-slate-400 p-2">COMPONENT</th>
                  <th className="border border-slate-400 p-2">WEIGHT</th>
                  <th className="border border-slate-400 p-2">RATING</th>
                  <th className="border border-slate-400 p-2">TOTAL INDIVIDUAL PERFORMANCE RATING</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold">ELIGIBILITY (Part 1A)</td>
                  <td className="border border-slate-400 p-2 text-center">{eligibilityWeight}%</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">{eligibilityScore.toFixed(2)}</td>
                  <td rowSpan={2} className="border border-slate-400 p-2 text-center align-middle font-black text-lg bg-emerald-50 text-emerald-800">
                    {finalRating.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold">SUITABILITY (Part 1B)</td>
                  <td className="border border-slate-400 p-2 text-center">{coreValuesWeight}%</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">{totalCoreValuesWeightedRating.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* RATING CLASSIFICATION BOX */}
            <div className="col-span-4 border border-slate-400 p-3 bg-slate-50">
              <h5 className="font-bold text-[10px] uppercase border-b border-slate-300 pb-1 mb-2">RATING CLASSIFICATION</h5>
              <div className="space-y-1 text-[9.5px]">
                <p className={finalRating >= 1.00 && finalRating <= 1.99 ? 'font-bold text-rose-700 bg-rose-100 p-1 rounded' : 'text-slate-600'}>
                  1.00 - 1.99 : Did Not Meet Expectations (DME)
                </p>
                <p className={finalRating >= 2.00 && finalRating <= 2.99 ? 'font-bold text-amber-700 bg-amber-100 p-1 rounded' : 'text-slate-600'}>
                  2.00 - 2.99 : Barely Meets Expectations (BME)
                </p>
                <p className={finalRating >= 3.00 && finalRating <= 3.50 ? 'font-bold text-blue-700 bg-blue-100 p-1 rounded' : 'text-slate-600'}>
                  3.00 - 3.50 : Meets Expectations (ME)
                </p>
                <p className={finalRating >= 3.51 && finalRating <= 4.00 ? 'font-bold text-emerald-700 bg-emerald-100 p-1 rounded' : 'text-slate-600'}>
                  3.51 - 4.00 : Exceeds Expectations (EE)
                </p>
              </div>
            </div>
          </div>

          {/* PART 2A: PERSONAL DEVELOPMENT PLAN */}
          <div className="border border-slate-400 p-3 mb-4 space-y-2">
            <h4 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-b border-slate-300">
              PART 2A: PERSONAL DEVELOPMENT PLAN
            </h4>
            <div>
              <p className="font-bold text-[10px] text-slate-700 uppercase">1. KEY STRENGTHS:</p>
              <p className="p-1.5 bg-slate-50 border border-slate-200 min-h-[40px] text-[10.5px]">
                {devPlan.strengths || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-bold text-[10px] text-slate-700 uppercase">2. AREAS FOR IMPROVEMENT:</p>
              <p className="p-1.5 bg-slate-50 border border-slate-200 min-h-[40px] text-[10.5px]">
                {devPlan.areasForImprovement || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-bold text-[10px] text-slate-700 uppercase">3. WORKPLACE LEARNING & DEVELOPMENT NEEDS (Programs/Courses):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                {learningNeeds.length > 0 ? (
                  learningNeeds.map((need, idx) => (
                    <li key={need.id || `need_${idx}`}>
                      <strong>{need.program || 'Development Program'}</strong> — Target Date: {need.targetDate || 'TBD'} (Assigned: {need.responsiblePerson || 'Employee'})
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">No specific learning programs assigned.</li>
                )}
              </ul>
            </div>
          </div>

          {/* PART 2B & 2C: SUMMARIES & SIGNATURES */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            
            {/* Immediate Superior Summary */}
            <div className="border border-slate-400 p-3 space-y-2">
              <h5 className="font-bold uppercase border-b border-slate-300 pb-1 text-[10.5px]">
                PART 2B: IMMEDIATE SUPERIOR'S SUMMARY
              </h5>
              <p className="text-[10px] text-slate-700 italic min-h-[45px]">
                "{safeEvaluation.supervisorSummaryComment || 'No comments added.'}"
              </p>
              <div className="pt-4 border-t border-slate-300 text-center">
                {signatures.supervisor ? (
                  <div className="flex flex-col items-center">
                    <img src={signatures.supervisor.signatureDataUrl} alt="Supervisor Signature" className="h-10 object-contain" />
                    <p className="font-bold underline text-[11px]">{signatures.supervisor.signerName}</p>
                    <p className="text-[9px] text-slate-500">SIGNATURE OVER PRINTED NAME | Date: {signatures.supervisor.signedAt || signatures.supervisor.dateSigned}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 py-4 italic">Pending Immediate Superior Signature</p>
                )}
              </div>
            </div>

            {/* Appraisee Summary */}
            <div className="border border-slate-400 p-3 space-y-2">
              <h5 className="font-bold uppercase border-b border-slate-300 pb-1 text-[10.5px]">
                PART 2C: APPRAISEE'S SUMMARY
              </h5>
              <p className="text-[10px] text-slate-700 italic min-h-[45px]">
                "{safeEvaluation.appraiseeSummaryComment || 'No comments added.'}"
              </p>
              <div className="pt-4 border-t border-slate-300 text-center">
                {signatures.employee ? (
                  <div className="flex flex-col items-center">
                    <img src={signatures.employee.signatureDataUrl} alt="Employee Signature" className="h-10 object-contain" />
                    <p className="font-bold underline text-[11px]">{signatures.employee.signerName}</p>
                    <p className="text-[9px] text-slate-500">SIGNATURE OVER PRINTED NAME | Date: {signatures.employee.signedAt || signatures.employee.dateSigned}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 py-4 italic">Pending Appraisee Signature</p>
                )}
              </div>
            </div>

          </div>

          {/* PART 3: PERSONNEL ACTION */}
          <div className="border border-slate-400 p-3 mb-4 space-y-2">
            <h4 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-b border-slate-300">
              PART 3: PERSONNEL ACTION (To be filled out by the Head of the Department)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="flex items-center space-x-1.5">
                  <input type="checkbox" checked={personnelAction.actionType === 'promotion'} readOnly />
                  <span>Promotion Recommended</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={personnelAction.actionType === 'salary_adjustment'} readOnly />
                  <span>Salary Adjustment</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={personnelAction.actionType === 'regularization'} readOnly />
                  <span>Regularization</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-1.5">
                  <input type="checkbox" checked={personnelAction.actionType === 'transfer'} readOnly />
                  <span>Transfer</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={personnelAction.actionType === 'pip'} readOnly />
                  <span>Performance/ Values Improvement Plan ( PIP/VIP)</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={personnelAction.actionType === 'termination'} readOnly />
                  <span>Termination</span>
                </label>
              </div>
            </div>
            <div className="pt-2 text-[10px] space-y-1">
              <p><strong>New Position:</strong> {personnelAction.newPosition || 'N/A'}</p>
              <p><strong>Date of Effectivity:</strong> {personnelAction.effectiveDate || 'N/A'}</p>
              <p><strong>Department Head Remarks:</strong> {personnelAction.remarks || 'N/A'}</p>
            </div>
          </div>

          {/* PEOPLE'S OPTN / POD & OFFICIAL DIGITAL SIGNATURES BLOCK */}
          <div className="border border-slate-400 p-3 bg-slate-50 space-y-3">
            <h5 className="font-bold uppercase text-[10px] text-slate-800 border-b border-slate-300 pb-1 text-center">
              PART 4: POD / HR EVALUATION & DIGITAL SIGNATURE VERIFICATION
            </h5>
            
            {/* POD Remarks & Validation summary */}
            <div className="text-[10px] space-y-1 bg-white p-2 border border-slate-200">
              <p><strong>POD Core Values Validation Rating:</strong> {totalCoreValuesWeightedRating.toFixed(2)} ({coreValuesWeight}%)</p>
              <p><strong>POD / HR Remarks & Comments:</strong> {safeEvaluation.podValidationComment || 'Validated by People Operations Development (POD).'}</p>
              <p><strong>Personnel Action Final Status:</strong> {personnelAction?.isApproved ? 'Approved & Enforced' : 'Pending Final HR Enforcement'}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-300 text-center">
              {/* Employee Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-slate-500 uppercase">1. Employee Signature</p>
                {signatures.employee ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={signatures.employee.signatureDataUrl} alt="Employee Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{signatures.employee.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{signatures.employee.position || position}</p>
                    <p className="text-[8px] text-slate-500">{signatures.employee.department || departmentName}</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {signatures.employee.dateSigned || signatures.employee.signedAt} {signatures.employee.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">Pending Signature</p>
                )}
              </div>

              {/* Department Head Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-slate-500 uppercase">2. Department Head</p>
                {(signatures.deptHead || signatures.supervisor) ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={(signatures.deptHead || signatures.supervisor)?.signatureDataUrl} alt="DH Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{(signatures.deptHead || signatures.supervisor)?.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{(signatures.deptHead || signatures.supervisor)?.position || 'Department Head'}</p>
                    <p className="text-[8px] text-slate-500">{(signatures.deptHead || signatures.supervisor)?.department || departmentName}</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {(signatures.deptHead || signatures.supervisor)?.dateSigned || (signatures.deptHead || signatures.supervisor)?.signedAt} {(signatures.deptHead || signatures.supervisor)?.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">Pending Signature</p>
                )}
              </div>

              {/* President Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-amber-700 uppercase">3. President & CEO</p>
                {signatures.president ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={signatures.president.signatureDataUrl} alt="Pres Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{signatures.president.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{signatures.president.position || 'President & CEO'}</p>
                    <p className="text-[8px] text-slate-500">Executive Office</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {signatures.president.dateSigned || signatures.president.signedAt} {signatures.president.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">
                    {safeEvaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || safeEvaluation.isDepartmentHead ? 'Pending President Signature' : 'N/A (Regular Track)'}
                  </p>
                )}
              </div>

              {/* POD / HR Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-indigo-700 uppercase">4. POD / HR Officer</p>
                {(signatures.pod || signatures.hr) ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={(signatures.pod || signatures.hr)?.signatureDataUrl} alt="POD Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{(signatures.pod || signatures.hr)?.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{(signatures.pod || signatures.hr)?.position || 'POD Quality Lead'}</p>
                    <p className="text-[8px] text-slate-500">People Operations Dev</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {(signatures.pod || signatures.hr)?.dateSigned || (signatures.pod || signatures.hr)?.signedAt} {(signatures.pod || signatures.hr)?.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">Pending POD Signature</p>
                )}
              </div>

            </div>
          </div>

          <div className="pt-4 text-right text-[9px] text-slate-400 font-bold uppercase">
            HDI HIVE • STRICTLY CONFIDENTIAL • Page 2 of 2
          </div>

        </div>

      </div>
    </div>
  );
};
