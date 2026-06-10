"use client";

/**
 * DateRangeFilter — Seletor de período para financeiro e relatórios.
 *
 * Presets rápidos (Hoje, Ontem, Esta semana, Este mês) e campos
 * de data personalizados. Atualiza a URL com ?from=YYYY-MM-DD&to=YYYY-MM-DD.
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

interface Props {
  /** Extra searchParams to preserve (e.g. period in reports page) */
  preserveParams?: string[];
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const PRESETS = [
  {
    label: "Hoje",
    getRange: () => {
      const d = today();
      return { from: toInputDate(d), to: toInputDate(d) };
    },
  },
  {
    label: "Ontem",
    getRange: () => {
      const d = today();
      d.setDate(d.getDate() - 1);
      return { from: toInputDate(d), to: toInputDate(d) };
    },
  },
  {
    label: "Esta semana",
    getRange: () => {
      const d = today();
      const day = d.getDay(); // 0 = Sunday
      const from = new Date(d);
      from.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
      return { from: toInputDate(from), to: toInputDate(today()) };
    },
  },
  {
    label: "Este mês",
    getRange: () => {
      const d = today();
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      return { from: toInputDate(from), to: toInputDate(today()) };
    },
  },
  {
    label: "Mês anterior",
    getRange: () => {
      const d = today();
      const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const to = new Date(d.getFullYear(), d.getMonth(), 0);
      return { from: toInputDate(from), to: toInputDate(to) };
    },
  },
];

export function DateRangeFilter({ preserveParams = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);

  function navigate(from: string, to: string) {
    const params = new URLSearchParams();
    // Preserve other params (e.g. period)
    preserveParams.forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handlePreset(preset: (typeof PRESETS)[0]) {
    const range = preset.getRange();
    setCustomFrom(range.from);
    setCustomTo(range.to);
    navigate(range.from, range.to);
  }

  function handleCustomFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    navigate(customFrom, customTo);
  }

  function handleClear() {
    setCustomFrom("");
    setCustomTo("");
    const params = new URLSearchParams();
    preserveParams.forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  const hasFilter = !!(currentFrom || currentTo);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
        <CalendarDays className="h-4 w-4 text-neutral-400" />
        <span>Período:</span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const range = preset.getRange();
          const isActive = currentFrom === range.from && currentTo === range.to;
          return (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              disabled={isPending}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-neutral-200" />

      {/* Custom range */}
      <form onSubmit={handleCustomFilter} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={customFrom}
          max={customTo || toInputDate(new Date())}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="focus:ring-primary-500 h-8 rounded-lg border border-neutral-300 px-2 text-xs focus:border-transparent focus:ring-2 focus:outline-none"
          aria-label="Data inicial"
        />
        <span className="text-xs text-neutral-400">até</span>
        <input
          type="date"
          value={customTo}
          min={customFrom}
          max={toInputDate(new Date())}
          onChange={(e) => setCustomTo(e.target.value)}
          className="focus:ring-primary-500 h-8 rounded-lg border border-neutral-300 px-2 text-xs focus:border-transparent focus:ring-2 focus:outline-none"
          aria-label="Data final"
        />
        <button
          type="submit"
          disabled={!customFrom || !customTo || isPending}
          className="bg-primary-500 hover:bg-primary-600 h-8 rounded-lg px-3 text-xs font-medium text-white transition-colors disabled:opacity-40"
        >
          Filtrar
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={handleClear}
            className="h-8 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            Limpar
          </button>
        )}
      </form>

      {isPending && <span className="text-xs text-neutral-400">Carregando...</span>}
    </div>
  );
}
