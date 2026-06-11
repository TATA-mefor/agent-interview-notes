import type {
  AcceptancePoint,
  DefectFinding,
  MarkdownString,
  ReleaseRecommendation,
  SeverityClassification,
  SourceReference,
  SystemTestCase,
  SystemTestEvidence,
  TestCaseId,
  TestEnvironment,
  UnknownItem,
} from '../types';
import type {
  DefectAnalysisOutput,
} from '../defects';
import type {
  OpsChecklistItem,
} from '../ops';
import type {
  RegressionSuggestionItem,
} from '../regression';
import type {
  SeverityClassificationOutput,
} from '../severity';

export interface MarkdownReportInput {
  reportId?: MarkdownString;
  title?: MarkdownString;
  targetSystem?: MarkdownString;
  testScope?: MarkdownString;
  testEnvironment?: TestEnvironment;
  contextSources?: SourceReference[];
  acceptancePoints?: AcceptancePoint[];
  testCases?: SystemTestCase[];
  evidence?: SystemTestEvidence[];
  severityClassifications?: Array<SeverityClassification | SeverityClassificationOutput>;
  defects?: DefectFinding[];
  defectAnalyses?: DefectAnalysisOutput[];
  opsChecklist?: OpsChecklistItem[];
  regressionSuggestions?: RegressionSuggestionItem[];
  unknowns?: Array<UnknownItem | MarkdownString>;
  limitations?: MarkdownString[];
  releaseRecommendation?: ReleaseRecommendation;
}

export interface ReportSectionSummary {
  sectionName: MarkdownString;
  itemCount: number;
  hasWarnings: boolean;
}

export interface MarkdownReportOutput {
  markdown: MarkdownString;
  sections: ReportSectionSummary[];
  warnings: MarkdownString[];
  missingInputs: MarkdownString[];
  limitations: MarkdownString[];
}

type TestCaseStatus = 'pass' | 'fail' | 'blocked' | 'inconclusive' | 'not_run' | 'no evidence';

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function list<T>(items: T[] | undefined): T[] {
  return items ?? [];
}

function clean(value: unknown): MarkdownString {
  if (value === undefined || value === null || value === '') {
    return 'not provided';
  }

  return String(value).replace(/\r?\n/g, ' ').trim() || 'not provided';
}

function mdCell(value: unknown): MarkdownString {
  return clean(value).replace(/\|/g, '\\|');
}

function bullet(items: MarkdownString[]): MarkdownString {
  if (items.length === 0) {
    return '- none';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function getClassification(
  item: SeverityClassification | SeverityClassificationOutput
): SeverityClassification {
  return 'classification' in item ? item.classification : item;
}

function evidenceForCase(
  evidence: SystemTestEvidence[],
  testCaseId: TestCaseId
): SystemTestEvidence[] {
  return evidence.filter((item) => item.testCaseId === testCaseId);
}

function inferTestCaseStatus(testCase: SystemTestCase, evidence: SystemTestEvidence[]): TestCaseStatus {
  const related = evidenceForCase(evidence, testCase.id);

  if (related.length === 0) {
    return 'no evidence';
  }

  if (related.some((item) => item.result === 'fail')) {
    return 'fail';
  }

  if (related.some((item) => item.result === 'blocked')) {
    return 'blocked';
  }

  if (related.some((item) => item.result === 'inconclusive')) {
    return 'inconclusive';
  }

  if (related.every((item) => item.result === 'not_run')) {
    return 'not_run';
  }

  if (related.some((item) => item.result === 'pass')) {
    return 'pass';
  }

  return 'inconclusive';
}

function formatUnknown(item: UnknownItem | MarkdownString): MarkdownString {
  if (typeof item === 'string') {
    return item;
  }

  return `${item.id} / ${item.area}: ${item.description}. Missing evidence: ${item.missingEvidence.join(', ') || 'not provided'}. Impact: ${item.impact}`;
}

function countExecuted(evidence: SystemTestEvidence[]): number {
  return evidence.filter((item) => item.result !== 'not_run').length;
}

function buildWarnings(input: MarkdownReportInput): {
  warnings: MarkdownString[];
  missingInputs: MarkdownString[];
} {
  const warnings: MarkdownString[] = [];
  const missingInputs: MarkdownString[] = [];
  const evidence = list(input.evidence);
  const testCases = list(input.testCases);
  const severityClassifications = list(input.severityClassifications);
  const defects = list(input.defects);
  const defectAnalyses = list(input.defectAnalyses);
  const opsChecklist = list(input.opsChecklist);

  const requiredInputs: Array<[keyof MarkdownReportInput, MarkdownString]> = [
    ['targetSystem', 'targetSystem'],
    ['testScope', 'testScope'],
    ['testEnvironment', 'testEnvironment'],
    ['testCases', 'testCases'],
    ['evidence', 'evidence'],
  ];

  for (const [field, label] of requiredInputs) {
    const value = input[field];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missingInputs.push(label);
    }
  }

  if (evidence.length === 0) {
    warnings.push('No evidence was provided.');
  }

  const casesWithoutEvidence = testCases.filter(
    (testCase) => evidenceForCase(evidence, testCase.id).length === 0
  );
  if (casesWithoutEvidence.length > 0) {
    warnings.push(`${casesWithoutEvidence.length} test case(s) have no linked evidence.`);
  }

  if (evidence.some((item) => item.strength === 'weak')) {
    warnings.push('Weak evidence is present.');
  }

  if (evidence.some((item) => item.result === 'inconclusive')) {
    warnings.push('Inconclusive evidence is present.');
  }

  if (severityClassifications.some((item) => getClassification(item).severity === 'unknown')) {
    warnings.push('Unknown severity classification is present.');
  }

  if (severityClassifications.some((item) => ['P0', 'P1'].includes(getClassification(item).severity))) {
    warnings.push('P0/P1 severity classification is present.');
  }

  if (
    severityClassifications.some((item) => getClassification(item).blockingRelease) ||
    opsChecklist.some((item) => item.blockingIfFailed)
  ) {
    warnings.push('Release blocking risk is present.');
  }

  if (!input.releaseRecommendation) {
    warnings.push('Release recommendation input was not provided; report shows inconclusive / not provided.');
  }

  if (opsChecklist.length > 0 && evidence.length === 0) {
    warnings.push('Ops checklist exists but no evidence was provided for ops checks.');
  }

  if (defects.length > 0 && defectAnalyses.length === 0) {
    warnings.push('Defect findings exist but no defect analysis was provided.');
  }

  if (severityClassifications.length > 0 && evidence.length === 0) {
    warnings.push('Severity classification exists but no evidence was provided.');
  }

  return {
    warnings: uniqueList(warnings),
    missingInputs: uniqueList(missingInputs),
  };
}

function buildSections(input: MarkdownReportInput, warnings: MarkdownString[]): ReportSectionSummary[] {
  return [
    { sectionName: 'Test Summary', itemCount: list(input.testCases).length, hasWarnings: warnings.length > 0 },
    { sectionName: 'Target System', itemCount: input.targetSystem ? 1 : 0, hasWarnings: !input.targetSystem },
    { sectionName: 'Test Scope', itemCount: input.testScope ? 1 : 0, hasWarnings: !input.testScope },
    { sectionName: 'Test Environment', itemCount: input.testEnvironment ? 1 : 0, hasWarnings: !input.testEnvironment },
    { sectionName: 'Context Sources', itemCount: list(input.contextSources).length, hasWarnings: false },
    { sectionName: 'Acceptance Points', itemCount: list(input.acceptancePoints).length, hasWarnings: false },
    { sectionName: 'Test Cases', itemCount: list(input.testCases).length, hasWarnings: list(input.testCases).some((testCase) => evidenceForCase(list(input.evidence), testCase.id).length === 0) },
    { sectionName: 'Skills and Evidence Boundary', itemCount: 1, hasWarnings: false },
    { sectionName: 'Execution Evidence', itemCount: list(input.evidence).length, hasWarnings: list(input.evidence).length === 0 },
    { sectionName: 'Severity Classifications', itemCount: list(input.severityClassifications).length, hasWarnings: list(input.severityClassifications).some((item) => getClassification(item).severity === 'unknown') },
    { sectionName: 'Defect Findings', itemCount: list(input.defects).length, hasWarnings: false },
    { sectionName: 'Defect Analysis', itemCount: list(input.defectAnalyses).length, hasWarnings: list(input.defects).length > 0 && list(input.defectAnalyses).length === 0 },
    { sectionName: 'Ops and Deployment Checks', itemCount: list(input.opsChecklist).length, hasWarnings: list(input.opsChecklist).some((item) => item.blockingIfFailed) },
    { sectionName: 'Regression Suggestions', itemCount: list(input.regressionSuggestions).length, hasWarnings: false },
    { sectionName: 'Unknowns and Limitations', itemCount: list(input.unknowns).length + list(input.limitations).length, hasWarnings: list(input.unknowns).length > 0 },
    { sectionName: 'Release Recommendation', itemCount: input.releaseRecommendation ? 1 : 0, hasWarnings: !input.releaseRecommendation },
    { sectionName: 'Appendix', itemCount: list(input.evidence).length, hasWarnings: false },
  ];
}

function testCaseTable(testCases: SystemTestCase[], evidence: SystemTestEvidence[]): MarkdownString {
  const rows = testCases.map((testCase) => [
    testCase.id,
    testCase.title,
    testCase.scope,
    testCase.priority,
    testCase.requiredEvidence.join('; ') || 'not provided',
    inferTestCaseStatus(testCase, evidence),
  ]);

  return [
    '| ID | Title | Scope | Priority | Required Evidence | Status |',
    '| -- | ----- | ----- | -------- | ----------------- | ------ |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function evidenceTable(evidence: SystemTestEvidence[]): MarkdownString {
  const rows = evidence.map((item) => [
    item.id,
    item.testCaseId ?? 'not linked',
    item.evidenceSource,
    item.executorType,
    item.result,
    item.strength,
    item.evidenceSummary,
  ]);

  return [
    '| Evidence ID | Test Case ID | Source | Executor | Result | Strength | Summary |',
    '| ----------- | ------------ | ------ | -------- | ------ | -------- | ------- |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function severityTable(items: Array<SeverityClassification | SeverityClassificationOutput>): MarkdownString {
  const rows = items.map((item) => {
    const classification = getClassification(item);
    const reason = 'reason' in item ? item.reason : classification.reason;

    return [
      'not linked',
      classification.severity,
      classification.blockingRelease ? 'yes' : 'no',
      classification.requiresRegression ? 'yes' : 'no',
      reason,
    ];
  });

  return [
    '| Test Case / Defect | Severity | Blocking | Regression Required | Reason |',
    '| ------------------ | -------- | -------- | ------------------- | ------ |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function defectTable(defects: DefectFinding[]): MarkdownString {
  const rows = defects.map((defect) => [
    defect.id,
    defect.severity,
    defect.title,
    defect.evidenceIds.join('; ') || 'not provided',
    defect.recommendation,
    defect.status,
  ]);

  return [
    '| Defect ID | Severity | Title | Evidence | Recommendation | Status |',
    '| --------- | -------- | ----- | -------- | -------------- | ------ |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function opsChecklistTable(items: OpsChecklistItem[]): MarkdownString {
  const rows = items.map((item) => [
    item.id,
    item.category,
    item.title,
    item.requiredEvidence.join('; ') || 'not provided',
    item.blockingIfFailed ? 'yes' : 'no',
  ]);

  return [
    '| ID | Category | Title | Required Evidence | Blocking If Failed |',
    '| -- | -------- | ----- | ----------------- | ------------------ |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function regressionTable(items: RegressionSuggestionItem[]): MarkdownString {
  const rows = items.map((item) => [
    item.id,
    item.scopeCategory,
    item.priority,
    item.reason,
    item.requiredEvidence.join('; ') || 'not provided',
  ]);

  return [
    '| ID | Scope | Priority | Reason | Required Evidence |',
    '| -- | ----- | -------- | ------ | ----------------- |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function acceptanceTable(items: AcceptancePoint[]): MarkdownString {
  const rows = items.map((item) => [
    item.id,
    item.source,
    item.description,
    item.businessValue,
    item.priority,
    item.ambiguityLevel,
  ]);

  return [
    '| ID | Source | Description | Business Value | Priority | Ambiguity |',
    '| -- | ------ | ----------- | -------------- | -------- | --------- |',
    ...rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function defectAnalysisBullets(items: DefectAnalysisOutput[]): MarkdownString {
  if (items.length === 0) {
    return '- not provided';
  }

  return items.map((item, index) => [
    `- Analysis ${index + 1}:`,
    `  - Suspected layer: ${item.suspectedLayer}`,
    `  - Cause category: ${item.causeCategory}`,
    `  - Possible cause: ${item.possibleCause}`,
    `  - Fix suggestion: ${item.fixSuggestion}`,
    `  - Regression suggestion: ${item.regressionSuggestion}`,
    `  - Confidence: ${item.confidence}`,
    `  - Required additional evidence: ${item.requiredAdditionalEvidence.join('; ') || 'not provided'}`,
  ].join('\n')).join('\n');
}

function appendix(input: MarkdownReportInput): MarkdownString {
  const evidence = list(input.evidence);
  const commands = evidence.map((item) => item.command).filter((item): item is MarkdownString => Boolean(item));
  const apiRequests = evidence.map((item) => item.apiRequest).filter((item): item is MarkdownString => Boolean(item));
  const screenshots = evidence.flatMap((item) => item.screenshotPaths);
  const attachments = evidence.flatMap((item) => item.attachmentPaths);

  return [
    `- Raw evidence references: ${evidence.map((item) => item.evidenceSource).join('; ') || 'not provided'}`,
    `- Commands: ${commands.join('; ') || 'not provided'}`,
    `- API requests: ${apiRequests.join('; ') || 'not provided'}`,
    `- Screenshots: ${screenshots.join('; ') || 'not provided'}`,
    `- Attachments: ${attachments.join('; ') || 'not provided'}`,
    `- Open questions: ${list(input.unknowns).map(formatUnknown).join('; ') || 'none'}`,
  ].join('\n');
}

export function generateMarkdownReport(
  input: MarkdownReportInput
): MarkdownReportOutput {
  const evidence = list(input.evidence);
  const testCases = list(input.testCases);
  const defects = list(input.defects);
  const severityClassifications = list(input.severityClassifications);
  const opsChecklist = list(input.opsChecklist);
  const regressionSuggestions = list(input.regressionSuggestions);
  const { warnings, missingInputs } = buildWarnings(input);
  const sections = buildSections(input, warnings);
  const releaseRecommendation = input.releaseRecommendation ?? 'inconclusive';
  const releaseRecommendationLabel = input.releaseRecommendation
    ? input.releaseRecommendation
    : 'inconclusive / not provided';

  const executed = countExecuted(evidence);
  const markdown = [
    `# ${input.title || 'System Test Report'}`,
    '',
    '## 1. Test Summary',
    '',
    `- Report ID: ${clean(input.reportId)}`,
    '- Generated At: not generated by runtime clock',
    `- Target System: ${clean(input.targetSystem)}`,
    `- Total Cases: ${testCases.length}`,
    `- Executed Evidence Records: ${executed}`,
    `- Passed Evidence Records: ${evidence.filter((item) => item.result === 'pass').length}`,
    `- Failed Evidence Records: ${evidence.filter((item) => item.result === 'fail').length}`,
    `- Blocked Evidence Records: ${evidence.filter((item) => item.result === 'blocked').length}`,
    `- Inconclusive Evidence Records: ${evidence.filter((item) => item.result === 'inconclusive').length}`,
    `- Release Recommendation: ${releaseRecommendationLabel}`,
    '',
    '## 2. Target System',
    '',
    `- Name: ${clean(input.targetSystem)}`,
    `- Version / Commit / Build: ${clean(input.testEnvironment?.version ?? input.testEnvironment?.commit)}`,
    '- System Type: not provided',
    '- Primary Users: not provided',
    '- Critical Workflows: not provided',
    '',
    '## 3. Test Scope',
    '',
    clean(input.testScope),
    '',
    '## 4. Test Environment',
    '',
    `- Environment: ${clean(input.testEnvironment?.name)}`,
    `- URL / Access Path: ${clean(input.testEnvironment?.url)}`,
    `- Database: ${clean(input.testEnvironment?.database)}`,
    `- Browser / Device: ${clean([input.testEnvironment?.browser, input.testEnvironment?.device].filter(Boolean).join(' / '))}`,
    `- Network: ${clean(input.testEnvironment?.network)}`,
    `- Notes: ${clean(input.testEnvironment?.notes)}`,
    '',
    '## 5. Context Sources',
    '',
    bullet(list(input.contextSources)),
    '',
    '## 6. Acceptance Points',
    '',
    acceptanceTable(list(input.acceptancePoints)),
    '',
    '## 7. Test Cases',
    '',
    '### Test Case Table',
    '',
    testCaseTable(testCases, evidence),
    '',
    '## 8. Skills and Evidence Boundary',
    '',
    '- Skills and report generation are derived artifacts. They do not independently prove system execution.',
    '- Pass, fail, blocked, not_run, and inconclusive statuses in this report are derived from provided evidence.result only.',
    '- Test cases without linked evidence remain no evidence or not_run. They are not marked pass by default.',
    '- This phase does not calculate release recommendation rules; it only displays the provided recommendation or inconclusive / not provided.',
    '',
    '## 9. Execution Evidence',
    '',
    '### Evidence Table',
    '',
    evidenceTable(evidence),
    '',
    '## 10. Severity Classifications',
    '',
    '### Severity Table',
    '',
    severityTable(severityClassifications),
    '',
    '## 11. Defect Findings',
    '',
    '### Defect Table',
    '',
    defectTable(defects),
    '',
    '## 12. Defect Analysis',
    '',
    defectAnalysisBullets(list(input.defectAnalyses)),
    '',
    '## 13. Ops and Deployment Checks',
    '',
    '### Ops Checklist Table',
    '',
    opsChecklistTable(opsChecklist),
    '',
    '## 14. Regression Suggestions',
    '',
    '### Regression Suggestion Table',
    '',
    regressionTable(regressionSuggestions),
    '',
    '## 15. Unknowns and Limitations',
    '',
    '### Unknowns',
    '',
    bullet(list(input.unknowns).map(formatUnknown)),
    '',
    '### Limitations',
    '',
    bullet(uniqueList([
      ...list(input.limitations),
      'Markdown report generation did not write files, execute tests, call MCP, call LLM, or compute release recommendation rules.',
      ...warnings,
    ])),
    '',
    '## 16. Release Recommendation',
    '',
    `Recommendation: ${releaseRecommendationLabel}`,
    '',
    `Rationale: ${input.releaseRecommendation ? 'Provided by input.' : 'Not provided. Phase 9 does not calculate release recommendation rules.'}`,
    '',
    'Blocking Issues: see severity classifications, defect findings, and ops checks above.',
    '',
    'Accepted Risks: not calculated in this phase.',
    '',
    'Missing Evidence: see warnings, unknowns, and test cases without linked evidence above.',
    '',
    `Release Recommendation Input Value: ${releaseRecommendation}`,
    '',
    '## 17. Appendix',
    '',
    appendix(input),
    '',
  ].join('\n');

  return {
    markdown,
    sections,
    warnings,
    missingInputs,
    limitations: uniqueList([
      ...list(input.limitations),
      'Report generator only assembles provided structured data into Markdown.',
      'Release recommendation rules are intentionally deferred to Phase 10.',
      'Unexecuted or unlinked test cases are not marked as pass.',
    ]),
  };
}
