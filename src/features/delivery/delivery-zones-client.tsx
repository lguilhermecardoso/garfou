"use client";

import { useState } from "react";
import { Truck, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DeliveryZone {
  id: string;
  name: string;
  fee: number | string;
  estimatedMinutes: number;
  isActive: boolean;
}

interface Props {
  restaurantId: string;
  initialZones: DeliveryZone[];
  initialFlatFee?: number;
  initialFlatMinutes?: number;
}

interface ZoneForm {
  name: string;
  fee: string;
  estimatedMinutes: string;
  isActive: boolean;
}

const emptyForm: ZoneForm = { name: "", fee: "0", estimatedMinutes: "30", isActive: true };

export function DeliveryZonesClient({
  restaurantId,
  initialZones,
  initialFlatFee,
  initialFlatMinutes,
}: Props) {
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ZoneForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flat-fee mode
  const [deliveryMode, setDeliveryMode] = useState<"flat" | "zones">(
    initialFlatFee !== undefined ? "flat" : "zones"
  );
  const [flatFee, setFlatFee] = useState(String(initialFlatFee ?? "0"));
  const [flatMinutes, setFlatMinutes] = useState(String(initialFlatMinutes ?? "30"));
  const [flatSaving, setFlatSaving] = useState(false);
  const [flatSuccess, setFlatSuccess] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/restaurants/${restaurantId}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        fee: parseFloat(form.fee),
        estimatedMinutes: parseInt(form.estimatedMinutes),
        isActive: form.isActive,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao criar zona");
      return;
    }

    setZones((prev) => [...prev, data.data]);
    setForm(emptyForm);
    setShowAdd(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/restaurants/${restaurantId}/delivery/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        fee: parseFloat(editForm.fee),
        estimatedMinutes: parseInt(editForm.estimatedMinutes),
        isActive: editForm.isActive,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao atualizar zona");
      return;
    }

    setZones((prev) => prev.map((z) => (z.id === editId ? data.data : z)));
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta zona de entrega?")) return;

    const res = await fetch(`/api/restaurants/${restaurantId}/delivery/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setZones((prev) => prev.filter((z) => z.id !== id));
    } else {
      setError("Erro ao excluir zona");
    }
  }

  async function handleSaveFlatFee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlatSaving(true);

    const res = await fetch(`/api/restaurants/${restaurantId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          defaultDeliveryFee: parseFloat(flatFee),
          defaultDeliveryMinutes: parseInt(flatMinutes),
        },
      }),
    });

    setFlatSaving(false);
    if (!res.ok) {
      setError("Erro ao salvar taxa de entrega");
      return;
    }
    setFlatSuccess(true);
    setTimeout(() => setFlatSuccess(false), 3000);
  }

  function startEdit(zone: DeliveryZone) {
    setEditId(zone.id);
    setEditForm({
      name: zone.name,
      fee: String(zone.fee),
      estimatedMinutes: String(zone.estimatedMinutes),
      isActive: zone.isActive,
    });
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex w-fit items-center gap-2 rounded-2xl bg-white p-1 shadow-sm">
        <button
          onClick={() => setDeliveryMode("flat")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            deliveryMode === "flat"
              ? "bg-primary-500 text-white"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Taxa única
        </button>
        <button
          onClick={() => setDeliveryMode("zones")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            deliveryMode === "zones"
              ? "bg-primary-500 text-white"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Por zonas / bairros
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Flat-fee mode */}
      {deliveryMode === "flat" && (
        <form
          onSubmit={handleSaveFlatFee}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
          aria-label="Taxa única de entrega"
        >
          <div>
            <h2 className="font-semibold text-neutral-900">Taxa única para toda a cidade</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Ideal para cidades pequenas. Uma taxa fixa para qualquer endereço de entrega.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Taxa de entrega (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={flatFee}
                onChange={(e) => setFlatFee(e.target.value)}
                required
                className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-400">Use 0 para entrega grátis</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Tempo estimado (min)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={flatMinutes}
                onChange={(e) => setFlatMinutes(e.target.value)}
                required
                className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={flatSaving}
              className="bg-primary-500 hover:bg-primary-600 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {flatSaving ? "Salvando..." : "Salvar taxa"}
            </button>
            {flatSuccess && (
              <span className="text-sm font-medium text-green-600">Taxa salva com sucesso!</span>
            )}
          </div>
        </form>
      )}

      {/* Zones mode */}
      {deliveryMode === "zones" && (
        <>
          {zones.length === 0 && !showAdd ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 shadow-sm">
              <Truck className="h-12 w-12 text-neutral-200" aria-hidden="true" />
              <p className="mt-4 text-neutral-400">Nenhuma zona de entrega cadastrada</p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-primary-500 mt-4 text-sm font-semibold hover:underline"
              >
                Adicionar primeira zona
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm" aria-label="Zonas de entrega">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                      Nome / Bairro
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600">Taxa</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-600">
                      Tempo est.
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-600">Ativo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) =>
                    editId === z.id ? (
                      <tr key={z.id} className="bg-primary-50 border-b border-neutral-100">
                        <td className="px-4 py-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="focus:ring-primary-400 w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm focus:ring-2 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editForm.fee}
                            onChange={(e) => setEditForm((f) => ({ ...f, fee: e.target.value }))}
                            className="focus:ring-primary-400 w-24 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm focus:ring-2 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={editForm.estimatedMinutes}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, estimatedMinutes: e.target.value }))
                            }
                            className="focus:ring-primary-400 w-20 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm focus:ring-2 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                            }
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <form onSubmit={handleUpdate} className="flex justify-end gap-1">
                            <button
                              type="submit"
                              disabled={saving}
                              className="bg-primary-500 hover:bg-primary-600 rounded-lg p-1.5 text-white disabled:opacity-50"
                              aria-label="Salvar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50"
                              aria-label="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={z.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">{z.name}</td>
                        <td className="px-4 py-3 text-right text-neutral-700">
                          {Number(z.fee) === 0
                            ? "Grátis"
                            : formatCurrency(Math.round(Number(z.fee) * 100))}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-500">
                          {z.estimatedMinutes} min
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${z.isActive ? "bg-green-500" : "bg-neutral-300"}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEdit(z)}
                              className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50"
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(z.id)}
                              className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50"
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {showAdd ? (
            <form
              onSubmit={handleCreate}
              className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"
              aria-label="Formulário nova zona"
            >
              <h2 className="font-semibold text-neutral-900">Nova zona de entrega</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Nome / Bairro *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Centro"
                    className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Taxa de entrega (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.fee}
                    onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                    className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Tempo estimado (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
                    className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActiveNew"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <label htmlFor="isActiveNew" className="text-sm text-neutral-700">
                  Zona ativa
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-500 hover:bg-primary-600 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar zona"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setForm(emptyForm);
                  }}
                  className="rounded-xl border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="hover:border-primary-300 hover:text-primary-500 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar zona
            </button>
          )}
        </>
      )}
    </div>
  );
}
