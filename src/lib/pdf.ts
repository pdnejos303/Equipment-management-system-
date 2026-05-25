// Path: src/lib/pdf.ts
// ============================================================
// Desc: HTML → PDF via headless Chromium (puppeteer).
//
//       Launches a browser per call (simple, OK for an internal
//       admin tool with low concurrency). Headless Chrome is ~170MB
//       on disk; on Vercel/Lambda swap to puppeteer-core +
//       @sparticuz/chromium.
// ============================================================

import type { PDFOptions } from "puppeteer";

export interface RenderOptions {
  /** PDF page format (A4 default). */
  format?: PDFOptions["format"];
  /** Landscape orientation. */
  landscape?: boolean;
  /** Margins (CSS strings). */
  margin?: PDFOptions["margin"];
  /** Print background colors/images. Defaults true. */
  printBackground?: boolean;
}

export async function htmlToPdf(html: string, opts: RenderOptions = {}): Promise<ArrayBuffer> {
  // Lazy-load so puppeteer (and chromium) isn't required at boot time.
  const puppeteer = (await import("puppeteer")).default;

  // In Docker we install /usr/bin/chromium-browser via apk and point puppeteer at it.
  // Outside Docker (dev), let puppeteer pick its bundled Chrome.
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    // --disable-dev-shm-usage avoids /dev/shm exhaustion in containers
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    // Make sure web fonts (Sarabun, Noto Sans JP) are ready before printing
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: opts.format || "A4",
      landscape: opts.landscape ?? false,
      margin: opts.margin || { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
      printBackground: opts.printBackground ?? true,
    });

    // Copy into a fresh ArrayBuffer so callers can use Blob/Response without
    // SharedArrayBuffer vs ArrayBuffer typing friction.
    const view = pdf as Uint8Array;
    const out = new ArrayBuffer(view.byteLength);
    new Uint8Array(out).set(view);
    return out;
  } finally {
    await browser.close();
  }
}
