import { EvaluationTemplate } from '../types';

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalKpiWeight: number;
}

/**
 * Validates an Evaluation Template against APES Master Layout rules before saving.
 * Ensures formula weights sum to 85%, required sections exist, and scales are complete.
 */
export function validateEvaluationTemplate(template: EvaluationTemplate): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalKpiWeight = 0;

  // 1. Basic Metadata Verification
  if (!template.title || !template.title.trim()) {
    errors.push('Template Name / Title is required.');
  }

  if (!template.departmentId || !template.departmentName) {
    errors.push('Department assignment is required for this template.');
  }

  // 2. Required Sections Verification
  if (!template.kraCategories || template.kraCategories.length === 0) {
    errors.push('Required Section Missing: At least one Key Result Area (KRA) category must exist in Part 1A.');
  } else {
    template.kraCategories.forEach((kra, idx) => {
      if (!kra.name || !kra.name.trim()) {
        errors.push(`KRA Section #${idx + 1} title cannot be empty.`);
      }

      if (!kra.kpis || kra.kpis.length === 0) {
        errors.push(`KRA Section "${kra.name || idx + 1}" has no KPI performance indicators defined.`);
      } else {
        kra.kpis.forEach((kpi, kpiIdx) => {
          if (!kpi.name || !kpi.name.trim()) {
            errors.push(`KPI #${kpiIdx + 1} in "${kra.name}" is missing a title.`);
          }
          if (typeof kpi.weightPercent !== 'number' || kpi.weightPercent <= 0) {
            errors.push(`KPI "${kpi.name || kpiIdx + 1}" weight percentage must be greater than 0%.`);
          } else {
            totalKpiWeight += kpi.weightPercent;
          }

          // 3. Rating Scale (1-4) Standards Verification
          if (!kpi.standards || kpi.standards.length !== 4) {
            errors.push(`Rating Scale Error: KPI "${kpi.name || kpiIdx + 1}" must have complete 4-point rating standards (1, 2, 3, 4).`);
          } else {
            const ratings = kpi.standards.map(s => s.rating);
            if (!ratings.includes(1) || !ratings.includes(2) || !ratings.includes(3) || !ratings.includes(4)) {
              errors.push(`Rating Scale Error: KPI "${kpi.name || kpiIdx + 1}" rating scale must cover ratings 1, 2, 3, and 4.`);
            }
          }
        });
      }
    });

    // 4. Formula Definitions & Weight Total Validation (Must equal 85%)
    if (totalKpiWeight !== 85) {
      errors.push(
        `KPI Weight Total Mismatch: Part 1A KPI weights total ${totalKpiWeight}%. Master formula requires exactly 85% for Part 1A Eligibility Factors.`
      );
    }
  }

  // 5. Formula Config Verification
  if (!template.formulaConfig || template.formulaConfig.eligibilityWeight !== 85 || template.formulaConfig.coreValuesWeight !== 15) {
    errors.push('Formula Definitions Error: Master formula weights must be set to 85% Eligibility and 15% Core Values.');
  }

  // 6. Rating Classification Ranges Verification
  if (!template.classificationRanges || template.classificationRanges.length < 4) {
    errors.push('Summary Error: Rating Classification ranges (DME 1.00-1.99, BME 2.00-2.99, ME 3.00-3.50, EE 3.51-4.00) must be defined.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalKpiWeight
  };
}
