/**
 * Writes committed agent export files from the builtin CODO catalog.
 * Run from frontend/: npx tsx scripts/generate-codo-exports.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCodoAgentExportContent,
  CODO_AGENT_EXPORT_FORMATS,
  getBuiltinCodoRulesForExport,
  type CodoAgentExportId,
} from '../src/lib/utils/codoRulesAgentExport';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '../..');

const targets: Record<CodoAgentExportId, string> = {
  cursor: join(repoRoot, '.cursor/rules/bugricer-codo.mdc'),
  antigravity: join(repoRoot, 'docs/ANTIGRAVITY_RULES.md'),
  'android-studio': join(repoRoot, 'AI_GUIDELINES.md'),
  generic: join(repoRoot, 'AGENTS.md'),
};

const rules = getBuiltinCodoRulesForExport();
mkdirSync(join(repoRoot, '.cursor/rules'), { recursive: true });
mkdirSync(join(repoRoot, 'docs'), { recursive: true });

for (const fmt of CODO_AGENT_EXPORT_FORMATS) {
  const content = buildCodoAgentExportContent(fmt.id, rules);
  const outPath = targets[fmt.id];
  writeFileSync(outPath, content, 'utf8');
  console.log(`wrote ${outPath} (${content.length} chars, ${rules.length} rules)`);
}
