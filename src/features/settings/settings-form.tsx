"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { PhoneInput } from "@/components/ui/masked-input";
import { Save, Store, Clock, Globe, ImageIcon, CalendarClock } from "lucide-react";

interface Props {
  restaurantId: string;
}

interface OperatingHourRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logo: string | null;
  banner: string | null;
  isOpen: boolean;
  settings: Record<string, unknown>;
  operatingHours: OperatingHourRow[];
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function defaultHours(): OperatingHourRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "18:00",
    closeTime: "23:00",
    isClosed: true,
  }));
}

export function SettingsForm({ restaurantId }: Props) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    logo: null as string | null,
    banner: null as string | null,
    isOpen: false,
    isDeliveryOnly: false,
    autoHours: false,
  });
  const [hours, setHours] = useState<OperatingHourRow[]>(defaultHours());
  const [bulkDays, setBulkDays] = useState<number[]>([]);
  const [bulkOpenTime, setBulkOpenTime] = useState("19:00");
  const [bulkCloseTime, setBulkCloseTime] = useState("23:00");

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["restaurant-settings", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/settings`);
      return (await res.json()).data;
    },
  });

  useEffect(() => {
    if (restaurant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: restaurant.name,
        phone: restaurant.phone ?? "",
        address: restaurant.address ?? "",
        city: restaurant.city ?? "",
        state: restaurant.state ?? "",
        logo: restaurant.logo,
        banner: restaurant.banner,
        isOpen: restaurant.isOpen,
        isDeliveryOnly: (restaurant.settings?.isDeliveryOnly as boolean) ?? false,
        autoHours: (restaurant.settings?.autoHours as boolean) ?? false,
      });
      setHours((prev) =>
        prev.map((row) => {
          const saved = restaurant.operatingHours?.find((h) => h.dayOfWeek === row.dayOfWeek);
          return saved ? { ...saved } : row;
        })
      );
    }
  }, [restaurant]);

  function toggleBulkDay(day: number) {
    setBulkDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function applyBulkHours() {
    if (bulkDays.length === 0) return;
    setHours((prev) =>
      prev.map((row) =>
        bulkDays.includes(row.dayOfWeek)
          ? { ...row, openTime: bulkOpenTime, closeTime: bulkCloseTime, isClosed: false }
          : row
      )
    );
    setBulkDays([]);
  }

  const update = useMutation({
    mutationFn: async (data: typeof form) => {
      const { isDeliveryOnly, autoHours, ...rest } = data;
      const res = await fetch(`/api/restaurants/${restaurantId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          settings: { ...(restaurant?.settings ?? {}), isDeliveryOnly, autoHours },
          operatingHours: hours,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-settings", restaurantId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Salvo com sucesso</span>}
      </div>

      {/* Informações gerais */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-2">
          <Store className="text-primary-500 h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold text-neutral-900">Informações do restaurante</h2>
        </div>

        <Input
          label="Nome"
          id="name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <PhoneInput
          label="Telefone / WhatsApp"
          id="phone"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        />
        <Input
          label="Endereço"
          id="address"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cidade"
            id="city"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
          <Input
            label="Estado"
            id="state"
            value={form.state}
            onChange={(e) =>
              setForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))
            }
            maxLength={2}
          />
        </div>
      </div>

      {/* Identidade visual */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-2">
          <ImageIcon className="text-primary-500 h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold text-neutral-900">Identidade visual</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Logo do restaurante</p>
            <ImageUpload
              value={form.logo}
              onChange={(url) => setForm((p) => ({ ...p, logo: url }))}
              folder="logos"
              label="Adicionar logo"
              aspectRatio="square"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Banner do cardápio</p>
            <ImageUpload
              value={form.banner}
              onChange={(url) => setForm((p) => ({ ...p, banner: url }))}
              folder="banners"
              label="Adicionar banner"
              aspectRatio="banner"
            />
          </div>
        </div>
      </div>

      {/* Cardápio digital */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-2">
          <Globe className="text-primary-500 h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold text-neutral-900">Cardápio digital</h2>
        </div>
        <div>
          <p className="mb-1 text-sm text-neutral-500">URL do seu cardápio</p>
          <code className="block rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {typeof window !== "undefined" ? window.location.origin : ""}/menu/{restaurant?.slug}
          </code>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isDeliveryOnly}
              onChange={(e) => setForm((p) => ({ ...p, isDeliveryOnly: e.target.checked }))}
              className="sr-only"
            />
            <div
              className={`h-6 w-11 rounded-full transition-colors ${form.isDeliveryOnly ? "bg-primary-500" : "bg-neutral-300"}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isDeliveryOnly ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </div>
          <div>
            <p className="font-medium text-neutral-900">Somente delivery</p>
            <p className="text-sm text-neutral-400">
              Remove a opção &quot;Comer aqui&quot; do cardápio digital
            </p>
          </div>
        </label>
      </div>

      {/* Horário de funcionamento */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-2">
          <CalendarClock className="text-primary-500 h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold text-neutral-900">Horário de funcionamento</h2>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.autoHours}
              onChange={(e) => setForm((p) => ({ ...p, autoHours: e.target.checked }))}
              className="sr-only"
            />
            <div
              className={`h-6 w-11 rounded-full transition-colors ${form.autoHours ? "bg-primary-500" : "bg-neutral-300"}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.autoHours ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </div>
          <div>
            <p className="font-medium text-neutral-900">Abrir e fechar automaticamente</p>
            <p className="text-sm text-neutral-400">
              O cardápio digital abre e fecha sozinho conforme os horários abaixo
            </p>
          </div>
        </label>

        {form.autoHours && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            {/* Bulk apply */}
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-700">
                Selecione os dias e o horário, depois aplique
              </p>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleBulkDay(day)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      bulkDays.includes(day)
                        ? "bg-primary-500 text-white"
                        : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Abre</label>
                  <input
                    type="time"
                    value={bulkOpenTime}
                    onChange={(e) => setBulkOpenTime(e.target.value)}
                    className="mt-1 block rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Fecha</label>
                  <input
                    type="time"
                    value={bulkCloseTime}
                    onChange={(e) => setBulkCloseTime(e.target.value)}
                    className="mt-1 block rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyBulkHours}
                  disabled={bulkDays.length === 0}
                >
                  Aplicar aos dias selecionados
                </Button>
              </div>
            </div>

            {/* Per-day grid */}
            <div className="space-y-1.5">
              {hours.map((row, idx) => (
                <div
                  key={row.dayOfWeek}
                  className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-neutral-50"
                >
                  <span className="w-10 text-sm font-semibold text-neutral-700">
                    {DAY_LABELS[row.dayOfWeek]}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={!row.isClosed}
                      onChange={(e) =>
                        setHours((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, isClosed: !e.target.checked } : r
                          )
                        )
                      }
                    />
                    Aberto
                  </label>
                  {!row.isClosed && (
                    <>
                      <input
                        type="time"
                        value={row.openTime}
                        onChange={(e) =>
                          setHours((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, openTime: e.target.value } : r))
                          )
                        }
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                      />
                      <span className="text-neutral-400">até</span>
                      <input
                        type="time"
                        value={row.closeTime}
                        onChange={(e) =>
                          setHours((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, closeTime: e.target.value } : r
                            )
                          )
                        }
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                      />
                    </>
                  )}
                  {row.isClosed && <span className="text-xs text-neutral-400">Fechado</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3 border-b border-neutral-100 pb-3">
          <Clock className="text-primary-500 h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold text-neutral-900">Status do restaurante</h2>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm((p) => ({ ...p, isOpen: e.target.checked }))}
              className="sr-only"
            />
            <div
              className={`h-6 w-11 rounded-full transition-colors ${form.isOpen ? "bg-emerald-500" : "bg-neutral-300"}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isOpen ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </div>
          </div>
          <div>
            <p className="font-medium text-neutral-900">
              {form.autoHours
                ? form.isOpen
                  ? "Seguindo horário automático"
                  : "Pausado manualmente"
                : form.isOpen
                  ? "Aberto agora"
                  : "Fechado"}
            </p>
            <p className="text-sm text-neutral-400">
              {form.autoHours
                ? "Desligue para pausar o cardápio mesmo dentro do horário programado"
                : "Controla a disponibilidade do cardápio digital"}
            </p>
          </div>
        </label>
      </div>

      <Button
        className="w-full sm:w-auto"
        onClick={() => update.mutate(form)}
        loading={update.isPending}
      >
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        Salvar configurações
      </Button>
    </div>
  );
}
