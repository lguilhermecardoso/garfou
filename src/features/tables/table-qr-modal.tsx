"use client";

/**
 * TableQrModal
 *
 * Displays a QR code for a specific restaurant table. When scanned,
 * the customer is taken directly to the digital menu with the table
 * number pre-filled (/menu/{slug}?table={identifier}).
 *
 * Props:
 * - tableIdentifier: The human-readable table ID (e.g. "05", "VIP")
 * - menuSlug: Restaurant slug used to build the menu URL
 * - onClose: Callback to close the modal
 *
 * Behaviour:
 * - Renders a 256×256 SVG QR code using qrcode.react
 * - Provides a "Imprimir" button that prints just the QR code
 * - Provides a "Baixar PNG" button that downloads the QR as a PNG file
 * - Responsive: centered overlay dialog with backdrop
 */

import { useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  tableIdentifier: string;
  menuSlug: string;
  onClose: () => void;
}

export function TableQrModal({ tableIdentifier, menuSlug, onClose }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const menuUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/menu/${menuSlug}?table=${encodeURIComponent(tableIdentifier)}`
      : `/menu/${menuSlug}?table=${encodeURIComponent(tableIdentifier)}`;

  function handlePrint() {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — Mesa ${tableIdentifier}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { display:flex; flex-direction:column; align-items:center; font-family:sans-serif; }
            svg { width: 200px; height: 200px; }
            p { margin: 8px 0 0; font-size: 14px; color: #333; }
            small { font-size: 10px; color: #666; word-break: break-all; text-align: center; max-width: 220px; }
          </style>
        </head>
        <body>
          ${svgData}
          <p><strong>Mesa ${tableIdentifier}</strong></p>
          <small>${menuUrl}</small>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function handleDownload() {
    // Use a hidden canvas element for PNG download
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "fixed";
    hiddenContainer.style.left = "-9999px";
    document.body.appendChild(hiddenContainer);

    // Render QRCodeCanvas temporarily
    const canvas = document.createElement("canvas");
    hiddenContainer.appendChild(canvas);

    // Use the canvas already in DOM via QRCodeCanvas ref trick
    const existing = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (existing) {
      const link = document.createElement("a");
      link.download = `qr-mesa-${tableIdentifier}.png`;
      link.href = existing.toDataURL("image/png");
      link.click();
    }
    document.body.removeChild(hiddenContainer);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h2 id="qr-modal-title" className="mb-1 text-lg font-bold text-neutral-900">
          QR Code — Mesa {tableIdentifier}
        </h2>
        <p className="mb-5 text-sm text-neutral-500">
          O cliente escaneia para abrir o cardápio digital já na mesa correta.
        </p>

        {/* QR Code SVG (visible) + hidden Canvas for download */}
        <div ref={canvasRef} className="flex flex-col items-center gap-2">
          <div className="rounded-xl border border-neutral-200 p-4">
            <QRCodeSVG value={menuUrl} size={200} includeMargin={false} />
          </div>
          {/* Hidden canvas used for PNG download */}
          <div className="hidden">
            <QRCodeCanvas value={menuUrl} size={400} />
          </div>
          <p className="max-w-[240px] text-center text-[11px] break-all text-neutral-400">
            {menuUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Baixar PNG
          </Button>
        </div>
      </div>
    </div>
  );
}
