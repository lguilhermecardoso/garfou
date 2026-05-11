"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  PackageX,
  Star,
  EyeOff,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  _count: { products: number };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  isHighlight: boolean;
  isInternalOnly: boolean;
  categoryId: string;
  category: { id: string; name: string };
}

interface Props {
  restaurantId: string;
}

// ─── Category Modal ─────────────────────────────────────────────────────────

function CategoryModal({
  restaurantId,
  initial,
  onClose,
}: {
  restaurantId: string;
  initial?: Category;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      if (initial) {
        await fetch(`/api/restaurants/${restaurantId}/categories/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      } else {
        await fetch(`/api/restaurants/${restaurantId}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      }
      await qc.invalidateQueries({ queryKey: ["categories", restaurantId] });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {initial ? "Editar categoria" : "Nova categoria"}
        </h2>
        <Input
          label="Nome"
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} loading={loading} disabled={!name.trim()}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Modal ───────────────────────────────────────────────────────────

function ProductModal({
  restaurantId,
  categories,
  initial,
  defaultCategoryId,
  onClose,
}: {
  restaurantId: string;
  categories: Category[];
  initial?: Product;
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial ? String(initial.price / 100) : "",
    categoryId: initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
    isHighlight: initial?.isHighlight ?? false,
    isInternalOnly: initial?.isInternalOnly ?? false,
  });
  const [loading, setLoading] = useState(false);

  function update(k: keyof typeof form, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
      };
      if (initial) {
        await fetch(`/api/restaurants/${restaurantId}/products/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/restaurants/${restaurantId}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await qc.invalidateQueries({ queryKey: ["products", restaurantId] });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {initial ? "Editar produto" : "Novo produto"}
        </h2>
        <div className="space-y-3">
          <Input label="Nome" id="prod-name" value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus required />
          <div>
            <label htmlFor="prod-description" className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
            <textarea
              id="prod-description"
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Opcional"
            />
          </div>
          <Input label="Preço (R$)" id="prod-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} required />
          <div>
            <label htmlFor="prod-category" className="block text-sm font-medium text-neutral-700 mb-1">Categoria</label>
            <select
              id="prod-category"
              value={form.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.isHighlight}
                onChange={(e) => update("isHighlight", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Destaque
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.isInternalOnly}
                onChange={(e) => update("isInternalOnly", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Apenas interno
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} loading={loading} disabled={!form.name.trim() || !form.price}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MenuManagement({ restaurantId }: Props) {
  const qc = useQueryClient();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [catModal, setCatModal] = useState<{ open: boolean; editing?: Category }>({ open: false });
  const [prodModal, setProdModal] = useState<{ open: boolean; editing?: Product; catId?: string }>({ open: false });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/categories`);
      return (await res.json()).data;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/products`);
      return (await res.json()).data;
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/restaurants/${restaurantId}/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", restaurantId] }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/restaurants/${restaurantId}/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", restaurantId] }),
  });

  const toggleProduct = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/restaurants/${restaurantId}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", restaurantId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cardápio</h1>
          <p className="text-sm text-neutral-500">{categories.length} categorias · {products.length} produtos</p>
        </div>
        <Button onClick={() => setCatModal({ open: true })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm">
          <PackageX className="h-12 w-12 text-neutral-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-700">Nenhuma categoria ainda</h2>
          <p className="mt-1 text-sm text-neutral-400">Crie uma categoria para começar a adicionar produtos</p>
          <Button className="mt-6" onClick={() => setCatModal({ open: true })}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const catProducts = products.filter((p) => p.categoryId === cat.id);
            const isExpanded = expandedCat === cat.id;

            return (
              <div key={cat.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />
                    : <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />
                  }
                  <div className="flex-1">
                    <span className="font-semibold text-neutral-900">{cat.name}</span>
                    <span className="ml-2 text-xs text-neutral-400">{catProducts.length} produto{catProducts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setProdModal({ open: true, catId: cat.id })}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-primary-500"
                      aria-label={`Adicionar produto em ${cat.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setCatModal({ open: true, editing: cat })}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={`Editar ${cat.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => {
                        if (catProducts.length > 0) return alert("Remova os produtos antes de excluir a categoria.");
                        if (confirm(`Excluir "${cat.name}"?`)) deleteCategory.mutate(cat.id);
                      }}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Excluir ${cat.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Products list */}
                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    {catProducts.length === 0 ? (
                      <div className="py-6 text-center text-sm text-neutral-400">
                        Nenhum produto nesta categoria.{" "}
                        <button
                          onClick={() => setProdModal({ open: true, catId: cat.id })}
                          className="text-primary-500 hover:underline"
                        >
                          Adicionar
                        </button>
                      </div>
                    ) : (
                      catProducts.map((product, idx) => (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 px-4 py-3 ${idx < catProducts.length - 1 ? "border-b border-neutral-50" : ""} ${!product.isActive ? "opacity-50" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-900 truncate">{product.name}</p>
                              {product.isHighlight && (
                                <Star className="h-3.5 w-3.5 text-accent-500 shrink-0" aria-label="Destaque" />
                              )}
                              {product.isInternalOnly && (
                                <EyeOff className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-label="Apenas interno" />
                              )}
                              {!product.isActive && (
                                <Badge variant="secondary" className="text-xs">Inativo</Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-xs text-neutral-400 truncate">{product.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-neutral-900 shrink-0">
                            {formatCurrency(product.price)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleProduct.mutate({ id: product.id, isActive: !product.isActive })}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
                              aria-label={product.isActive ? "Desativar" : "Ativar"}
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </button>
                            <button
                              onClick={() => setProdModal({ open: true, editing: product })}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
                              aria-label={`Editar ${product.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Excluir "${product.name}"?`)) deleteProduct.mutate(product.id); }}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                              aria-label={`Excluir ${product.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {catModal.open && (
        <CategoryModal
          restaurantId={restaurantId}
          initial={catModal.editing}
          onClose={() => setCatModal({ open: false })}
        />
      )}
      {prodModal.open && (
        <ProductModal
          restaurantId={restaurantId}
          categories={categories}
          initial={prodModal.editing}
          defaultCategoryId={prodModal.catId}
          onClose={() => setProdModal({ open: false })}
        />
      )}
    </div>
  );
}
