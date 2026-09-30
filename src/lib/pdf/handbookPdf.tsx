import React from "react";
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

/**
 * Shared layout for BugRicer standards handbooks (Common CODO Rules, Cursor Tips).
 *
 * Why: both exports are reference documents people cite in reviews, so they need
 * stable reference codes, a clickable contents page, running headers, page numbers,
 * and full untruncated text with Malayalam shaped by a font that supports it.
 */

export type HandbookField =
  | { kind: "text"; label: string; value?: string | null; emphasis?: boolean }
  | { kind: "malayalam"; label: string; value?: string | null }
  | { kind: "bilingual"; label: string; en?: string | null; ml?: string | null }
  | { kind: "bad"; label: string; value?: string | null }
  | { kind: "good"; label: string; value?: string | null; language?: string | null };

export type HandbookItem = {
  ref: string;
  key: string;
  title: string;
  eyebrow?: string | null;
  fields: HandbookField[];
};

export type HandbookSection = {
  id: string;
  title: string;
  description?: string;
  items: HandbookItem[];
};

export type HandbookDocumentOptions = {
  documentTitle: string;
  documentSubtitle: string;
  audience: string;
  preparedBy?: string;
  preparedByRole?: string;
  scopeNote?: string;
  itemNoun: { singular: string; plural: string };
  readingGuide: string[];
  sections: HandbookSection[];
  filePrefix: string;
};

const BRAND_NAVY = "#0F2342";
const BRAND_GREEN = "#17A95A";
const INK = "#111827";
const BODY = "#374151";
const MUTED = "#6B7280";
const HAIRLINE = "#E5E7EB";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

let fontsReady: Promise<void> | null = null;

/**
 * Why: Noto Sans Malayalam crashes fontkit on virama clusters (xCoordinate null),
 * so Malayalam runs use Noto Serif Malayalam. Long unbroken tokens (URLs, class
 * lists) are chunked so they wrap instead of running off the page.
 */
const ensureHandbookFonts = async () => {
  if (!fontsReady) {
    fontsReady = (async () => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      Font.register({
        family: "NotoSans",
        fonts: [
          { src: `${origin}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
          { src: `${origin}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
        ],
      });
      Font.register({
        family: "NotoSerifMalayalam",
        fonts: [
          { src: `${origin}/fonts/NotoSerifMalayalam-Regular.ttf`, fontWeight: 400 },
          { src: `${origin}/fonts/NotoSerifMalayalam-Bold.ttf`, fontWeight: 700 },
        ],
      });
      Font.registerHyphenationCallback((word) =>
        word.length > 28 ? word.match(/.{1,18}/g) ?? [word] : [word]
      );
      await Promise.all([
        Font.load({ fontFamily: "NotoSans" }),
        Font.load({ fontFamily: "NotoSerifMalayalam" }),
      ]);
    })().catch((err) => {
      fontsReady = null;
      throw err;
    });
  }
  await fontsReady;
};

const MALAYALAM = /[\u0D00-\u0D7F]/;

const normalizeProse = (value?: string | null) =>
  (value || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

/** Split mixed text so Latin stays on NotoSans and Malayalam uses the serif face. */
const splitScriptRuns = (value: string) => {
  const runs: Array<{ ml: boolean; text: string }> = [];
  let buf = "";
  let ml = MALAYALAM.test(value[0] || "");
  for (const ch of value) {
    const nextMl = MALAYALAM.test(ch) ? true : /[A-Za-z0-9]/.test(ch) ? false : ml;
    if (nextMl !== ml && buf) {
      runs.push({ ml, text: buf });
      buf = ch;
    } else {
      buf += ch;
    }
    ml = nextMl;
  }
  if (buf) runs.push({ ml, text: buf });
  return runs;
};

/**
 * Courier is a WinAnsi standard font: map common symbols to ASCII and report
 * whether anything unsupported remains so the caller can fall back to NotoSans.
 */
const COURIER_MAP: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "✓": "[x]",
  "✗": "[ ]",
  "◆": "*",
};

const toCourierText = (value: string): { text: string; supported: boolean } => {
  let text = "";
  for (const ch of value) text += COURIER_MAP[ch] ?? ch;
  text = text.replace(/^( +)/gm, (spaces) => "\u00A0".repeat(spaces.length));
  const supported = !/[^\u0009\u000A\u000D\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/.test(text);
  return { text, supported };
};

const isChecklistLanguage = (language?: string | null) =>
  /checklist|procedure|qa/i.test(language || "");

const styles = StyleSheet.create({
  coverPage: {
    fontFamily: "NotoSans",
    fontSize: 10,
    color: INK,
    paddingTop: 172,
    paddingBottom: 120,
    paddingHorizontal: 82,
  },
  coverBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
  },
  coverKicker: {
    fontSize: 8.5,
    fontWeight: 700,
    color: BRAND_GREEN,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  coverTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 700,
    color: BRAND_NAVY,
    lineHeight: 1.15,
  },
  coverSubtitle: {
    marginTop: 8,
    fontSize: 11.5,
    color: BODY,
    lineHeight: 1.45,
  },
  coverRule: {
    marginTop: 18,
    marginBottom: 16,
    flexDirection: "row",
    height: 3,
  },
  controlTable: {
    borderTop: `1 solid ${HAIRLINE}`,
  },
  controlRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottom: `1 solid ${HAIRLINE}`,
  },
  controlLabel: {
    width: 96,
    fontSize: 8.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  controlValue: {
    flex: 1,
    fontSize: 9.5,
    color: INK,
  },
  statRow: {
    marginTop: 18,
    flexDirection: "row",
  },
  statTile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    border: `1 solid ${HAIRLINE}`,
    backgroundColor: "#F9FAFB",
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    color: BRAND_NAVY,
  },
  statLabel: {
    marginTop: 1,
    fontSize: 8,
    color: MUTED,
  },
  guideHeading: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 9.5,
    fontWeight: 700,
    color: BRAND_NAVY,
  },
  guideRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  guideBullet: {
    width: 12,
    fontSize: 9,
    color: BRAND_GREEN,
    fontWeight: 700,
  },
  guideText: {
    flex: 1,
    fontSize: 9,
    color: BODY,
    lineHeight: 1.45,
  },

  page: {
    fontFamily: "NotoSans",
    fontSize: 9.5,
    color: INK,
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },
  runningHeader: {
    position: "absolute",
    top: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottom: `1 solid ${HAIRLINE}`,
  },
  runningBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  runningLogo: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  runningTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: BRAND_NAVY,
  },
  runningSection: {
    fontSize: 8,
    color: MUTED,
  },
  runningFooter: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 7,
    borderTop: `1 solid ${HAIRLINE}`,
    fontSize: 7.5,
    color: MUTED,
  },

  tocHeading: {
    fontSize: 18,
    fontWeight: 700,
    color: BRAND_NAVY,
    marginBottom: 4,
  },
  tocIntro: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 14,
  },
  tocSection: {
    marginBottom: 12,
  },
  tocSectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: 4,
    marginBottom: 4,
    borderBottom: `1.5 solid ${BRAND_NAVY}`,
  },
  tocSectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: BRAND_NAVY,
    textDecoration: "none",
  },
  tocSectionCount: {
    fontSize: 8.5,
    color: MUTED,
  },
  tocEntry: {
    flexDirection: "row",
    paddingVertical: 2.5,
    borderBottom: `0.5 solid #F3F4F6`,
    textDecoration: "none",
  },
  tocRef: {
    width: 56,
    fontSize: 8.5,
    fontWeight: 700,
    color: BRAND_GREEN,
  },
  tocTitle: {
    flex: 1,
    fontSize: 9,
    color: INK,
  },

  sectionBand: {
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: BRAND_NAVY,
  },
  sectionKicker: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#86EFAC",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 9,
    color: "#D1D5DB",
    lineHeight: 1.45,
  },

  item: {
    marginBottom: 12,
    borderRadius: 10,
    border: `1 solid ${HAIRLINE}`,
    borderLeft: `3 solid ${BRAND_GREEN}`,
    backgroundColor: "#FFFFFF",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottom: `1 solid #F3F4F6`,
  },
  refBadge: {
    marginRight: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: BRAND_NAVY,
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: 700,
  },
  itemTitleWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: INK,
    lineHeight: 1.3,
  },
  itemEyebrow: {
    marginTop: 1,
    fontSize: 8,
    color: MUTED,
  },
  itemKey: {
    marginLeft: 8,
    fontFamily: "Courier",
    fontSize: 7.5,
    color: MUTED,
  },
  itemBody: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  fieldRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  fieldLabel: {
    width: 88,
    paddingRight: 8,
    fontSize: 7.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingTop: 1.5,
  },
  fieldValue: {
    flex: 1,
  },
  prose: {
    fontFamily: "NotoSans",
    fontSize: 9.5,
    color: BODY,
    lineHeight: 1.5,
  },
  proseEmphasis: {
    fontFamily: "NotoSans",
    fontSize: 9.5,
    color: INK,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  malayalam: {
    fontFamily: "NotoSerifMalayalam",
    fontSize: 9.5,
    color: "#1F2937",
    lineHeight: 1.8,
  },
  badBox: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    border: "1 solid #FECACA",
    backgroundColor: "#FEF2F2",
  },
  goodBox: {
    borderRadius: 6,
    border: "1 solid #1F2937",
    backgroundColor: "#0D1117",
  },
  goodBoxHeader: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottom: "1 solid #1F2937",
    fontSize: 7,
    fontWeight: 700,
    color: "#9CA3AF",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  checklistBox: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    border: "1 solid #BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 8.2,
    lineHeight: 1.45,
  },
});

const RichText = ({ value, style }: { value: string; style: Style }) => {
  if (!MALAYALAM.test(value)) return <Text style={style}>{value}</Text>;
  return (
    <Text style={style}>
      {splitScriptRuns(value).map((run, i) => (
        <Text key={i} style={run.ml ? styles.malayalam : undefined}>
          {run.text}
        </Text>
      ))}
    </Text>
  );
};

const CodeText = ({ value, color }: { value: string; color: string }) => {
  const { text, supported } = toCourierText(value.replace(/\t/g, "  ").trimEnd());
  if (supported) return <Text style={[styles.code, { color }]}>{text}</Text>;
  return <RichText value={value.trimEnd()} style={{ ...styles.prose, fontSize: 8.5, color }} />;
};

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.fieldRow} minPresenceAhead={24}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldValue}>{children}</View>
  </View>
);

const renderField = (field: HandbookField, index: number) => {
  switch (field.kind) {
    case "text": {
      const value = normalizeProse(field.value);
      if (!value) return null;
      return (
        <FieldRow key={index} label={field.label}>
          <RichText value={value} style={field.emphasis ? styles.proseEmphasis : styles.prose} />
        </FieldRow>
      );
    }
    case "malayalam": {
      const value = normalizeProse(field.value);
      if (!value) return null;
      return (
        <FieldRow key={index} label={field.label}>
          <RichText value={value} style={styles.malayalam} />
        </FieldRow>
      );
    }
    case "bilingual": {
      const en = normalizeProse(field.en);
      const ml = normalizeProse(field.ml);
      if (!en && !ml) return null;
      return (
        <FieldRow key={index} label={field.label}>
          {en ? <RichText value={en} style={styles.prose} /> : null}
          {ml ? (
            <View style={{ marginTop: en ? 2 : 0 }}>
              <RichText value={ml} style={styles.malayalam} />
            </View>
          ) : null}
        </FieldRow>
      );
    }
    case "bad": {
      const value = (field.value || "").trim();
      if (!value) return null;
      return (
        <FieldRow key={index} label={field.label}>
          <View style={styles.badBox}>
            <CodeText value={value} color="#9F1239" />
          </View>
        </FieldRow>
      );
    }
    case "good": {
      const value = (field.value || "").trim();
      if (!value) return null;
      if (isChecklistLanguage(field.language)) {
        return (
          <FieldRow key={index} label={field.label}>
            <View style={styles.checklistBox}>
              <RichText value={value} style={{ ...styles.prose, color: "#14532D" }} />
            </View>
          </FieldRow>
        );
      }
      return (
        <FieldRow key={index} label={field.label}>
          <View style={styles.goodBox}>
            {field.language ? <Text style={styles.goodBoxHeader}>{field.language}</Text> : null}
            <View style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <CodeText value={value} color="#E5E7EB" />
            </View>
          </View>
        </FieldRow>
      );
    }
    default:
      return null;
  }
};

const itemAnchor = (item: HandbookItem) => `item-${item.ref}`;
const sectionAnchor = (section: HandbookSection) => `section-${section.id}`;

/** react-pdf renders `bookmark` on any node, but its typings only declare it on Page. */
const itemBookmark = (item: HandbookItem) =>
  ({ bookmark: { title: `${item.ref}  ${item.title}`, fit: true } }) as Record<string, unknown>;

const RunningChrome = ({
  documentTitle,
  sectionTitle,
  generatedOn,
}: {
  documentTitle: string;
  sectionTitle: string;
  generatedOn: string;
}) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <>
      <View style={styles.runningHeader} fixed>
        <View style={styles.runningBrand}>
          <Image src={`${origin}/logo.png`} style={styles.runningLogo} />
          <Text style={styles.runningTitle}>CODO · {documentTitle}</Text>
        </View>
        <Text style={styles.runningSection}>{sectionTitle}</Text>
      </View>
      <View style={styles.runningFooter} fixed>
        <Text>Internal · Generated {generatedOn}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
};

const HandbookDocument = ({
  options,
  generatedAt,
}: {
  options: HandbookDocumentOptions;
  generatedAt: Date;
}) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sections = options.sections.filter((s) => s.items.length > 0);
  const total = sections.reduce((sum, s) => sum + s.items.length, 0);
  const generatedOn = generatedAt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const generatedFull = generatedAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const version = generatedAt
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    .replace(/-/g, ".");
  const preparedBy = options.preparedBy
    ? `${options.preparedBy}${options.preparedByRole ? ` (${options.preparedByRole})` : ""}`
    : "System";

  const control: Array<[string, string]> = [
    ["Document", options.documentTitle],
    ["Version", version],
    ["Generated", `${generatedFull} IST`],
    ["Prepared by", preparedBy],
    ["Audience", options.audience],
    ["Scope", options.scopeNote || `Complete catalog · ${total} ${options.itemNoun.plural}`],
    ["Classification", "Internal — CODO AI Innovations"],
  ];

  return (
    <Document
      title={`${options.documentTitle} · ${version}`}
      author={preparedBy}
      subject={options.documentSubtitle}
      creator="BugRicer"
      producer="BugRicer"
    >
      <Page size="A4" style={styles.coverPage}>
        <Image src={`${origin}/letter%20pad%20.png`} style={styles.coverBackground} fixed />
        <Text style={styles.coverKicker}>BugRicer standards handbook</Text>
        <Text style={styles.coverTitle}>{options.documentTitle}</Text>
        <Text style={styles.coverSubtitle}>{options.documentSubtitle}</Text>
        <View style={styles.coverRule}>
          <View style={{ flex: 5, backgroundColor: BRAND_NAVY }} />
          <View style={{ flex: 1, backgroundColor: BRAND_GREEN }} />
        </View>

        <View style={styles.controlTable}>
          {control.map(([label, value]) => (
            <View key={label} style={styles.controlRow}>
              <Text style={styles.controlLabel}>{label}</Text>
              <Text style={styles.controlValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statRow}>
          <View
            style={[
              styles.statTile,
              { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", marginRight: 6 },
            ]}
          >
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total {options.itemNoun.plural}</Text>
          </View>
          {sections.map((s, i) => (
            <View
              key={s.id}
              style={[styles.statTile, i < sections.length - 1 ? { marginRight: 6 } : {}]}
            >
              <Text style={styles.statValue}>{s.items.length}</Text>
              <Text style={styles.statLabel}>{s.title}</Text>
            </View>
          ))}
        </View>

        {options.readingGuide.length > 0 ? (
          <View>
            <Text style={styles.guideHeading}>How to use this document</Text>
            {options.readingGuide.map((line, i) => (
              <View key={i} style={styles.guideRow}>
                <Text style={styles.guideBullet}>{i + 1}.</Text>
                <Text style={styles.guideText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>

      <Page size="A4" style={styles.page}>
        <RunningChrome
          documentTitle={options.documentTitle}
          sectionTitle="Contents"
          generatedOn={generatedOn}
        />
        <Text style={styles.tocHeading}>Contents</Text>
        <Text style={styles.tocIntro}>
          Select any entry to jump to it. Reference codes stay the same across exports, so
          you can cite them in reviews and bug reports.
        </Text>
        {sections.map((section) => (
          <View key={section.id} style={styles.tocSection}>
            <View style={styles.tocSectionRow} minPresenceAhead={40}>
              <Link src={`#${sectionAnchor(section)}`} style={styles.tocSectionTitle}>
                {section.title}
              </Link>
              <Text style={styles.tocSectionCount}>
                {section.items.length}{" "}
                {section.items.length === 1 ? options.itemNoun.singular : options.itemNoun.plural}
              </Text>
            </View>
            {section.items.map((item) => (
              <Link key={item.ref} src={`#${itemAnchor(item)}`} style={styles.tocEntry}>
                <Text style={styles.tocRef}>{item.ref}</Text>
                <Text style={styles.tocTitle}>{item.title}</Text>
              </Link>
            ))}
          </View>
        ))}
      </Page>

      {sections.map((section) => (
        <Page
          key={section.id}
          size="A4"
          style={styles.page}
          bookmark={{ title: section.title, fit: true }}
        >
          <RunningChrome
            documentTitle={options.documentTitle}
            sectionTitle={section.title}
            generatedOn={generatedOn}
          />
          <View>
            <View id={sectionAnchor(section)} style={styles.sectionBand} wrap={false}>
              <Text style={styles.sectionKicker}>
                {section.items.length}{" "}
                {section.items.length === 1 ? options.itemNoun.singular : options.itemNoun.plural}
              </Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.description ? (
                <Text style={styles.sectionDescription}>{section.description}</Text>
              ) : null}
            </View>

            {section.items.map((item) => (
              <View
                key={item.ref}
                id={itemAnchor(item)}
                style={styles.item}
                {...itemBookmark(item)}
              >
                <View style={styles.itemHeader} wrap={false} minPresenceAhead={60}>
                  <Text style={styles.refBadge}>{item.ref}</Text>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.eyebrow ? <Text style={styles.itemEyebrow}>{item.eyebrow}</Text> : null}
                  </View>
                  <Text style={styles.itemKey}>{item.key}</Text>
                </View>
                <View style={styles.itemBody}>{item.fields.map(renderField)}</View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
};

/** Hides auto-generated eyebrows like "Rule 12" that only repeat the reference code. */
export const meaningfulEyebrow = (value?: string | null) => {
  const text = (value || "").trim();
  if (!text) return null;
  if (/^(rule|qa stress|mode|command|skill|workflow|review)\s+\d+$/i.test(text)) return null;
  return text;
};

export const formatRef = (prefix: string, order: number) =>
  `${prefix}-${String(order).padStart(2, "0")}`;

export const downloadHandbookPdf = async (options: HandbookDocumentOptions) => {
  await ensureHandbookFonts();
  const generatedAt = new Date();
  const blob = await pdf(
    <HandbookDocument options={options} generatedAt={generatedAt} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = generatedAt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  link.href = url;
  link.download = `${options.filePrefix}-${stamp}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
