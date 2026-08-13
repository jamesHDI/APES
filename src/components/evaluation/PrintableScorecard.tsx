import React, { useState } from 'react';
import { Evaluation } from '../../types';
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

  const eligibilityWeight = formulaConfig?.eligibilityWeight ?? 85;
  const coreValuesWeight = formulaConfig?.coreValuesWeight ?? 15;

  const handlePrint = () => {
    window.print();
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

      const safeName = (evaluation.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safePeriod = (evaluation.appraisalPeriod || 'Scorecard').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`APES_Scorecard_${safeName}_${safePeriod}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF file. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const paperSizeLabels: Record<PaperSize, string> = {
    a4: 'A4',
    letter: 'Letter',
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
              <div className="bg-white rounded-lg p-1 border border-slate-200 shadow-sm shrink-0">
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
            <div className="text-right text-[11px]">
              <p><strong className="uppercase">DEPARTMENT/SUBSIDIARY:</strong> {evaluation.departmentName}</p>
              <p><strong className="uppercase">NAME OF EMPLOYEE:</strong> {evaluation.employeeName}</p>
              <p><strong className="uppercase">APPRAISAL PERIOD:</strong> {evaluation.appraisalPeriod}</p>
              <p><strong className="uppercase">APPRAISAL DATE:</strong> {evaluation.appraisalDate}</p>
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
          <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
            <thead>
              <tr className="bg-slate-200 text-center font-bold border-b border-slate-400">
                <th className="border border-slate-400 p-2 w-[22%]">KEY RESULT AREAS (KRA)</th>
                <th className="border border-slate-400 p-2 w-[42%]">PERFORMANCE INDICATORS (KPI)</th>
                <th className="border border-slate-400 p-2 w-[16%]">SCALE STANDARDS</th>
                <th className="border border-slate-400 p-2 w-[8%]">WEIGHT</th>
                <th className="border border-slate-400 p-2 w-[6%]">RATING</th>
                <th className="border border-slate-400 p-2 w-[6%]">WEIGHTED SCORE</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.kpiRatings.map((kpi, idx) => {
                const isFirstInKra = idx === 0 || evaluation.kpiRatings[idx - 1].kraName !== kpi.kraName;
                const kraKpis = evaluation.kpiRatings.filter(k => k.kraName === kpi.kraName);
                const kraWeightSum = kraKpis.reduce((acc, k) => acc + k.weightPercent, 0);
                const kraWeightedScoreSum = kraKpis.reduce((acc, k) => acc + k.weightedScore, 0).toFixed(2);

                return (
                  <React.Fragment key={kpi.kpiId}>
                    {/* Category Subheader */}
                    {isFirstInKra && (
                      <tr className="bg-slate-100 font-bold border-t border-b border-slate-400">
                        <td colSpan={3} className="border border-slate-400 p-1.5 uppercase bg-slate-100">
                          {kpi.kraName}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{kraWeightSum}%</td>
                        <td className="border border-slate-400 p-1.5"></td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{kraWeightedScoreSum}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="border border-slate-400 p-2 font-semibold align-top">
                        {kpi.name}
                      </td>
                      <td className="border border-slate-400 p-2 align-top text-slate-700">
                        {kpi.comments || kpi.name}
                      </td>
                      <td className="border border-slate-400 p-1.5 align-top text-[9.5px]">
                        {kpi.standards.map((st) => (
                          <div key={st.rating} className={`py-0.5 ${kpi.supervisorRating === st.rating ? 'font-bold text-brand-700 underline' : ''}`}>
                            {st.description} ({st.rating})
                          </div>
                        ))}
                      </td>
                      <td className="border border-slate-400 p-2 text-center align-middle font-medium">{kpi.weightPercent}%</td>
                      <td className="border border-slate-400 p-2 text-center align-middle font-bold text-sm">{kpi.supervisorRating || kpi.selfRating || '-'}</td>
                      <td className="border border-slate-400 p-2 text-center align-middle font-bold text-sm">{kpi.weightedScore.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Total Eligibility Summary Row */}
              <tr className="bg-amber-50 font-bold border-t-2 border-slate-500 text-sm">
                <td colSpan={3} className="border border-slate-400 p-2 text-right uppercase">
                  TOTAL WEIGHTED ELIGIBILITY RATING (PART 1A):
                </td>
                <td className="border border-slate-400 p-2 text-center text-brand-700">{eligibilityWeight}%</td>
                <td className="border border-slate-400 p-2"></td>
                <td className="border border-slate-400 p-2 text-center text-hdi-red font-black">
                  {evaluation.eligibilityScore.toFixed(2)}
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
              {evaluation.coreValueRatings.map((cv) => (
                <React.Fragment key={cv.coreValueId}>
                  <tr>
                    <td rowSpan={3} className="border border-slate-400 p-2 font-semibold align-top">
                      {cv.name}
                      <p className="text-[10px] font-normal text-slate-600 mt-1">{cv.comments}</p>
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center">POD</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.podRating}</td>
                    <td rowSpan={3} className="border border-slate-400 p-2 text-center align-middle font-bold">{coreValuesWeight}%</td>
                    <td rowSpan={3} className="border border-slate-400 p-2 text-center align-middle font-bold text-sm">
                      {cv.weightedScore.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-1.5 text-center">Peer</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.peerRating}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-1.5 text-center">IS (Superior)</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{cv.isRating}</td>
                  </tr>
                </React.Fragment>
              ))}
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
                  <td className="border border-slate-400 p-2 text-center font-bold">{evaluation.eligibilityScore.toFixed(2)}</td>
                  <td rowSpan={2} className="border border-slate-400 p-2 text-center align-middle font-black text-lg bg-emerald-50 text-emerald-800">
                    {evaluation.finalRating.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold">SUITABILITY (Part 1B)</td>
                  <td className="border border-slate-400 p-2 text-center">{coreValuesWeight}%</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">{evaluation.totalCoreValuesWeightedRating.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* RATING CLASSIFICATION BOX */}
            <div className="col-span-4 border border-slate-400 p-3 bg-slate-50">
              <h5 className="font-bold text-[10px] uppercase border-b border-slate-300 pb-1 mb-2">RATING CLASSIFICATION</h5>
              <div className="space-y-1 text-[9.5px]">
                <p className={evaluation.finalRating >= 1.00 && evaluation.finalRating <= 1.99 ? 'font-bold text-rose-700 bg-rose-100 p-1 rounded' : 'text-slate-600'}>
                  1.00 - 1.99 : Did Not Meet Expectations (DME)
                </p>
                <p className={evaluation.finalRating >= 2.00 && evaluation.finalRating <= 2.99 ? 'font-bold text-amber-700 bg-amber-100 p-1 rounded' : 'text-slate-600'}>
                  2.00 - 2.99 : Barely Meets Expectations (BME)
                </p>
                <p className={evaluation.finalRating >= 3.00 && evaluation.finalRating <= 3.50 ? 'font-bold text-blue-700 bg-blue-100 p-1 rounded' : 'text-slate-600'}>
                  3.00 - 3.50 : Meets Expectations (ME)
                </p>
                <p className={evaluation.finalRating >= 3.51 && evaluation.finalRating <= 4.00 ? 'font-bold text-emerald-700 bg-emerald-100 p-1 rounded' : 'text-slate-600'}>
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
                {evaluation.developmentPlan.strengths || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-bold text-[10px] text-slate-700 uppercase">2. AREAS FOR IMPROVEMENT:</p>
              <p className="p-1.5 bg-slate-50 border border-slate-200 min-h-[40px] text-[10.5px]">
                {evaluation.developmentPlan.areasForImprovement || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-bold text-[10px] text-slate-700 uppercase">3. WORKPLACE LEARNING & DEVELOPMENT NEEDS (Programs/Courses):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                {evaluation.developmentPlan.learningNeeds.map((need) => (
                  <li key={need.id}>
                    <strong>{need.program}</strong> — Target Date: {need.targetDate} (Assigned: {need.responsiblePerson})
                  </li>
                ))}
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
                "{evaluation.supervisorSummaryComment || 'No comments added.'}"
              </p>
              <div className="pt-4 border-t border-slate-300 text-center">
                {evaluation.signatures.supervisor ? (
                  <div className="flex flex-col items-center">
                    <img src={evaluation.signatures.supervisor.signatureDataUrl} alt="Supervisor Signature" className="h-10 object-contain" />
                    <p className="font-bold underline text-[11px]">{evaluation.signatures.supervisor.signerName}</p>
                    <p className="text-[9px] text-slate-500">SIGNATURE OVER PRINTED NAME | Date: {evaluation.signatures.supervisor.signedAt}</p>
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
                "{evaluation.appraiseeSummaryComment || 'No comments added.'}"
              </p>
              <div className="pt-4 border-t border-slate-300 text-center">
                {evaluation.signatures.employee ? (
                  <div className="flex flex-col items-center">
                    <img src={evaluation.signatures.employee.signatureDataUrl} alt="Employee Signature" className="h-10 object-contain" />
                    <p className="font-bold underline text-[11px]">{evaluation.signatures.employee.signerName}</p>
                    <p className="text-[9px] text-slate-500">SIGNATURE OVER PRINTED NAME | Date: {evaluation.signatures.employee.signedAt}</p>
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
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'promotion'} readOnly />
                  <span>Promotion Recommended</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'salary_adjustment'} readOnly />
                  <span>Salary Adjustment</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'regularization'} readOnly />
                  <span>Regularization</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-1.5">
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'transfer'} readOnly />
                  <span>Transfer</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'pip'} readOnly />
                  <span>Performance Improvement Plan (PIP for BME 2.00-2.99)</span>
                </label>
                <label className="flex items-center space-x-1.5 mt-1">
                  <input type="checkbox" checked={evaluation.personnelAction.actionType === 'termination'} readOnly />
                  <span>Termination</span>
                </label>
              </div>
            </div>
            <div className="pt-2 text-[10px] space-y-1">
              <p><strong>New Position:</strong> {evaluation.personnelAction.newPosition || 'N/A'}</p>
              <p><strong>Date of Effectivity:</strong> {evaluation.personnelAction.effectiveDate || 'N/A'}</p>
              <p><strong>Department Head Remarks:</strong> {evaluation.personnelAction.remarks || 'N/A'}</p>
            </div>
          </div>

          {/* PEOPLE'S OPTN / POD & OFFICIAL DIGITAL SIGNATURES BLOCK */}
          <div className="border border-slate-400 p-3 bg-slate-50 space-y-3">
            <h5 className="font-bold uppercase text-[10px] text-slate-800 border-b border-slate-300 pb-1 text-center">
              PART 4: POD / HR EVALUATION & DIGITAL SIGNATURE VERIFICATION
            </h5>
            
            {/* POD Remarks & Validation summary */}
            <div className="text-[10px] space-y-1 bg-white p-2 border border-slate-200">
              <p><strong>POD Core Values Validation Rating:</strong> {evaluation.totalCoreValuesWeightedRating.toFixed(2)} ({coreValuesWeight}%)</p>
              <p><strong>POD / HR Remarks & Comments:</strong> {evaluation.podValidationComment || 'Validated by People Operations Development (POD).'}</p>
              <p><strong>Personnel Action Final Status:</strong> {evaluation.personnelAction?.isApproved ? 'Approved & Enforced' : 'Pending Final HR Enforcement'}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-300 text-center">
              {/* Employee Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-slate-500 uppercase">1. Employee Signature</p>
                {evaluation.signatures.employee ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={evaluation.signatures.employee.signatureDataUrl} alt="Employee Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{evaluation.signatures.employee.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{evaluation.signatures.employee.position || evaluation.position}</p>
                    <p className="text-[8px] text-slate-500">{evaluation.signatures.employee.department || evaluation.departmentName}</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {evaluation.signatures.employee.dateSigned || evaluation.signatures.employee.signedAt} {evaluation.signatures.employee.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">Pending Signature</p>
                )}
              </div>

              {/* Department Head Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-slate-500 uppercase">2. Department Head</p>
                {(evaluation.signatures.deptHead || evaluation.signatures.supervisor) ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signatureDataUrl} alt="DH Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.position || 'Department Head'}</p>
                    <p className="text-[8px] text-slate-500">{(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.department || evaluation.departmentName}</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.dateSigned || (evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.signedAt} {(evaluation.signatures.deptHead || evaluation.signatures.supervisor)?.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">Pending Signature</p>
                )}
              </div>

              {/* President Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-amber-700 uppercase">3. President & CEO</p>
                {evaluation.signatures.president ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={evaluation.signatures.president.signatureDataUrl} alt="Pres Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{evaluation.signatures.president.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{evaluation.signatures.president.position || 'President & CEO'}</p>
                    <p className="text-[8px] text-slate-500">Executive Office</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {evaluation.signatures.president.dateSigned || evaluation.signatures.president.signedAt} {evaluation.signatures.president.timeSigned || ''}</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 py-3 italic">
                    {evaluation.workflowType === 'WORKFLOW_DEPT_HEAD' || evaluation.isDepartmentHead ? 'Pending President Signature' : 'N/A (Regular Track)'}
                  </p>
                )}
              </div>

              {/* POD / HR Signature */}
              <div className="border border-slate-200 bg-white p-2 rounded">
                <p className="font-bold text-[9px] text-indigo-700 uppercase">4. POD / HR Officer</p>
                {(evaluation.signatures.pod || evaluation.signatures.hr) ? (
                  <div className="flex flex-col items-center mt-1">
                    <img src={(evaluation.signatures.pod || evaluation.signatures.hr)?.signatureDataUrl} alt="POD Sig" className="h-8 object-contain" />
                    <p className="font-bold underline text-[9.5px] mt-0.5">{(evaluation.signatures.pod || evaluation.signatures.hr)?.signerName}</p>
                    <p className="text-[8px] text-slate-600 font-semibold">{(evaluation.signatures.pod || evaluation.signatures.hr)?.position || 'POD Quality Lead'}</p>
                    <p className="text-[8px] text-slate-500">People Operations Dev</p>
                    <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">Date: {(evaluation.signatures.pod || evaluation.signatures.hr)?.dateSigned || (evaluation.signatures.pod || evaluation.signatures.hr)?.signedAt} {(evaluation.signatures.pod || evaluation.signatures.hr)?.timeSigned || ''}</p>
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
