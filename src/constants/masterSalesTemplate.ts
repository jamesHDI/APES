import { EvaluationTemplate } from '../types';

/**
 * APES MASTER SALES EVALUATION TEMPLATE
 * This is the official corporate master layout of APES.
 * All future evaluation templates for all departments (Sales, IT, HR, Finance, Accounting, Operations, etc.)
 * inherit 100% of this layout structure, formulas, page breaks, section ordering, and scoring tables.
 */
export const MASTER_SALES_EVALUATION_TEMPLATE: EvaluationTemplate = {
  id: 'template_sales',
  title: 'Sales Performance Evaluation Master Scorecard',
  departmentId: 'dept_sls',
  departmentName: 'Sales',
  evaluationPeriod: 'January-September 2025',
  formulaConfig: {
    eligibilityWeight: 85,
    coreValuesWeight: 15,
  },
  coreValues: [
    { id: 'cv_integrity', name: 'Integrity & Ethics', description: 'Upholds highest standards of honesty, fairness, and business ethics.', weightPercent: 3.75, sortOrder: 1 },
    { id: 'cv_excellence', name: 'Excellence & Performance', description: 'Consistently delivers top-tier results and strives for continuous improvement.', weightPercent: 3.75, sortOrder: 2 },
    { id: 'cv_teamwork', name: 'Teamwork & Collaboration', description: 'Fosters positive collaboration across departments and supports team goals.', weightPercent: 3.75, sortOrder: 3 },
    { id: 'cv_accountability', name: 'Accountability & Ownership', description: 'Takes full ownership of duties, commitments, and professional conduct.', weightPercent: 3.75, sortOrder: 4 }
  ],
  classificationRanges: [
    { min: 3.51, max: 4.00, label: 'Exceeds Expectations (EE)', code: 'EE', color: 'emerald' },
    { min: 3.00, max: 3.50, label: 'Meets Expectations (ME)', code: 'ME', color: 'blue' },
    { min: 2.00, max: 2.99, label: 'Barely Meets Expectations (BME)', code: 'BME', color: 'amber' },
    { min: 1.00, max: 1.99, label: 'Did Not Meet Expectations (DME)', code: 'DME', color: 'rose' },
  ],
  isActive: true,
  createdAt: '2025-01-01',
  kraCategories: [
    {
      id: 'kra_financial',
      name: '1. FINANCIAL',
      categoryWeightPercent: 50,
      kpis: [
        {
          id: 'kpi_rev_perf',
          kraId: 'kra_financial',
          kraName: '1. FINANCIAL',
          name: 'A. Revenue performance',
          description: 'Gross annual sales revenue quota achievement target.',
          weightPercent: 40,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Above 50M target is achieved.' },
            { rating: 3, label: '3 - Meets', description: '50M target is achieved.' },
            { rating: 2, label: '2 - Barely Meets', description: 'Below 50M target is achieved.' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Below 50% of the target is achieved.' }
          ]
        },
        {
          id: 'kpi_book_perf',
          kraId: 'kra_financial',
          kraName: '1. FINANCIAL',
          name: 'B. Booking performance',
          description: 'Booking quota achievement target.',
          weightPercent: 5,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Above 71M target is achieved.' },
            { rating: 3, label: '3 - Meets', description: '71M target is achieved.' },
            { rating: 2, label: '2 - Barely Meets', description: 'Below 71M target is achieved.' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Below 50% of the target is achieved.' }
          ]
        },
        {
          id: 'kpi_client_retention',
          kraId: 'kra_financial',
          kraName: '1. FINANCIAL',
          name: 'D. Client retention (and renewals).',
          description: 'Maintain high client renewal and retention rate.',
          weightPercent: 3,
          evidenceRequired: false,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: '100% retained client' },
            { rating: 3, label: '3 - Meets', description: '90% retained client' },
            { rating: 2, label: '2 - Barely Meets', description: 'below 90%' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Below 50% of the target is achieved.' }
          ]
        },
        {
          id: 'kpi_avoid_preterm',
          kraId: 'kra_financial',
          kraName: '1. FINANCIAL',
          name: 'G. Avoidance of client pre-termination.',
          description: 'Minimize contract cancellations and pre-terminations.',
          weightPercent: 2,
          evidenceRequired: false,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: '0 termination of clients/contract' },
            { rating: 3, label: '3 - Meets', description: '1 contract terminated' },
            { rating: 2, label: '2 - Barely Meets', description: '2-3 more contract terminated' },
            { rating: 1, label: '1 - Did Not Meet', description: '3 or more contract terminated' }
          ]
        }
      ]
    },
    {
      id: 'kra_customer',
      name: '2. CUSTOMER',
      categoryWeightPercent: 10,
      kpis: [
        {
          id: 'kpi_client_relationship',
          kraId: 'kra_customer',
          kraName: '2. CUSTOMER',
          name: 'A. Client relationship management (Feedback/Visit/client interface)',
          description: 'Customer satisfaction and efficient issue resolution.',
          weightPercent: 10,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: '100% Resolution issues with clients in a more efficient manner (no request for extension, no additional cost from the management)' },
            { rating: 3, label: '3 - Meets', description: '100% Resolution issues with clients in a more efficient manner (but with 1 month for extension, bearable additional cost from the management)' },
            { rating: 2, label: '2 - Barely Meets', description: '100% Resolution issues with clients in a more efficient manner (but with 2 months for extension, bearable additional cost from the management)' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Did not resolve issues and significantly attribute to higher cost to the management' }
          ]
        }
      ]
    },
    {
      id: 'kra_process',
      name: '3. PROCESS (Availability, Sustainability)',
      categoryWeightPercent: 20,
      kpis: [
        {
          id: 'kpi_adams_creation',
          kraId: 'kra_process',
          kraName: '3. PROCESS (Availability, Sustainability)',
          name: 'A. ADAMS creation of signed CE/Quotation.',
          description: 'Prompt creation and attachment of CEs in ADAMS.',
          weightPercent: 5,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Signed CE attached to ADAMS 15 or days prior to breakdate and contract creations from the ADAMS within 24 hours upon receipt of the documents (all contracts)' },
            { rating: 3, label: '3 - Meets', description: 'Signed CE attached to ADAMS 7 days prior to breakdate and contract creations from the ADAMS within 24 hours upon receipt of the documents (90% average of contracts)' },
            { rating: 2, label: '2 - Barely Meets', description: 'Signed CE attached to ADAMS in less than 7 days prior to breakdate and contract creations from the ADAMS within 24 hours upon receipt of the documents (less than 90%-89%)' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Signed CE attached to ADAMS in less than 7 days prior to breakdate and contract creations from the ADAMS within 24 hours upon receipt of the documents (less than 70%)' }
          ]
        },
        {
          id: 'kpi_adams_contract_mgmt',
          kraId: 'kra_process',
          kraName: '3. PROCESS (Availability, Sustainability)',
          name: 'B. Management of ADAMS contract.',
          description: 'Adherence to pricing, bundling, and break date guidelines.',
          weightPercent: 5,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Bundling and package are above the standard pricing and no significant impact to the monthly revenue (no movement of contract break dates)' },
            { rating: 3, label: '3 - Meets', description: 'Allowed standard bundling and package discussed and approved by the IS; movement of contract and break dates limits to 1 only.' },
            { rating: 2, label: '2 - Barely Meets', description: 'Bundling and package are disadvantageous and not at par with the expected standard by the management; movement of contract and break dates limits to 2-3 only.' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Failed to follow standard rates and package, with more than 3 break dates movement' }
          ]
        },
        {
          id: 'kpi_weekly_reporting',
          kraId: 'kra_process',
          kraName: '3. PROCESS (Availability, Sustainability)',
          name: 'C. Weekly reporting for Dashboard & Pipe.',
          description: 'Timely pipe closing and dashboard updates.',
          weightPercent: 10,
          evidenceRequired: true,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Pipe is closed and updated in report every dashboard speed is less than a week' },
            { rating: 3, label: '3 - Meets', description: 'Pipe is closed and updated in report every dashboard speed is every end of the week' },
            { rating: 2, label: '2 - Barely Meets', description: 'Pipe is closed and updated in report every dashboard speed is more than a week' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Very late submission up to two weeks' }
          ]
        }
      ]
    },
    {
      id: 'kra_ind_dev',
      name: '4. INDIVIDUAL DEVELOPMENT',
      categoryWeightPercent: 5,
      kpis: [
        {
          id: 'kpi_personality_dev',
          kraId: 'kra_ind_dev',
          kraName: '4. INDIVIDUAL DEVELOPMENT',
          name: 'Personality development (Physical, attitude and mindset)',
          description: 'Industry knowledge trends, self-development evidence, and team sharing.',
          weightPercent: 5,
          evidenceRequired: false,
          standards: [
            { rating: 4, label: '4 - Exceeds', description: 'Deep knowledge of OOH trends & proactive team sharing' },
            { rating: 3, label: '3 - Meets', description: 'Knowledge on market/trends of the OOH industry; self development evidence in actions/practice and shared to the team' },
            { rating: 2, label: '2 - Barely Meets', description: 'Basic OOH industry awareness with minimal sharing' },
            { rating: 1, label: '1 - Did Not Meet', description: 'Lack of self-development or industry trend awareness' }
          ]
        }
      ]
    }
  ]
};

/**
 * Factory function to create a new department-specific template derived from the Master Sales Layout.
 * Ensures 100% layout, formula, section, and rating scale preservation.
 */
export const createMasterBasedTemplate = (
  departmentId: string,
  departmentName: string,
  customTitle?: string,
  period: string = 'January-September 2025'
): EvaluationTemplate => {
  const timestamp = Date.now();
  const templateId = `tmpl_${departmentId}_${timestamp}`;

  // Deep clone master categories so IDs are unique per template instance
  const clonedKraCategories = MASTER_SALES_EVALUATION_TEMPLATE.kraCategories.map((kra, kraIdx) => ({
    ...kra,
    id: `kra_${timestamp}_${kraIdx}`,
    kpis: kra.kpis.map((kpi, kpiIdx) => ({
      ...kpi,
      id: `kpi_${timestamp}_${kraIdx}_${kpiIdx}`,
      kraId: `kra_${timestamp}_${kraIdx}`,
      standards: [...kpi.standards]
    }))
  }));

  const clonedCoreValues = MASTER_SALES_EVALUATION_TEMPLATE.coreValues.map((cv, cvIdx) => ({
    ...cv,
    id: `cv_${timestamp}_${cvIdx}`,
    sortOrder: cvIdx + 1
  }));

  return {
    ...MASTER_SALES_EVALUATION_TEMPLATE,
    id: templateId,
    title: customTitle || `${departmentName} Performance Evaluation Scorecard Template`,
    departmentId,
    departmentName,
    evaluationPeriod: period,
    kraCategories: clonedKraCategories,
    coreValues: clonedCoreValues,
    createdAt: new Date().toISOString().substring(0, 10),
    isActive: true,
  };
};
