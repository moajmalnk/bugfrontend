import { parseTipDescription } from "@/lib/cursorTips/parseTipDescription";
import {
  downloadHandbookPdf,
  formatRef,
  meaningfulEyebrow,
  type HandbookSection,
} from "@/lib/pdf/handbookPdf";

export type CursorTipPdfItem = {
  phase: string;
  tipKey: string;
  title: string;
  subtitle?: string | null;
  description: string;
  analogyEn?: string | null;
  analogyMl?: string | null;
  whenToUse?: string | null;
  whenNotToUse?: string | null;
  exampleBad?: string | null;
  exampleGood?: string | null;
  exampleLanguage?: string | null;
  sortOrder?: number;
};

type DownloadCursorTipsPdfOptions = {
  generatedBy?: string;
  generatedByRole?: string;
  /** Total tips in the catalog; when larger than `tips.length` the cover marks the export as filtered. */
  catalogTotal?: number;
  tips: CursorTipPdfItem[];
  filePrefix?: string;
};

const SECTIONS: Array<{ phase: string; prefix: string; title: string; description: string }> = [
  {
    phase: "modes",
    prefix: "MOD",
    title: "Modes",
    description:
      "Pick the mode by what the agent is allowed to do: read, plan, edit, or investigate.",
  },
  {
    phase: "commands",
    prefix: "CMD",
    title: "Commands",
    description: "Slash commands that change how long an agent runs and where it works.",
  },
  {
    phase: "skills",
    prefix: "SKL",
    title: "Skills",
    description: "Packaged workflows for review, rules, and PR follow-up.",
  },
  {
    phase: "workflow",
    prefix: "WFL",
    title: "Workflow",
    description:
      "Habits that control scope, context size, and cost. They matter more than which model you pick.",
  },
  {
    phase: "review",
    prefix: "REV",
    title: "Review",
    description: "Checks to run on agent output before it is merged.",
  },
];

export const downloadCursorTipsPdf = async (options: DownloadCursorTipsPdfOptions) => {
  const knownPhases = new Set(SECTIONS.map((s) => s.phase));
  const sectionDefs = [
    ...SECTIONS,
    ...[...new Set(options.tips.map((t) => t.phase))]
      .filter((phase) => !knownPhases.has(phase))
      .map((phase) => ({
        phase,
        prefix: phase.slice(0, 3).toUpperCase(),
        title: phase.charAt(0).toUpperCase() + phase.slice(1),
        description: "",
      })),
  ];

  const sections: HandbookSection[] = sectionDefs.map((def) => {
    const tips = [...options.tips]
      .filter((t) => t.phase === def.phase)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return {
      id: def.phase,
      title: def.title,
      description: def.description,
      items: tips.map((tip, index) => {
        const { requirement, malayalam } = parseTipDescription(tip.description || "");
        return {
          ref: formatRef(def.prefix, tip.sortOrder ?? index + 1),
          key: tip.tipKey,
          title: tip.title,
          eyebrow: meaningfulEyebrow(tip.subtitle),
          fields: [
            { kind: "text", label: "Guidance", value: requirement, emphasis: true },
            { kind: "malayalam", label: "Malayalam", value: malayalam },
            { kind: "text", label: "Use when", value: tip.whenToUse },
            { kind: "text", label: "Avoid when", value: tip.whenNotToUse },
            { kind: "bilingual", label: "Analogy", en: tip.analogyEn, ml: tip.analogyMl },
            { kind: "bad", label: "Weak", value: tip.exampleBad },
            {
              kind: "good",
              label: "Strong",
              value: tip.exampleGood,
              language: tip.exampleLanguage || "Prompt",
            },
          ],
        };
      }),
    };
  });

  const exported = options.tips.length;
  const catalogTotal = options.catalogTotal ?? exported;

  await downloadHandbookPdf({
    documentTitle: "Cursor Tips",
    documentSubtitle:
      "How CODO teams run Cursor: choosing modes and models, scoping agent work, keeping context and cost down, and reviewing output.",
    audience: "Developers, QA testers, project leads",
    preparedBy: options.generatedBy,
    preparedByRole: options.generatedByRole,
    scopeNote:
      catalogTotal > exported
        ? `Filtered export · ${exported} of ${catalogTotal} tips`
        : undefined,
    itemNoun: { singular: "tip", plural: "tips" },
    readingGuide: [
      "Sections run in working order: pick a mode, use commands and skills, follow the workflow habits, then review.",
      "Each tip gives the guidance, when to use it and when not to, and a weak and a strong example you can copy.",
      "Reference codes such as WFL-08 stay stable, so you can point teammates to a specific tip.",
      "Common CODO still governs product work. These tips never override a CODO rule.",
    ],
    sections,
    filePrefix: options.filePrefix || "cursor-tips",
  });
};
