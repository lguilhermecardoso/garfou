"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { PhoneInput } from "@/components/ui/masked-input";
import { Save, Store, Clock, Globe, ImageIcon } from "lucide-react";

interface Props {
  restaurantId: string;
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
  });

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
      });
    }
  }, [restaurant]);

  const update = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
              {form.isOpen ? "Aberto agora" : "Fechado"}
            </p>
            <p className="text-sm text-neutral-400">
              Controla a disponibilidade do cardápio digital
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
