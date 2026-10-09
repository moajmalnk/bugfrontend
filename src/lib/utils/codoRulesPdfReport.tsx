import { getCodoRealWorldExample } from "@/lib/codo/codoRealWorldExamples";
import {
  CODO_SOP_EXAMPLES,
  parseCodoRuleDescription,
} from "@/lib/codo/sopRuleExamples";
import {
  downloadHandbookPdf,
  formatRef,
  meaningfulEyebrow,
  type HandbookSection,
} from "@/lib/pdf/handbookPdf";

export type CodoRulePdfItem = {
  phase: string;
  ruleKey: string;
  title: string;
  subtitle?: string | null;
  description: string;
  sortOrder?: number;
};

type DownloadCodoRulesPdfOptions = {
  generatedBy?: string;
  generatedByRole?: string;
  /** Total rules in the catalog; when larger than `rules.length` the cover marks the export as filtered. */
  catalogTotal?: number;
  rules: CodoRulePdfItem[];
  filePrefix?: string;
};

const SECTIONS: Array<{ phase: string; prefix: string; title: string; description: string }> = [
  {
    phase: "developer",
    prefix: "DEV",
    title: "Developer",
    description:
      "Standards every change must meet before it is pushed: state handling, validation, UI system, data, caching, and security.",
  },
  {
    phase: "tester",
    prefix: "QA",
    title: "Tester / QA",
    description:
      "Stress checks QA runs before sign-off. A build that fails any of these is rejected.",
  },
  {
    phase: "project",
    prefix: "PRJ",
    title: "Project",
    description: "Project-level standards that apply across teams and releases.",
  },
];

export const downloadCodoRulesPdf = async (options: DownloadCodoRulesPdfOptions) => {
  const knownPhases = new Set(SECTIONS.map((s) => s.phase));
  const sectionDefs = [
    ...SECTIONS,
    ...[...new Set(options.rules.map((r) => r.phase))]
      .filter((phase) => !knownPhases.has(phase))
      .map((phase) => ({
        phase,
        prefix: phase.slice(0, 3).toUpperCase(),
        title: phase.charAt(0).toUpperCase() + phase.slice(1),
        description: "",
      })),
  ];

  const sections: HandbookSection[] = sectionDefs.map((def) => {
    const rules = [...options.rules]
      .filter((r) => r.phase === def.phase)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      id: def.phase,
      title: def.title,
      description: def.description,
      items: rules.map((rule, index) => {
        const { requirement, malayalam } = parseCodoRuleDescription(rule.description);
        const examples = CODO_SOP_EXAMPLES[rule.ruleKey];
        const realWorld = getCodoRealWorldExample(rule.ruleKey);
        return {
          ref: formatRef(def.prefix, rule.sortOrder ?? index + 1),
          key: rule.ruleKey,
          title: rule.title,
          eyebrow: meaningfulEyebrow(rule.subtitle),
          fields: [
            { kind: "text", label: "Requirement", value: requirement, emphasis: true },
            { kind: "malayalam", label: "Malayalam", value: malayalam },
            { kind: "text", label: "Real-world example", value: realWorld?.en },
            { kind: "malayalam", label: "Malayalam (real-world)", value: realWorld?.ml },
            { kind: "bad", label: "Non-compliant", value: examples?.bad },
            {
              kind: "good",
              label: "Compliant",
              value: examples?.good,
              language: examples?.language ?? "JavaScript",
            },
          ],
        };
      }),
    };
  });

  const exported = options.rules.length;
  const catalogTotal = options.catalogTotal ?? exported;

  await downloadHandbookPdf({
    documentTitle: "Common CODO Rules",
    documentSubtitle:
      "Production standards for developers, QA, and project leads. Every rule is enforceable in code review and QA sign-off.",
    audience: "Developers, QA testers, project leads",
    preparedBy: options.generatedBy,
    preparedByRole: options.generatedByRole,
    scopeNote:
      catalogTotal > exported
        ? `Filtered export · ${exported} of ${catalogTotal} rules`
        : undefined,
    itemNoun: { singular: "rule", plural: "rules" },
    readingGuide: [
      "Each rule has a reference code such as DEV-08 or QA-02. Cite it in code reviews, bug reports, and QA rejections.",
      "The requirement is the enforceable standard. The Malayalam line states the same rule for local teams.",
      "Real-world example (English + Malayalam) shows a concrete BugRicer-style failure so juniors understand why the rule exists.",
      "Non-compliant shows the pattern reviewers reject; Compliant shows the pattern they accept.",
      "Common CODO governs. Where Cursor Tips or any other guide disagrees, follow CODO.",
    ],
    sections,
    filePrefix: options.filePrefix || "codo-common-rules",
  });
};
