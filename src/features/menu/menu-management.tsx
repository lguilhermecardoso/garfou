/**
 * MenuManagement
 *
 * Manager-side cardápio control panel with category CRUD, product CRUD, and
 * product customization configuration for modifiers and split flavors.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  PackageX,
  Pause,
  Pencil,
  Play,
  Plus,
  Split,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  ProductCustomizationPanel,
  type ProductCustomizationFormState,
} from "@/features/menu/product-customization-panel";
import type { MenuProductData } from "@/features/menu/menu-customization-types";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  _count: { products: number };
}

type Product = MenuProductData;

interface Props {
  restaurantId: string;
}

/** The reserved name for the auto-managed adicionais ADDON group */
const ADICIONAIS_GROUP_NAME = "Adicionais";

function getInitialCustomization(initial?: Product): ProductCustomizationFormState {
  return {
    allowCustomization: initial?.allowCustomization ?? false,
    allowSplit: initial?.allowSplit ?? false,
    maxSplits: initial?.maxSplits ?? 2,
    splitPriceRule: initial?.splitPriceRule ?? "HIGHEST",
    // Exclude the auto-managed "Adicionais" ADDON group — it lives in the simple adicionais UI
    modifierGroups:
      initial?.modifierGroups?.filter(
        (g) => !(g.type === "ADDON" && g.name === ADICIONAIS_GROUP_NAME)
      ) ?? [],
    splitFlavors: initial?.splitFlavors ?? [],
  };
}

function getInitialAdicionais(
  initial?: Product
): Array<{ id: string; name: string; price: string }> {
  const group = initial?.modifierGroups?.find(
    (g) => g.type === "ADDON" && g.name === ADICIONAIS_GROUP_NAME
  );
  return (
    group?.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      price: opt.price > 0 ? String(opt.price) : "",
    })) ?? []
  );
}

function CategoryModal({
  restaurantId,
  initial,
  onClose,
}: {
  restaurantId: string;
  initial?: Category;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
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
      await queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          {initial ? "Editar categoria" : "Nova categoria"}
        </h2>
        <Input
          label="Nome"
          id="cat-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
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

function ProductModal({
  restaurantId,
  categories,
  products,
  initial,
  defaultCategoryId,
  onClose,
}: {
  restaurantId: string;
  categories: Category[];
  products: Product[];
  initial?: Product;
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial ? String(initial.price) : "",
    categoryId: initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
    isFeatured: initial?.isFeatured ?? false,
    isInternalOnly: initial?.isInternalOnly ?? false,
    image: (initial?.image ?? null) as string | null,
  });
  const [customization, setCustomization] = useState<ProductCustomizationFormState>(
    getInitialCustomization(initial)
  );
  /** Simple adicionais rows — managed as a dedicated ADDON group on save */
  const [adicionais, setAdicionais] = useState<Array<{ id: string; name: string; price: string }>>(
    getInitialAdicionais(initial)
  );
  const [loading, setLoading] = useState(false);
  const splitPricingActive = customization.allowSplit;

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Build the final modifier groups: advanced groups + auto-managed adicionais group
      const validAdicionais = adicionais.filter((a) => a.name.trim());
      const adicionaisGroup =
        validAdicionais.length > 0
          ? [
              {
                // No id — let the DB generate one
                name: ADICIONAIS_GROUP_NAME,
                type: "ADDON" as const,
                minSelections: 0,
                maxSelections: 99,
                sortOrder: 0,
                options: validAdicionais.map((a, idx) => ({
                  // No id — let the DB generate one
                  name: a.name.trim(),
                  price: Number(a.price) || 0,
                  isDefault: false,
                  isAvailable: true,
                  sortOrder: idx,
                })),
              },
            ]
          : [];

      // Strip temp IDs from advanced modifier groups/options before sending
      const cleanGroups = customization.modifierGroups.map((g) => ({
        ...g,
        id: g.id?.startsWith("temp-") ? undefined : g.id,
        options: g.options.map((o) => ({
          ...o,
          id: o.id?.startsWith("temp-") ? undefined : o.id,
        })),
      }));

      const mergedGroups = [...adicionaisGroup, ...cleanGroups];
      const hasCustomization = mergedGroups.length > 0 || customization.allowCustomization;

      const payload = {
        ...form,
        price: splitPricingActive ? 0 : Number(form.price || 0),
        ...customization,
        allowCustomization: hasCustomization,
        modifierGroups: mergedGroups,
      };

      const endpoint = initial
        ? `/api/restaurants/${restaurantId}/products/${initial.id}`
        : `/api/restaurants/${restaurantId}/products`;

      await fetch(endpoint, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products", restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ["public-menu", restaurantId] }),
      ]);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          {initial ? "Editar produto" : "Novo produto"}
        </h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome"
              id="prod-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              autoFocus
              required
            />
            <div className="space-y-1.5">
              <Input
                label="Preço base (R$)"
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                value={splitPricingActive ? "0" : form.price}
                onChange={(event) => updateField("price", event.target.value)}
                required={!splitPricingActive}
                disabled={splitPricingActive}
              />
              <p className="text-xs text-neutral-500">
                {splitPricingActive
                  ? "Produtos com divisão usam somente a regra de sabores. O preço fixo fica desativado e é salvo como R$ 0,00."
                  : "Usado para produtos sem divisão em sabores."}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="prod-description"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Descrição
            </label>
            <textarea
              id="prod-description"
              rows={2}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="focus:ring-primary-400 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              placeholder="Opcional"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Foto do produto</p>
            <ImageUpload
              value={form.image}
              onChange={(url) => setForm((c) => ({ ...c, image: url }))}
              folder="products"
              label="Adicionar foto"
              aspectRatio="video"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-neutral-700">
              <span className="block text-sm font-medium">Categoria</span>
              <select
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
                className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => updateField("isFeatured", event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Destaque
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.isInternalOnly}
                  onChange={(event) => updateField("isInternalOnly", event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Apenas interno
              </label>
            </div>
          </div>

          <ProductCustomizationPanel
            form={customization}
            products={products}
            currentProductId={initial?.id}
            onChange={setCustomization}
          />

          {/* ── Adicionais simples ──────────────────────────────────────── */}
          <div className="space-y-3 rounded-2xl border border-neutral-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Adicionais extras</h3>
              <p className="text-xs text-neutral-500">
                Ingredientes ou itens que o cliente pode adicionar ao pedido. Cada adicional soma no
                preço final.
              </p>
            </div>

            {adicionais.length > 0 && (
              <div className="space-y-2">
                {adicionais.map((addon, idx) => (
                  <div
                    key={addon.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
                  >
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => {
                        const next = adicionais.slice();
                        next[idx] = { ...next[idx], name: e.target.value };
                        setAdicionais(next);
                      }}
                      placeholder="Ex: Salsicha extra, Catupiry..."
                      className="focus:ring-primary-400 min-w-0 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-neutral-400">
                        +R$
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={addon.price}
                        onChange={(e) => {
                          const next = adicionais.slice();
                          next[idx] = { ...next[idx], price: e.target.value };
                          setAdicionais(next);
                        }}
                        placeholder="0,00"
                        className="focus:ring-primary-400 w-24 rounded-lg border border-neutral-200 bg-white py-1.5 pr-2 pl-7 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdicionais(adicionais.filter((_, i) => i !== idx))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remover adicional"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adicionais.length === 0 && (
              <p className="text-xs text-neutral-400">
                Nenhum adicional configurado. Clique em &quot;Adicionar&quot; para começar.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAdicionais([
                  ...adicionais,
                  { id: `new-${crypto.randomUUID()}`, name: "", price: "" },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            loading={loading}
            disabled={!form.name.trim() || (!splitPricingActive && !form.price)}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MenuManagement({ restaurantId }: Props) {
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing?: Category }>({
    open: false,
  });
  const [productModal, setProductModal] = useState<{
    open: boolean;
    editing?: Product;
    categoryId?: string;
  }>({ open: false });

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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir categoria");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      toast.success("Categoria excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir categoria.");
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir produto");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      toast.success("Produto excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir produto.");
    },
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar produto");
      return res;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      toast.success(isActive ? "Produto ativado!" : "Produto desativado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar produto.");
    },
  });

  const pauseProduct = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaused }),
      });
      if (!res.ok) throw new Error("Erro ao pausar produto");
      return res;
    },
    onSuccess: (_, { isPaused }) => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      toast.success(
        isPaused
          ? "Produto pausado — aparece como esgotado no menu."
          : "Produto disponível novamente!"
      );
    },
    onError: () => {
      toast.error("Erro ao atualizar produto.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cardápio</h1>
          <p className="text-sm text-neutral-500">
            {categories.length} categorias · {products.length} produtos
          </p>
        </div>
        <Button onClick={() => setCategoryModal({ open: true })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm">
          <PackageX className="h-12 w-12 text-neutral-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-700">Nenhuma categoria ainda</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Crie uma categoria para começar a adicionar produtos
          </p>
          <Button className="mt-6" onClick={() => setCategoryModal({ open: true })}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const categoryProducts = products.filter(
              (product) => product.categoryId === category.id
            );
            const isExpanded = expandedCategory === category.id;

            return (
              <div key={category.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-neutral-400"
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold text-neutral-900">{category.name}</span>
                    <span className="ml-2 text-xs text-neutral-400">
                      {categoryProducts.length} produto{categoryProducts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      onClick={() => setProductModal({ open: true, categoryId: category.id })}
                      className="hover:text-primary-500 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
                      aria-label={`Adicionar produto em ${category.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setCategoryModal({ open: true, editing: category })}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => {
                        if (categoryProducts.length > 0) {
                          toast.warning("Remova os produtos antes de excluir a categoria.");
                          return;
                        }
                        if (confirm(`Excluir \"${category.name}\"?`))
                          deleteCategory.mutate(category.id);
                      }}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Excluir ${category.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    {categoryProducts.length === 0 ? (
                      <div className="py-6 text-center text-sm text-neutral-400">
                        Nenhum produto nesta categoria.{" "}
                        <button
                          onClick={() => setProductModal({ open: true, categoryId: category.id })}
                          className="text-primary-500 hover:underline"
                        >
                          Adicionar
                        </button>
                      </div>
                    ) : (
                      categoryProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 px-4 py-3 ${index < categoryProducts.length - 1 ? "border-b border-neutral-50" : ""} ${!product.isActive ? "opacity-50" : product.isPaused ? "opacity-70" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-neutral-900">
                                {product.name}
                              </p>
                              {product.isFeatured && (
                                <Star
                                  className="text-accent-500 h-3.5 w-3.5 shrink-0"
                                  aria-label="Destaque"
                                />
                              )}
                              {product.allowSplit && (
                                <Split
                                  className="h-3.5 w-3.5 shrink-0 text-sky-500"
                                  aria-label="Divisível"
                                />
                              )}
                              {product.isInternalOnly && (
                                <EyeOff
                                  className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                                  aria-label="Apenas interno"
                                />
                              )}
                              {product.allowCustomization && (
                                <Badge variant="secondary" className="text-xs">
                                  Modificadores
                                </Badge>
                              )}
                              {!product.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                              {product.isPaused && (
                                <Badge className="bg-amber-100 text-xs text-amber-700 hover:bg-amber-100">
                                  Pausado
                                </Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="truncate text-xs text-neutral-400">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-bold text-neutral-900">
                            {formatCurrency(product.price)}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() =>
                                pauseProduct.mutate({
                                  id: product.id,
                                  isPaused: !(product.isPaused ?? false),
                                })
                              }
                              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${(product.isPaused ?? false) ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-neutral-100 text-neutral-500 hover:bg-amber-50 hover:text-amber-600"}`}
                              aria-label={
                                (product.isPaused ?? false)
                                  ? "Retomar produto"
                                  : "Pausar produto (esgotado por agora)"
                              }
                              title={
                                (product.isPaused ?? false)
                                  ? "Clique para retomar"
                                  : "Pausar — aparece como esgotado no menu"
                              }
                            >
                              {(product.isPaused ?? false) ? (
                                <span className="flex items-center gap-1">
                                  <Play className="h-3 w-3" aria-hidden="true" />
                                  Pausado
                                </span>
                              ) : (
                                <Pause className="h-3 w-3" aria-hidden="true" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                toggleProduct.mutate({
                                  id: product.id,
                                  isActive: !(product.isActive ?? true),
                                })
                              }
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${(product.isActive ?? true) ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
                              aria-label={(product.isActive ?? true) ? "Desativar" : "Ativar"}
                            >
                              {(product.isActive ?? true) ? "Ativo" : "Inativo"}
                            </button>
                            <button
                              onClick={() => setProductModal({ open: true, editing: product })}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
                              aria-label={`Editar ${product.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir \"${product.name}\"?`))
                                  deleteProduct.mutate(product.id);
                              }}
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

      {categoryModal.open && (
        <CategoryModal
          restaurantId={restaurantId}
          initial={categoryModal.editing}
          onClose={() => setCategoryModal({ open: false })}
        />
      )}

      {productModal.open && (
        <ProductModal
          restaurantId={restaurantId}
          categories={categories}
          products={products}
          initial={productModal.editing}
          defaultCategoryId={productModal.categoryId}
          onClose={() => setProductModal({ open: false })}
        />
      )}
    </div>
  );
}
