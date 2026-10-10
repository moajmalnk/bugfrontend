import { PRINT_DOTS, type PreviewBlock } from "@/lib/escposReceipt";
import { cn } from "@/lib/utils";
import { Scissors } from "lucide-react";
import { useMemo } from "react";

/** On-screen width of the 48mm printable area. */
const PAPER_PX = 288;
const PX_PER_DOT = PAPER_PX / PRINT_DOTS;

/** Monospace glyphs are ~0.6em wide, so this fits exactly `columns` characters. */
const fontPx = (widthPx: number, columns: number) => widthPx / (columns * 0.6);

function BarcodePreview({ block }: { block: Extract<PreviewBlock, { type: "barcode" }> }) {
  const rects = useMemo(() => {
    const out: { x: number; w: number }[] = [];
    for (let i = 0; i < block.bars.length; i++) {
      if (block.bars[i] !== "1") continue;
      const start = i;
      while (block.bars[i + 1] === "1") i++;
      out.push({ x: start, w: i - start + 1 });
    }
    return out;
  }, [block.bars]);
  const width = block.bars.length * block.moduleWidth * PX_PER_DOT;

  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <svg
        role="img"
        aria-label={`Barcode ${block.value}`}
        width={width}
        height={block.heightDots * PX_PER_DOT}
        viewBox={`0 0 ${block.bars.length} 1`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {rects.map((r) => (
          <rect key={r.x} x={r.x} y={0} width={r.w} height={1} fill="#000" />
        ))}
      </svg>
      <span className="font-mono text-[9px] leading-none tracking-wide text-black">{block.value}</span>
    </div>
  );
}

function QrPreview({ block }: { block: Extract<PreviewBlock, { type: "qr" }> }) {
  const count = block.modules.length;
  const path = useMemo(
    () =>
      block.modules
        .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
        .join(""),
    [block.modules]
  );
  const size = block.sizeDots * PX_PER_DOT;

  return (
    <svg
      role="img"
      aria-label={`QR code for ${block.value}`}
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
      className="mx-auto my-1"
    >
      <path d={path} fill="#000" />
    </svg>
  );
}

/** Paper-accurate preview: text at the printer's column count, logo, codes and cut lines. */
export function ReceiptPreview({
  blocks,
  columns,
  areaDots = PRINT_DOTS,
}: {
  blocks: PreviewBlock[];
  columns: number;
  /** Head width the slip uses after the paper-position shift; shown centred on the paper. */
  areaDots?: number;
}) {
  const widthPx = Math.min(PAPER_PX, areaDots * PX_PER_DOT);
  const fontSize = fontPx(widthPx, columns);

  return (
    <div className="mx-auto flex flex-col text-black" style={{ width: widthPx }}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "text":
            return (
              <pre
                key={index}
                className="m-0 whitespace-pre font-mono leading-[1.35]"
                style={{ fontSize }}
              >
                {block.lines.join("\n")}
              </pre>
            );
          case "image":
            return block.src ? (
              // The logo bitmap is full-head wide with blank sides; clip it to the slip width.
              <div key={index} className="flex justify-center overflow-hidden">
                <img
                  src={block.src}
                  alt="BugRicer logo"
                  width={block.widthDots * PX_PER_DOT}
                  height={block.heightDots * PX_PER_DOT}
                  className="max-w-none shrink-0 [image-rendering:pixelated]"
                />
              </div>
            ) : (
              <div
                key={index}
                className="mx-auto flex items-center justify-center rounded-xl border border-dashed border-slate-300 text-[10px] text-slate-500"
                style={{ width: block.widthDots * PX_PER_DOT, height: block.heightDots * PX_PER_DOT }}
              >
                Stored logo
              </div>
            );
          case "qr":
            return <QrPreview key={index} block={block} />;
          case "barcode":
            return <BarcodePreview key={index} block={block} />;
          case "cut":
            return (
              <div
                key={index}
                className={cn(
                  "my-3 flex items-center gap-2 text-[10px] font-medium text-slate-500",
                  index === blocks.length - 1 && "mb-0"
                )}
              >
                <Scissors className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span
                  className={cn(
                    "flex-1 border-t-2",
                    block.mode === "partial" ? "border-dotted border-slate-300" : "border-dashed border-slate-400"
                  )}
                />
                <span className="shrink-0">
                  {block.mode === "tear" ? "Tear here" : block.mode === "full" ? "Full cut" : "Partial cut"}
                </span>
              </div>
            );
        }
      })}
    </div>
  );
}
