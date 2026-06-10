"use client";

/**
 * ExportCsvButton
 *
 * Triggers a CSV file download for the reports export API.
 * Opens the download URL in a new window/tab to allow the
 * browser to handle the file download without navigating away.
 *
 * Props:
 * - restaurantId: UUID of the restaurant
 * - type: "orders" | "finance"
 * - period: "7d" | "30d" | "3m"
 * - label: button display text
 */

import { Download } from "lucide-react";

type Period = "7d" | "30d" | "3m";

interface Props {
  restaurantId: string;
  type: "orders" | "finance";
  period: Period;
  label?: string;
}

function buildDateRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  if (period === "7d") {
    from.setDate(from.getDate() - 6);
  } else if (period === "3m") {
    from.setMonth(from.getMonth() - 3);
    from.setDate(1);
  } else {
    from.setDate(from.getDate() - 29);
  }

  return {
    from: from.toISOString().substring(0, 10),
    to: to.toISOString().substring(0, 10),
  };
}

export function ExportCsvButton({ restaurantId, type, period, label }: Props) {
  function handleExport() {
    const { from, to } = buildDateRange(period);
    const url = `/api/restaurants/${restaurantId}/reports/export?type=${type}&from=${from}&to=${to}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
    >
      <Download className="h-4 w-4" />
      {label ?? "Exportar CSV"}
    </button>
  );
}
