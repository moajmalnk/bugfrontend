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
  fileExtension: string;
  mimeType: string;
  targetPath: string;
  installHint: string;
  usageSteps: string[];
  accent: string;
};

export const CODO_AGENT_EXPORT_FORMATS: CodoAgentExportFormat[] = [
  {
    id: 'cursor',
    name: 'Cursor rules',
    shortName: 'Cursor',
    description: 'Project rule for Cursor Agent (.mdc with alwaysApply frontmatter).',
    filename: 'bugricer-codo.mdc',
    fileExtension: '.mdc',
    mimeType: 'text/plain;charset=utf-8',
    targetPath: '.cursor/rules/bugricer-codo.mdc',
    installHint: 'Text rule file — save under .cursor/rules/ in your repo.',
    usageSteps: [
      'Click **Download .mdc** (or **Copy**) to export your selected CODO rules.',
      'In your project repository, create the folder `.cursor/rules/` if it does not exist.',
      'Save the file as `bugricer-codo.mdc` inside `.cursor/rules/`.',
      'Open the project in **Cursor** — rules with `alwaysApply: true` load automatically for Agent.',
      'Optional: open **Cursor Settings → Rules** to confirm the rule appears and is enabled.',
      'Commit the file to git so every developer on the team shares the same CODO rules.',
    ],
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    id: 'antigravity',
    name: 'Antigravity rules',
    shortName: 'Antigravity',
    description: 'Agent instruction pack formatted for Antigravity / agent workspaces.',
    filename: 'ANTIGRAVITY_RULES.md',
    fileExtension: '.md',
    mimeType: 'text/plain;charset=utf-8',
    targetPath: 'docs/ANTIGRAVITY_RULES.md',
    installHint: 'Markdown text file — add to your Antigravity agent workspace.',
    usageSteps: [
      'Click **Download .md** (or **Copy**) to export your selected CODO rules.',
      'Open your **Antigravity** agent workspace or project folder.',
      'Save the file as `ANTIGRAVITY_RULES.md` in your agent rules folder or `docs/` directory.',
      'In Antigravity, point the agent to this file as persistent project instructions (workspace rules).',
      'Start a new agent session so the updated rules are loaded into context.',
      'Keep the file in version control so rule updates sync across the team.',
    ],
    accent: 'from-sky-500 to-indigo-600',
  },
  {
    id: 'android-studio',
    name: 'Android Studio / Gemini',
    shortName: 'Android Studio',
    description: 'AI guidelines for Android Studio Gemini / JetBrains AI Assistant.',
    filename: 'AI_GUIDELINES.md',
    fileExtension: '.md',
    mimeType: 'text/plain;charset=utf-8',
    targetPath: 'AI_GUIDELINES.md (project root)',
    installHint: 'Markdown text file — attach to Studio Gemini or JetBrains AI context.',
    usageSteps: [
      'Click **Download .md** (or **Copy**) to export your selected CODO rules.',
      'Place `AI_GUIDELINES.md` at the **root of your Android / Kotlin project**.',
      'In **Android Studio**: open **Settings → Tools → Gemini** (or JetBrains AI) and add this file to project AI context / guidelines.',
      'For **JetBrains AI Assistant**: use **Settings → Tools → AI Assistant → Project Guidelines** and reference the file.',
      'Restart or reopen the IDE chat panel so Gemini picks up the new guidelines.',
      'Commit the file so mobile developers share the same CODO standards.',
    ],
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'generic',
    name: 'Generic agentic AI',
    shortName: 'AGENTS.md',
    description: 'Universal AGENTS.md for Claude Code, Codex, Windsurf, Copilot, and others.',
    filename: 'AGENTS.md',
    fileExtension: '.md',
    mimeType: 'text/plain;charset=utf-8',
    targetPath: 'AGENTS.md (repository root)',
    installHint: 'Markdown text file — works with Claude Code, Codex, Windsurf, Copilot.',
    usageSteps: [
      'Click **Download .md** (or **Copy**) to export your selected CODO rules.',
      'Save the file as `AGENTS.md` at the **root of your git repository**.',
      'Most coding agents (Claude Code, Codex, Windsurf, Copilot) auto-read `AGENTS.md` on startup.',
      'For **Claude Code**, you may also copy or symlink the same content to `CLAUDE.md`.',
      'For **GitHub Copilot**, ensure the file is committed so workspace context includes it.',
      'Update and re-export whenever CODO rules change in BugRicer.',
    ],
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
  // UTF-8 BOM helps editors and OS file handlers treat the download as plain text.
  const blob = new Blob(['\uFEFF', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

export function formatExportFileSize(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
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
