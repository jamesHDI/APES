import { EvaluationTemplate } from '../types';

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalKpiWeight: number;
}

/**
 * Validates an Evaluation Template against APES rules before saving.
 * Ensures formula weights sum to 100%, required sections exist, and scales are complete.
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

  // 2. Formula Config Verification
  const eligibilityWeight = Number(template.formulaConfig?.eligibilityWeight ?? 0);
  const coreValuesWeight = Number(template.formulaConfig?.coreValuesWeight ?? 0);
  const formulaTotal = Number((eligibilityWeight + coreValuesWeight).toFixed(2));

  if (!Number.isFinite(eligibilityWeight) || !Number.isFinite(coreValuesWeight)) {
    errors.push('Formula weights must be valid numbers.');
  } else if (Math.abs(formulaTotal - 100) > 0.01) {
    errors.push(`Formula weights must total exactly 100%. Current total: ${formulaTotal}%.`);
  } else if (eligibilityWeight <= 0 || coreValuesWeight <= 0) {
    errors.push('Formula weights must be greater than 0.');
  }

  // 3. Required Sections Verification
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

          // 4. Rating Scale (1-4) Standards Verification
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

    // 5. KPI weights must equal the configured Part 1A eligibility weight
    if (Math.abs(totalKpiWeight - eligibilityWeight) > 0.01) {
      errors.push(
        `KPI Weight Total Mismatch: Part 1A KPI weights total ${Number(totalKpiWeight.toFixed(2))}%, but the template's configured Part 1A weight is ${eligibilityWeight}%.`
      );
    }
  }

  // 6. Core Values Verification (Part 1B)
  const coreValues = template.coreValues || [];
  if (coreValues.length === 0) {
    errors.push('Part 1B Core Values: At least one Core Value must be defined.');
  } else {
    const totalCoreValueWeight = coreValues.reduce((sum, cv) => sum + (Number(cv.weightPercent) || 0), 0);
    if (Math.abs(totalCoreValueWeight - coreValuesWeight) > 0.01) {
      errors.push(
        `Core Value Weight Mismatch: Core Values total ${Number(totalCoreValueWeight.toFixed(2))}%, but the template's configured Part 1B weight is ${coreValuesWeight}%.`
      );
    }
  }

  // 7. Rating Classification Ranges Verification
  if (!template.classificationRanges || template.classificationRanges.length < 4) {
    errors.push('Summary Error: Rating Classification ranges must be defined.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalKpiWeight
  };
}
