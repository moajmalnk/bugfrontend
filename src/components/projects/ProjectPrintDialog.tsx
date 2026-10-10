import { ThermalPrintDialog, type ReceiptBuilder } from "@/components/print/ThermalPrintDialog";
import { publicAppOrigin } from "@/lib/escposReceipt";
import { buildProjectReceipt } from "@/lib/thermalReceipt";
import type { ProjectWhatsAppShareData } from "@/services/whatsappService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: ProjectWhatsAppShareData }
  | { status: "error" };

interface ProjectPrintDialogProps {
  project: { id: string; name: string } | null;
  onClose: () => void;
  loadData: () => Promise<ProjectWhatsAppShareData>;
  printedBy?: string | null;
}

export function ProjectPrintDialog({ project, onClose, loadData, printedBy }: ProjectPrintDialogProps) {
  const open = project !== null;
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const requestIdRef = useRef(0);
  const projectUrl = project ? `${publicAppOrigin()}/projects/${project.id}` : "";

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoad({ status: "loading" });
    try {
      const data = await loadData();
      if (requestId === requestIdRef.current) setLoad({ status: "ready", data });
    } catch {
      if (requestId === requestIdRef.current) setLoad({ status: "error" });
    }
  }, [loadData]);

  useEffect(() => {
    if (!open) {
      requestIdRef.current++;
      setLoad({ status: "loading" });
      return;
    }
    void fetchData();
    // Re-run only when a different project opens, not when loadData identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const buildReceipt = useMemo<ReceiptBuilder | null>(() => {
    if (load.status !== "ready") return null;
    return ({ printedAt, copy, style }) =>
      buildProjectReceipt(load.data, { printedBy, projectUrl, printedAt, copy, style });
  }, [load, printedBy, projectUrl]);

  return (
    <ThermalPrintDialog
      open={open}
      onClose={onClose}
      title="Print project briefing"
      subtitle={project?.name}
      status={load.status}
      errorMessage="Could not load the project briefing."
      onRetry={() => void fetchData()}
      buildReceipt={buildReceipt}
      size="lg"
      successDescription={(printer) =>
        `${load.status === "ready" ? load.data.projectName : "Project"} briefing sent to ${printer}.`
      }
    />
  );
}
