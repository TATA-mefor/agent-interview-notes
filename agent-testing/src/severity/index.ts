export {
  buildSeverityClassification,
  classifySeverity,
  hasMinimumEvidenceStrength,
  isCriticalImpact,
  isImportantImpact,
  isStandardImpact,
  isSuggestionImpact,
  summarizeEvidenceForSeverity,
} from './severityClassifier';
export type {
  SeverityClassificationInput,
  SeverityClassificationOutput,
  SeverityEvidenceSummary,
  SeverityImpactArea,
} from './severityClassifier';
