import type { ProjectStatus } from '@/lib/utils/projectUtils';

export interface DeveloperRule {
  key: string;
  number: number;
  titleEn: string;
  description: string;
}

export interface QaStressRule {
  key: string;
  title: string;
  description: string;
}

export const DEVELOPER_RULES: DeveloperRule[] = [
  {
    key: 'dev_rule_1',
    number: 1,
    titleEn: 'Hard State Reset',
    description: 'Reset components cleanly on form submit and modal unmount (useEffect cleanup phase).',
  },
  {
    key: 'dev_rule_2',
    number: 2,
    titleEn: 'Real-Time Input Validation',
    description: 'Inline validation messages must execute before submission triggers.',
  },
  {
    key: 'dev_rule_3',
    number: 3,
    titleEn: 'Persistent Input Protection',
    description: 'Trigger an Unsaved Changes warning if a user exits an active mid-form.',
  },
  {
    key: 'dev_rule_4',
    number: 4,
    titleEn: 'Data-Clear Verification',
    description: 'Completely clear local arrays on successful save or manual cancel. Do not depend on browser engine defaults.',
  },
  {
    key: 'dev_rule_5',
    number: 5,
    titleEn: 'Numeric Character Constraints',
    description: 'Enforce rigid max string clamping on telephone numbers (maxLength={10} or maxLength={15} for international scopes).',
  },
  {
    key: 'dev_rule_6',
    number: 6,
    titleEn: 'Sanitization Defenses',
    description: 'Enforce strict type validation arrays and escape scripts on both front and backend entry lanes to block malicious injections.',
  },
  {
    key: 'dev_rule_7',
    number: 7,
    titleEn: 'Length Guardrails',
    description: 'Maintain backend size limits alongside frontend validation inputs to completely prevent engine exceptions.',
  },
  {
    key: 'dev_rule_8',
    number: 8,
    titleEn: 'Anti-Double Click Lockout',
    description: 'Buttons must implement an immediate loading state spinner and switch to disabled state instantly on click #1.',
  },
  {
    key: 'dev_rule_9',
    number: 9,
    titleEn: 'Mandatory Deletion Gating',
    description: 'No entity removals allowed directly. Destructive operations require a Small 400px authorization confirmation block.',
  },
  {
    key: 'dev_rule_10',
    number: 10,
    titleEn: 'Submit Button Lock',
    description: 'Enforce dynamic programmatic locking on primary submission actions until fields pass local evaluations.',
  },
  {
    key: 'dev_rule_11',
    number: 11,
    titleEn: 'The Codo Corner',
    description: 'Apply a uniform 12px to 16px curve boundary on cards, blocks, overlays, and button interfaces.',
  },
  {
    key: 'dev_rule_12',
    number: 12,
    titleEn: '12-Column Grid Alignment',
    description: 'Desktop interface viewports must scale along a uniform 12-column framework using gap-4 or gap-6 white-spacing parameters.',
  },
  {
    key: 'dev_rule_13',
    number: 13,
    titleEn: 'Whitespace Isolation',
    description: 'Keep layout files clear of whitespace bloat; avoid appending margins (mb-X, pb-X) dynamically inside nested iterative layout arrays.',
  },
  {
    key: 'dev_rule_14',
    number: 14,
    titleEn: 'Viewport Scroll Defenses',
    description: 'Do not declare absolute overflow constraints (overflow: hidden) globally across standard views. Preserve Codo slim scroll styling.',
  },
  {
    key: 'dev_rule_15',
    number: 15,
    titleEn: 'Theme Integrity',
    description: 'Verify complete text contrast clarity across active components when rapidly toggling between dark and light templates.',
  },
  {
    key: 'dev_rule_16',
    number: 16,
    titleEn: 'Bidirectional Text Safety',
    description: 'Form elements must flawlessly handle RTL alignment matrices (dir="rtl") when parsing localized Arabic text layouts without scrambling indices.',
  },
  {
    key: 'dev_rule_17',
    number: 17,
    titleEn: 'Custom Picker Normalization',
    description: 'Separate display logic cleanly from state management inputs within custom calendar or selector tools; handle empty values without unexpected application breaks.',
  },
  {
    key: 'dev_rule_18',
    number: 18,
    titleEn: 'Strict Data Sorting',
    description: 'Relational dashboards and index tables must explicitly incorporate server-side order rules (ORDER BY created_at DESC) to ensure data layout clarity.',
  },
  {
    key: 'dev_rule_19',
    number: 19,
    titleEn: 'Skeleton Shimmer Loaders',
    description: 'White outs or plain loading views are banned; implement flickering shimmer shells that map closely to incoming content structures.',
  },
  {
    key: 'dev_rule_20',
    number: 20,
    titleEn: 'The 1.5-Second Threshold',
    description: 'Streamline operational execution paths to complete initial render in under 1.5 seconds via image optimization (WebP) and functional PWA service caching.',
  },
  {
    key: 'dev_rule_21',
    number: 21,
    titleEn: 'Database Indexing',
    description: 'Confirm search keys, matching indices, and query-heavy filters link straight to optimized column structures within the data schema.',
  },
  {
    key: 'dev_rule_22',
    number: 22,
    titleEn: 'High-Volume Scale',
    description: 'Implement server-managed page boundaries or robust infinite-scroll loops on modules surpassing 100 historical data row entries.',
  },
  {
    key: 'dev_rule_23',
    number: 23,
    titleEn: 'Console Scrubbing',
    description: 'Ensure code logic is cleared of debug logs (console.log(), print(), dd()) prior to running production deployment builds.',
  },
  {
    key: 'dev_rule_24',
    number: 24,
    titleEn: 'Secret Variable Isolation',
    description: 'Move API tokens, merchant gateway profiles, and security files safely out of local code and into isolated .env configurations.',
  },
  {
    key: 'dev_rule_25',
    number: 25,
    titleEn: 'Documentation Mandate',
    description: 'Enforce descriptive JSDoc / PHPDoc standard summaries clarifying the exact architectural reasoning behind non-trivial helpers or data operations.',
  },
];

export const QA_STRESS_RULES: QaStressRule[] = [
  {
    key: 'qa_apple_sandbox',
    title: 'The Apple Ecosystem Sandbox',
    description: 'Test cross-platform layout rendering across Safari environments. Confirm layout structures, card radii, and shadow boundaries scale without breaking.',
  },
  {
    key: 'qa_click_attack',
    title: 'The Click Attack Safeguard',
    description: 'Stress-test button structures via continuous high-speed double and triple clicks. Ensure execution locks prevent duplicate API records.',
  },
  {
    key: 'qa_theme_interruption',
    title: 'The Theme Interruption Matrix',
    description: 'Change interface color styles rapidly back and forth mid-form to detect and address unreadable text variables.',
  },
  {
    key: 'qa_input_interception',
    title: 'The Input Interception Prompt',
    description: 'Open form modals, alter form field strings, and simulate a layout close command. Verify warning safeguards capture user context safely.',
  },
  {
    key: 'qa_empty_array',
    title: 'The Empty Array Fallback',
    description: 'Simulate empty or empty-result states across relational data blocks. Confirm descriptive empty placeholder messaging handles the viewport safely.',
  },
  {
    key: 'qa_boundary_expansion',
    title: 'The Boundary Expansion Constraint',
    description: 'Attempt long string pastes (100+ digit entries) in phone inputs. Confirm truncation rules drop unnecessary data inputs seamlessly.',
  },
  {
    key: 'qa_network_break',
    title: 'The Network Break Strategy',
    description: 'Drop network visibility mid-action or check server error routing. Confirm immediate user notifications via interactive Toast alerts.',
  },
];

export type CompliancePipelineStage =
  | 'developer_unverified'
  | 'developer_complete'
  | 'qa_inspection'
  | 'qa_complete'
  | 'admin_ready';

export interface ComplianceCheckItem {
  rule_key: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verified_by_username?: string | null;
}

export interface ComplianceCustomRule {
  rule_key: string;
  phase: 'developer' | 'tester' | 'project';
  title: string;
  subtitle: string | null;
  description: string;
  created_by: string;
  created_at: string;
}

export interface ComplianceProgress {
  verified: number;
  total: number;
}

export interface ProjectComplianceSummary {
  pipeline_stage: CompliancePipelineStage;
  developer_verified: number;
  developer_total: number;
  tester_verified: number;
  tester_total: number;
  project_verified: number;
  project_total: number;
  emergency_bypass: boolean;
}

export interface ProjectComplianceData {
  project_id: string;
  pipeline_stage: CompliancePipelineStage;
  developer_completed_at: string | null;
  developer_completed_by: string | null;
  tester_completed_at: string | null;
  tester_completed_by: string | null;
  emergency_bypass: boolean;
  emergency_bypass_by: string | null;
  emergency_bypass_at: string | null;
  emergency_bypass_reason: string | null;
  developer_progress: ComplianceProgress;
  tester_progress: ComplianceProgress;
  project_progress: ComplianceProgress;
  developer_checks: ComplianceCheckItem[];
  tester_checks: ComplianceCheckItem[];
  project_checks: ComplianceCheckItem[];
  custom_rules?: ComplianceCustomRule[];
  project?: { id: string; status: ProjectStatus; name?: string };
}

export function getPipelineStageLabel(stage: CompliancePipelineStage): string {
  switch (stage) {
    case 'developer_unverified':
      return 'Developer Unverified';
    case 'developer_complete':
      return 'Developer Complete';
    case 'qa_inspection':
      return 'QA Inspection';
    case 'qa_complete':
      return 'QA Complete';
    case 'admin_ready':
      return 'Admin Final Lock';
    default:
      return stage;
  }
}

export function isCompliancePipelineSatisfied(
  summary: Pick<ProjectComplianceSummary, 'pipeline_stage' | 'emergency_bypass'> | null | undefined
): boolean {
  if (!summary) return false;
  if (summary.emergency_bypass) return true;
  return summary.pipeline_stage === 'admin_ready';
}

export function isClosedProjectStatus(status: string): boolean {
  return status === 'completed' || status === 'release_ready' || status === 'archived';
}
