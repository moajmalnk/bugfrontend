import type { CodoCommonRule, CodoRulePhase } from '@/services/codoRulesService';

export type CodoAgentExportId =
  | 'cursor'
  | 'antigravity'
  | 'android-studio'
  | 'generic';

export type CodoAgentExportFormat = {
  id: CodoAgentExportId;
  name: string;
  shortName: string;
  description: string;
  filename: string;
  mimeType: string;
  installHint: string;
  accent: string;
};

export const CODO_AGENT_EXPORT_FORMATS: CodoAgentExportFormat[] = [
  {
    id: 'cursor',
    name: 'Cursor rules',
    shortName: 'Cursor',
    description: 'Project rule for Cursor Agent (.mdc with alwaysApply frontmatter).',
    filename: 'bugricer-codo.mdc',
    mimeType: 'text/markdown;charset=utf-8',
    installHint: 'Save under .cursor/rules/ in your repo (or paste into Cursor Rules).',
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    id: 'antigravity',
    name: 'Antigravity rules',
    shortName: 'Antigravity',
    description: 'Agent instruction pack formatted for Antigravity / agent workspaces.',
    filename: 'ANTIGRAVITY_RULES.md',
    mimeType: 'text/markdown;charset=utf-8',
    installHint: 'Drop into your Antigravity agent rules folder or project docs.',
    accent: 'from-sky-500 to-indigo-600',
  },
  {
    id: 'android-studio',
    name: 'Android Studio / Gemini',
    shortName: 'Android Studio',
    description: 'AI guidelines for Android Studio Gemini / JetBrains AI Assistant.',
    filename: 'AI_GUIDELINES.md',
    mimeType: 'text/markdown;charset=utf-8',
    installHint: 'Add to the project root or Studio AI guidelines / Gemini context.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'generic',
    name: 'Generic agentic AI',
    shortName: 'AGENTS.md',
    description: 'Universal AGENTS.md for Claude Code, Codex, Windsurf, Copilot, and others.',
    filename: 'AGENTS.md',
    mimeType: 'text/markdown;charset=utf-8',
    installHint: 'Place AGENTS.md (or CLAUDE.md) at the repo root for any coding agent.',
    accent: 'from-cyan-500 to-blue-600',
  },
];

const PHASE_LABEL: Record<CodoRulePhase, string> = {
  developer: 'Developer',
  tester: 'Tester / QA',
  project: 'Project',
};

const PHASE_ORDER: CodoRulePhase[] = ['developer', 'tester', 'project'];

function sortRules(rules: CodoCommonRule[]): CodoCommonRule[] {
  return rules.slice().sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase);
    const pb = PHASE_ORDER.indexOf(b.phase);
    if (pa !== pb) return pa - pb;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });
}

function groupByPhase(rules: CodoCommonRule[]): Array<{ phase: CodoRulePhase; rules: CodoCommonRule[] }> {
  const sorted = sortRules(rules);
  return PHASE_ORDER.map((phase) => ({
    phase,
    rules: sorted.filter((r) => r.phase === phase),
  })).filter((g) => g.rules.length > 0);
}

function ruleBlock(rule: CodoCommonRule): string {
  const lines = [`### ${rule.title.trim()}`, ''];
  if (rule.subtitle?.trim()) {
    lines.push(`*${rule.subtitle.trim()}*`, '');
  }
  lines.push(`\`${rule.rule_key}\``, '', rule.description.trim() || '_No description._', '');
  return lines.join('\n');
}

function buildMarkdownSections(rules: CodoCommonRule[]): string {
  const groups = groupByPhase(rules);
  if (groups.length === 0) {
    return '_No active CODO rules to export._\n';
  }
  return groups
    .map((g) => {
      const body = g.rules.map(ruleBlock).join('\n');
      return `## ${PHASE_LABEL[g.phase]}\n\n${body}`;
    })
    .join('\n');
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildCodoAgentExportContent(
  formatId: CodoAgentExportId,
  rules: CodoCommonRule[]
): string {
  const sections = buildMarkdownSections(rules);
  const count = rules.length;
  const headerMeta = `Generated from BugRicer Common CODO · ${count} rule${count === 1 ? '' : 's'} · ${stamp()}`;

  switch (formatId) {
    case 'cursor':
      return `---
description: BugRicer Common CODO engineering and QA rules
alwaysApply: true
---

# BugRicer CODO Rules (Cursor)

${headerMeta}

Follow these rules when writing, reviewing, or testing code in this repository.

${sections}`;

    case 'antigravity':
      return `# Antigravity Agent Rules — BugRicer CODO

${headerMeta}

You are assisting on the BugRicer codebase. Treat the following Common CODO rules as mandatory project policy.

${sections}

---

End of Antigravity rule pack.
`;

    case 'android-studio':
      return `# Android Studio / Gemini AI Guidelines — BugRicer CODO

${headerMeta}

Use these Common CODO rules as persistent project instructions for Android Studio Gemini, JetBrains AI Assistant, and related IDE agents.

${sections}
`;

    case 'generic':
    default:
      return `# AGENTS.md — BugRicer Common CODO

${headerMeta}

These instructions apply to any agentic coding system (Claude Code, Codex, Cursor, Windsurf, Copilot, Gemini, etc.). Prefer repository conventions and these CODO rules over generic defaults.

${sections}
`;
  }
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(content: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = content;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
