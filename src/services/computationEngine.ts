import { KPIRating, CoreValueRating } from '../types';

export const DEFAULT_CLASSIFICATION_RANGES = [
  { min: 3.51, max: 4.00, label: 'Outstanding (EE)', code: 'EE', color: 'emerald' },
  { min: 3.00, max: 3.50, label: 'Very Satisfactory (ME)', code: 'ME', color: 'blue' },
  { min: 2.50, max: 2.99, label: 'Satisfactory (BME)', code: 'BME', color: 'indigo' },
  { min: 2.00, max: 2.49, label: 'Needs Improvement (NI)', code: 'NI', color: 'amber' },
  { min: 1.00, max: 1.99, label: 'Unsatisfactory (DME)', code: 'DME', color: 'rose' },
];

/**
 * Computes individual KPI weighted score:
 * Weighted Score = (Weight% / 100) * Rating
 */
export function computeKPIWeightedScore(weightPercent: number, rating: number): number {
  if (!weightPercent || !rating) return 0;
  const score = (weightPercent / 100) * rating;
  return Number(score.toFixed(2));
}

/**
 * Computes total eligibility score from all KPI ratings in Part 1A.
 * Uses the sequential adjusted rating from the last authorized evaluator.
 */
export function computeEligibilityScore(kpiRatings: KPIRating[]): number {
  if (!kpiRatings || kpiRatings.length === 0) return 0;
  const sum = kpiRatings.reduce((acc, kpi) => {
    const ratingToUse = getLatestAdjustedRating(kpi);
    const score = computeKPIWeightedScore(kpi.weightPercent, ratingToUse);
    return acc + score;
  }, 0);
  return Number(sum.toFixed(2));
}

/**
 * Computes average Core Values rating across assessors (POD, Peer, IS).
 */
export function computeCoreValuesAverage(coreValueRatings: CoreValueRating[]): number {
  if (!coreValueRatings || coreValueRatings.length === 0) return 0;
  
  let totalSum = 0;
  let totalCount = 0;

  coreValueRatings.forEach((cv) => {
    let cvSum = 0;
    let cvCount = 0;
    if (cv.isRating > 0) { cvSum += cv.isRating; cvCount++; }
    if (cv.podRating > 0) { cvSum += cv.podRating; cvCount++; }
    if (cv.peerRating > 0) { cvSum += cv.peerRating; cvCount++; }
    
    const cvAvg = cvCount > 0 ? cvSum / cvCount : 0;
    totalSum += cvAvg;
    totalCount++;
  });

  const overallAvg = totalCount > 0 ? totalSum / totalCount : 0;
  return Number(overallAvg.toFixed(2));
}

/**
 * Computes Suitability Factor / Core Values Weighted Score:
 * (Core Values Weight / 100) * Core Values Average Rating
 */
export function computeCoreValuesWeightedScore(coreValuesAvg: number, coreValuesWeightPercent: number): number {
  if (!coreValuesAvg) return 0;
  const score = (coreValuesWeightPercent / 100) * coreValuesAvg;
  return Number(score.toFixed(2));
}

/**
 * Computes Total Individual Performance Rating:
 * Total = Eligibility Weighted Rating (Part 1A sum) + Core Values Weighted Score (Part 1B)
 */
export function computeFinalPerformanceRating(
  eligibilityScore: number,
  coreValuesWeightedScore: number
): number {
  const total = (eligibilityScore || 0) + (coreValuesWeightedScore || 0);
  return Number(total.toFixed(2));
}

/**
 * Looks up performance rating classification text based on final score.
 */
export function getRatingClassification(
  finalRating: number,
  ranges = DEFAULT_CLASSIFICATION_RANGES
): { label: string; code: string; color: string } {
  for (const range of ranges) {
    if (finalRating >= range.min && finalRating <= range.max) {
      return { label: range.label, code: range.code, color: range.color };
    }
  }
  if (finalRating > 4.00) return { label: 'Outstanding (EE)', code: 'EE', color: 'emerald' };
  return { label: 'Unsatisfactory (DME)', code: 'DME', color: 'rose' };
}

/**
 * Validates whether KPI weights total 85% (or 100%).
 */
export function validateWeightsTotal(kpiRatings: KPIRating[], targetTotal: number = 85): { isValid: boolean; currentTotal: number } {
  const total = kpiRatings.reduce((acc, k) => acc + (k.weightPercent || 0), 0);
  return {
    isValid: Math.abs(total - targetTotal) < 0.01,
    currentTotal: Number(total.toFixed(2))
  };
}

/**
/**
 * Sequential Rating Adjustment:
 * Returns the final effective rating for a KPI.
 * Evaluator Hierarchy Priority:
 *   POD / President Adjustment > Supervisor / IS Adjustment > Employee Initial Self-Rating
 * This guarantees sequential adjustment without averaging and maintains full backward compatibility.
 */
export function getLatestAdjustedRating(kpi: KPIRating): number {
  if (kpi.presidentRating && kpi.presidentRating > 0) {
    return kpi.presidentRating;
  }
  if (kpi.podRating && kpi.podRating > 0) {
    return kpi.podRating;
  }
  if (kpi.supervisorRating && kpi.supervisorRating > 0) {
    return kpi.supervisorRating;
  }
  if (kpi.selfRating && kpi.selfRating > 0) {
    return kpi.selfRating;
  }
  if (kpi.ratingHistory && kpi.ratingHistory.length > 0) {
    return kpi.ratingHistory[kpi.ratingHistory.length - 1].newRating;
  }
  return 0;
}

/**
 * Change 4 — Appends a new RatingAdjustment entry to a KPI's history.
 * Returns a new KPIRating object with the updated history.
 */
export function appendRatingAdjustment(
  kpi: KPIRating,
  adjustedBy: string,
  role: 'employee' | 'supervisor' | 'dept_head' | 'president' | 'pod',
  newRating: number,
  remark?: string
): KPIRating {
  const previousRating = getLatestAdjustedRating(kpi);
  const entry = {
    role,
    adjustedBy,
    previousRating,
    newRating,
    timestamp: new Date().toISOString(),
    remark,
  };
  return {
    ...kpi,
    ratingHistory: [...(kpi.ratingHistory || []), entry],
  };
}
