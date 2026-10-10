/**
 * Direct USB printing to ESC/POS thermal printers via WebUSB (Chrome / Edge).
 * Why: The OS print path needs a vendor raster driver; with a generic driver the
 * printer receives PostScript and prints it as text. Sending ESC/POS bytes
 * straight over USB needs no driver at all.
 */

interface UsbEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
}
interface UsbAlternate {
  interfaceClass: number;
  endpoints: UsbEndpoint[];
}
interface UsbInterface {
  interfaceNumber: number;
  alternate: UsbAlternate;
  claimed: boolean;
}
interface UsbConfiguration {
  interfaces: UsbInterface[];
}
interface UsbDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  serialNumber?: string;
  opened: boolean;
  configuration: UsbConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: BufferSource
  ): Promise<{ status: "ok" | "stall" | "babble"; bytesWritten: number }>;
  clearHalt(direction: "in" | "out", endpointNumber: number): Promise<void>;
  forget?(): Promise<void>;
}

export type ThermalPrinterDevice = UsbDevice;

/** Stable per-printer key (vendor:product:serial) for printer-side state like a stored logo. */
export const printerKey = (device: UsbDevice) =>
  `${device.vendorId.toString(16)}:${device.productId.toString(16)}:${device.serialNumber || "default"}`;
interface UsbApi {
  getDevices(): Promise<UsbDevice[]>;
  requestDevice(options: {
    filters: { vendorId?: number; productId?: number; classCode?: number }[];
  }): Promise<UsbDevice>;
}

const USB_PRINTER_CLASS = 0x07;
/** HOIN HOP-H58 and other generic "POS-58" printers enumerate as 0456:0808. */
const KNOWN_PRINTERS = [{ vendorId: 0x0456, productId: 0x0808 }];
/** Why: Cheap printers have small input buffers; small chunks avoid dropped bytes. */
const CHUNK_SIZE = 512;
/** Stall recoveries per chunk before giving up; backoff grows 250ms per attempt. */
const STALL_RETRIES = 4;

export class ThermalPrinterError extends Error {
  constructor(
    message: string,
    readonly code?: "stall"
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Why clearHalt: a printer that is busy (cutting, writing flash) or confused by
 * a command halts its OUT endpoint. A halted endpoint rejects every later
 * transfer — even in new sessions — until the host clears it explicitly.
 */
async function writeChunk(device: UsbDevice, endpoint: number, chunk: Uint8Array<ArrayBuffer>) {
  let pending = chunk;
  for (let attempt = 0; ; attempt++) {
    const result = await device.transferOut(endpoint, pending);
    if (result.status === "ok") return;
    if (result.status !== "stall" || attempt >= STALL_RETRIES) {
      throw new ThermalPrinterError(
        result.status === "stall"
          ? "The printer stopped accepting data. Turn it off and on, then print again."
          : `Printer rejected data (${result.status}).`,
        result.status === "stall" ? "stall" : undefined
      );
    }
    pending = pending.slice(Math.min(result.bytesWritten ?? 0, pending.length));
    await device.clearHalt("out", endpoint);
    await sleep(250 * (attempt + 1));
    if (!pending.length) return;
  }
}

function getUsb(): UsbApi | null {
  const usb = (navigator as Navigator & { usb?: UsbApi }).usb;
  return usb && window.isSecureContext ? usb : null;
}

export const isDirectPrintSupported = (): boolean => getUsb() !== null;

function findOutEndpoint(device: UsbDevice): { iface: number; endpoint: number } | null {
  const interfaces = device.configuration?.interfaces ?? [];
  const ordered = [
    ...interfaces.filter((i) => i.alternate.interfaceClass === USB_PRINTER_CLASS),
    ...interfaces.filter((i) => i.alternate.interfaceClass !== USB_PRINTER_CLASS),
  ];
  for (const iface of ordered) {
    const out = iface.alternate.endpoints.find(
      (e) => e.direction === "out" && e.type === "bulk"
    );
    if (out) return { iface: iface.interfaceNumber, endpoint: out.endpointNumber };
  }
  return null;
}

const isPrinterDevice = (d: UsbDevice) =>
  KNOWN_PRINTERS.some((p) => p.vendorId === d.vendorId && p.productId === d.productId) ||
  !!d.configuration?.interfaces.some((i) => i.alternate.interfaceClass === USB_PRINTER_CLASS);

/** Printer the user already granted access to in this browser; never prompts. */
export async function getPairedThermalPrinter(): Promise<UsbDevice | null> {
  const usb = getUsb();
  if (!usb) return null;
  const paired = await usb.getDevices();
  return paired.find(isPrinterDevice) ?? null;
}

/** Revokes access so the next print shows Chrome's picker again. */
export async function forgetThermalPrinter(): Promise<void> {
  const device = await getPairedThermalPrinter();
  if (device?.forget) await device.forget();
}

/**
 * Returns the previously paired printer, or opens Chrome's device picker.
 * Must be called at the start of a click handler: the picker needs a user gesture.
 */
export async function getThermalPrinter(): Promise<UsbDevice> {
  const usb = getUsb();
  if (!usb) {
    throw new ThermalPrinterError(
      "Direct printing needs Chrome or Edge on a secure (https or localhost) page."
    );
  }
  const known = await getPairedThermalPrinter();
  if (known) return known;
  try {
    return await usb.requestDevice({
      filters: [...KNOWN_PRINTERS, { classCode: USB_PRINTER_CLASS }],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      throw new ThermalPrinterError("No printer selected.");
    }
    throw error;
  }
}

/**
 * Sends each job (one per copy) over a single USB session so copies print
 * back-to-back; `onJobSent` reports progress after every completed copy.
 */
export async function sendToThermalPrinter(
  device: UsbDevice,
  jobs: Uint8Array[],
  onJobSent?: (sent: number, total: number) => void
): Promise<void> {
  let claimed: number | null = null;
  try {
    if (!device.opened) await device.open();
    if (!device.configuration) await device.selectConfiguration(1);
    const target = findOutEndpoint(device);
    if (!target) throw new ThermalPrinterError("This USB device has no printer output.");

    await device.claimInterface(target.iface);
    claimed = target.iface;
    // Recover from a halt left by an earlier session (e.g. a failed print).
    await device.clearHalt("out", target.endpoint).catch(() => undefined);

    for (let job = 0; job < jobs.length; job++) {
      const data = jobs[job];
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        await writeChunk(device, target.endpoint, data.slice(offset, offset + CHUNK_SIZE));
      }
      onJobSent?.(job + 1, jobs.length);
    }
  } catch (error) {
    if (error instanceof ThermalPrinterError) throw error;
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NetworkError" || name === "InvalidStateError") {
      throw new ThermalPrinterError(
        "Printer is busy or disconnected. Check the USB cable and power, and remove the printer from macOS System Settings → Printers so the system does not hold it."
      );
    }
    if (name === "SecurityError") {
      throw new ThermalPrinterError("Chrome blocked access to this USB printer.");
    }
    throw error;
  } finally {
    if (claimed !== null) await device.releaseInterface(claimed).catch(() => undefined);
    if (device.opened) await device.close().catch(() => undefined);
  }
}
