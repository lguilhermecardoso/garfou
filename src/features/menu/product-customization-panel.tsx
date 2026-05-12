/**
 * ProductCustomizationPanel
 *
 * Provides manager-side controls to configure modifier groups, options, and
 * split-flavor behavior inside the product modal.
 */

"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type {
  MenuProductData,
  ModifierGroupData,
  ModifierOptionData,
  SplitFlavorData,
  SplitPriceRule,
} from "@/features/menu/menu-customization-types";

export interface ProductCustomizationFormState {
  allowCustomization: boolean;
  allowSplit: boolean;
  maxSplits: 2 | 3 | 4;
  splitPriceRule: SplitPriceRule;
  modifierGroups: ModifierGroupData[];
  splitFlavors: SplitFlavorData[];
}

interface Props {
  form: ProductCustomizationFormState;
  products: MenuProductData[];
  currentProductId?: string;
  onChange(next: ProductCustomizationFormState): void;
}

function makeGroup(): ModifierGroupData {
  return {
    id: `temp-group-${crypto.randomUUID()}`,
    name: "",
    type: "ADDON",
    minSelections: 0,
    maxSelections: 1,
    sortOrder: 0,
    options: [],
  };
}

function makeOption(): ModifierOptionData {
  return {
    id: `temp-option-${crypto.randomUUID()}`,
    name: "",
    price: 0,
    isDefault: false,
    isAvailable: true,
    sortOrder: 0,
  };
}

function makeSplitFlavor(): SplitFlavorData {
  return {
    id: `temp-split-${crypto.randomUUID()}`,
    flavorProductId: "",
    sortOrder: 0,
    isAvailable: true,
    flavorProduct: {
      id: "",
      name: "",
      price: 0,
      isActive: true,
    },
  };
}

export function ProductCustomizationPanel({ form, products, currentProductId, onChange }: Props) {
  const splitCandidates = products.filter((product) => product.id !== currentProductId);

  return (
    <div className="space-y-5 border-t border-neutral-100 pt-5">
      <section className="space-y-3 rounded-2xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Divisão em partes</h3>
            <p className="text-xs text-neutral-500">
              Habilite pizzas, calzones e outros itens divididos.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.allowSplit}
            onChange={(event) =>
              onChange({
                ...form,
                allowSplit: event.target.checked,
                splitFlavors: event.target.checked ? form.splitFlavors : [],
              })
            }
            className="h-4 w-4 rounded border-neutral-300"
          />
        </div>

        {form.allowSplit && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-neutral-700">
                <span className="block text-sm font-medium">Número de partes</span>
                <select
                  value={form.maxSplits}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      maxSplits: Number(event.target.value) as 2 | 3 | 4,
                    })
                  }
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2"
                >
                  <option value={2}>2 partes</option>
                  <option value={3}>3 partes</option>
                  <option value={4}>4 partes</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-neutral-700">
                <span className="block text-sm font-medium">Regra de preço</span>
                <select
                  value={form.splitPriceRule}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      splitPriceRule: event.target.value as SplitPriceRule,
                    })
                  }
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2"
                >
                  <option value="HIGHEST">Mais caro</option>
                  <option value="AVERAGE">Média</option>
                  <option value="SUM">Soma</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {form.splitFlavors.map((splitFlavor, splitIndex) => (
                <div
                  key={splitFlavor.id}
                  className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[1fr_auto_auto]"
                >
                  <select
                    value={splitFlavor.flavorProductId}
                    onChange={(event) => {
                      const nextFlavor = splitCandidates.find(
                        (product) => product.id === event.target.value
                      );
                      const splitFlavors = form.splitFlavors.slice();
                      splitFlavors[splitIndex] = {
                        ...splitFlavors[splitIndex],
                        flavorProductId: event.target.value,
                        sortOrder: splitIndex,
                        flavorProduct: nextFlavor
                          ? {
                              id: nextFlavor.id,
                              name: nextFlavor.name,
                              price: nextFlavor.price,
                              isActive: nextFlavor.isActive ?? true,
                            }
                          : splitFlavors[splitIndex].flavorProduct,
                      };
                      onChange({ ...form, splitFlavors });
                    }}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione um sabor</option>
                    {splitCandidates.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={splitFlavor.isAvailable}
                      onChange={(event) => {
                        const splitFlavors = form.splitFlavors.slice();
                        splitFlavors[splitIndex] = {
                          ...splitFlavors[splitIndex],
                          isAvailable: event.target.checked,
                        };
                        onChange({ ...form, splitFlavors });
                      }}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    Disponível
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() =>
                      onChange({
                        ...form,
                        splitFlavors: form.splitFlavors.filter((_, index) => index !== splitIndex),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...form,
                  splitFlavors: [...form.splitFlavors, makeSplitFlavor()],
                })
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar sabor
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Grupos de modificadores</h3>
            <p className="text-xs text-neutral-500">
              Configure ingredientes, adicionais e escolhas obrigatórias.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.allowCustomization}
            onChange={(event) =>
              onChange({
                ...form,
                allowCustomization: event.target.checked,
                modifierGroups: event.target.checked ? form.modifierGroups : [],
              })
            }
            className="h-4 w-4 rounded border-neutral-300"
          />
        </div>

        {form.allowCustomization && (
          <div className="space-y-4">
            {form.modifierGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-neutral-700">
                    <span className="block text-sm font-medium">Nome do grupo</span>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(event) => {
                        const modifierGroups = form.modifierGroups.slice();
                        modifierGroups[groupIndex] = {
                          ...group,
                          name: event.target.value,
                          sortOrder: groupIndex,
                        };
                        onChange({ ...form, modifierGroups });
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-neutral-700">
                    <span className="block text-sm font-medium">Tipo</span>
                    <select
                      value={group.type}
                      onChange={(event) => {
                        const modifierGroups = form.modifierGroups.slice();
                        modifierGroups[groupIndex] = {
                          ...group,
                          type: event.target.value as ModifierGroupData["type"],
                        };
                        onChange({ ...form, modifierGroups });
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="INGREDIENT">Ingredientes</option>
                      <option value="ADDON">Adicionais</option>
                      <option value="REQUIRED_CHOICE">Escolha única</option>
                      <option value="REQUIRED_MULTI">Escolha múltipla</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="space-y-1 text-sm text-neutral-700">
                    <span className="block text-sm font-medium">Mínimo</span>
                    <input
                      type="number"
                      min="0"
                      value={group.minSelections}
                      onChange={(event) => {
                        const modifierGroups = form.modifierGroups.slice();
                        modifierGroups[groupIndex] = {
                          ...group,
                          minSelections: Number(event.target.value),
                        };
                        onChange({ ...form, modifierGroups });
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-neutral-700">
                    <span className="block text-sm font-medium">Máximo</span>
                    <input
                      type="number"
                      min="1"
                      value={group.maxSelections}
                      onChange={(event) => {
                        const modifierGroups = form.modifierGroups.slice();
                        modifierGroups[groupIndex] = {
                          ...group,
                          maxSelections: Number(event.target.value),
                        };
                        onChange({ ...form, modifierGroups });
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="self-end"
                    onClick={() =>
                      onChange({
                        ...form,
                        modifierGroups: form.modifierGroups.filter(
                          (_, index) => index !== groupIndex
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {group.options.map((option, optionIndex) => (
                    <div
                      key={option.id}
                      className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[1.4fr_.8fr_auto_auto_auto]"
                    >
                      <input
                        type="text"
                        value={option.name}
                        onChange={(event) => {
                          const modifierGroups = form.modifierGroups.slice();
                          const options = group.options.slice();
                          options[optionIndex] = {
                            ...option,
                            name: event.target.value,
                            sortOrder: optionIndex,
                          };
                          modifierGroups[groupIndex] = { ...group, options };
                          onChange({ ...form, modifierGroups });
                        }}
                        placeholder="Nome da opção"
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={option.price}
                        onChange={(event) => {
                          const modifierGroups = form.modifierGroups.slice();
                          const options = group.options.slice();
                          options[optionIndex] = {
                            ...option,
                            price: Number(event.target.value),
                          };
                          modifierGroups[groupIndex] = { ...group, options };
                          onChange({ ...form, modifierGroups });
                        }}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        <input
                          type="checkbox"
                          checked={option.isDefault}
                          onChange={(event) => {
                            const modifierGroups = form.modifierGroups.slice();
                            const options = group.options.slice();
                            options[optionIndex] = {
                              ...option,
                              isDefault: event.target.checked,
                            };
                            modifierGroups[groupIndex] = { ...group, options };
                            onChange({ ...form, modifierGroups });
                          }}
                          className="h-4 w-4 rounded border-neutral-300"
                        />
                        Padrão
                      </label>
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        <input
                          type="checkbox"
                          checked={option.isAvailable}
                          onChange={(event) => {
                            const modifierGroups = form.modifierGroups.slice();
                            const options = group.options.slice();
                            options[optionIndex] = {
                              ...option,
                              isAvailable: event.target.checked,
                            };
                            modifierGroups[groupIndex] = { ...group, options };
                            onChange({ ...form, modifierGroups });
                          }}
                          className="h-4 w-4 rounded border-neutral-300"
                        />
                        Disponível
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                          const modifierGroups = form.modifierGroups.slice();
                          modifierGroups[groupIndex] = {
                            ...group,
                            options: group.options.filter((_, index) => index !== optionIndex),
                          };
                          onChange({ ...form, modifierGroups });
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const modifierGroups = form.modifierGroups.slice();
                    modifierGroups[groupIndex] = {
                      ...group,
                      options: [...group.options, makeOption()],
                    };
                    onChange({ ...form, modifierGroups });
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar opção
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...form,
                  modifierGroups: [...form.modifierGroups, makeGroup()],
                })
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo grupo
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
