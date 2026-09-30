/**
 * CODO engineering standard that frames the individual rules.
 * Why: one constant feeds both the Common CODO page card and every agent
 * export (.mdc, AGENTS.md, …) so the published standard never drifts.
 */
export const CODO_STANDARD = {
  qualityPrinciple:
    'A feature is not finished because the screen works. It is finished when the data is correct, the state is correct, the API is correct, the database is correct, errors are handled, browsers behave consistently, performance is acceptable, security is verified, and the production deployment has been tested.',
  testingFlow: [
    'Developer',
    'Self Test',
    'Code Review',
    'API Test',
    'Database / Data Test',
    'QA Functional Test',
    'State / Loading Test',
    'Failure / Network Test',
    'Cross-Browser Test',
    'Responsive Test',
    'Security Test',
    'Performance Test',
    'Regression Test',
    'Production Deployment',
    'Production Smoke Test',
  ],
  realUserBehavior:
    'Throughout QA, deliberately test abnormal but realistic behavior: double-click, rapid clicks, refresh, Back, slow network, offline, multiple tabs, wrong input, empty input, large input and expired sessions.',
  notDoneWhen: [
    'code was written',
    'the API returns 200',
    'the UI appears correct',
    'the developer tested Chrome',
    "the feature works on the developer's machine",
  ],
  definitionOfDone: [
    'Requirement implemented.',
    'Backend / API verified.',
    'Database behavior verified.',
    'Frontend state verified.',
    'Loading, error and empty states verified.',
    'Cache behavior verified where applicable.',
    'Authentication and authorization verified.',
    'Critical failure scenarios tested.',
    'Browser / device behavior verified where applicable.',
    'Performance checked where applicable.',
    'Regression testing completed.',
    'Production deployment completed.',
    'Production smoke test passed.',
  ],
} as const;

export function buildCodoStandardMarkdown(): string {
  const s = CODO_STANDARD;
  return [
    '## CODO Standard',
    '',
    '### Quality Principle',
    '',
    `> ${s.qualityPrinciple}`,
    '',
    '### Mandatory Testing Flow',
    '',
    'Every production feature follows:',
    '',
    s.testingFlow.map((step, i) => `${i + 1}. ${step}`).join('\n'),
    '',
    s.realUserBehavior,
    '',
    '### Definition of Done',
    '',
    'A ticket must NOT be marked Done merely because:',
    '',
    s.notDoneWhen.map((item) => `- ${item}`).join('\n'),
    '',
    'A ticket is Done only when:',
    '',
    s.definitionOfDone.map((item, i) => `${i + 1}. ${item}`).join('\n'),
    '',
  ].join('\n');
}
