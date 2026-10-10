/**
 * CODE128 bar/space widths for symbol values 0–106 (106 = stop, 13 modules).
 * Each digit is a module width, alternating bar/space starting with a bar.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

type Segment = { set: "B" | "C"; text: string };

/**
 * Why: Code set C packs two digits into one symbol, so long digit runs (dates,
 * times) shrink the barcode enough to print with 2-dot bars on 58mm paper,
 * which scanners read far more reliably than 1-dot bars.
 */
function segment(text: string): Segment[] {
  const segments: Segment[] = [];
  const pushB = (ch: string) => {
    const last = segments[segments.length - 1];
    if (last?.set === "B") last.text += ch;
    else segments.push({ set: "B", text: ch });
  };
  let i = 0;
  while (i < text.length) {
    let run = 0;
    while (i + run < text.length && /\d/.test(text[i + run])) run++;
    const atStart = i === 0;
    const atEnd = i + run === text.length;
    const threshold = atStart && atEnd ? 2 : atStart || atEnd ? 4 : 6;
    if (run >= threshold) {
      if (run % 2 === 1) {
        pushB(text[i]);
        i++;
        run--;
      }
      segments.push({ set: "C", text: text.slice(i, i + run) });
      i += run;
    } else {
      pushB(text[i]);
      i++;
    }
  }
  return segments;
}

export type Code128 = {
  /** Payload for ESC/POS `GS k 73` (code-set prefixes `{B` / `{C` included). */
  escpos: number[];
  /** One char per module: "1" = bar, "0" = space (start…stop, no quiet zone). */
  bars: string;
  modules: number;
};

/** Returns null when the text has characters CODE128-B cannot encode. */
export function encodeCode128(text: string): Code128 | null {
  if (!text || /[^\x20-\x7e]/.test(text)) return null;
  const segments = segment(text);
  const values: number[] = [];
  const escpos: number[] = [];

  segments.forEach((seg, index) => {
    if (index === 0) values.push(seg.set === "C" ? START_C : START_B);
    else values.push(seg.set === "C" ? CODE_C : CODE_B);
    escpos.push(0x7b, seg.set === "C" ? 0x43 : 0x42);
    if (seg.set === "C") {
      for (let i = 0; i < seg.text.length; i += 2) {
        const pair = Number(seg.text.slice(i, i + 2));
        values.push(pair);
        escpos.push(pair);
      }
    } else {
      for (const ch of seg.text) {
        values.push(ch.charCodeAt(0) - 32);
        escpos.push(ch.charCodeAt(0));
        if (ch === "{") escpos.push(0x7b);
      }
    }
  });

  const checksum =
    values.reduce((sum, value, index) => sum + value * (index === 0 ? 1 : index), 0) % 103;
  values.push(checksum, STOP);

  const bars = values
    .map((value) =>
      PATTERNS[value]
        .split("")
        .map((w, i) => (i % 2 === 0 ? "1" : "0").repeat(Number(w)))
        .join("")
    )
    .join("");

  return { escpos, bars, modules: bars.length };
}
