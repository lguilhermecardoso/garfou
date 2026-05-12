/**
 * SplitSelector
 *
 * Presents the split-product flow for products that can be divided into
 * multiple parts, including slot selection and dynamic price feedback.
 */

"use client";

import { formatCurrency } from "@/lib/utils";
import type { CartSplitSelection, MenuProductData } from "@/features/menu/menu-customization-types";

interface Props {
  product: MenuProductData;
  selections: CartSplitSelection[];
  onSelect(splitIndex: number, flavorProductId: string): void;
}

export function SplitSelector({ product, selections, onSelect }: Props) {
  if (!product.allowSplit) return null;

  const selectedCount = selections.length;

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Divisão em partes</h3>
          <p className="text-xs text-neutral-500">
            Monte {product.maxSplits} sabores. O valor deste item será calculado pela regra{" "}
            {product.splitPriceRule}.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: product.maxSplits }, (_, splitIndex) => {
          const value = selections.find((selection) => selection.splitIndex === splitIndex);

          return (
            <div key={splitIndex} className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500">
                {splitIndex + 1}ª parte
              </label>
              <select
                value={value?.flavorProductId ?? ""}
                onChange={(event) => onSelect(splitIndex, event.target.value)}
                className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="">Escolha um sabor</option>
                {product.splitFlavors
                  .filter(
                    (splitFlavor) => splitFlavor.isAvailable && splitFlavor.flavorProduct.isActive
                  )
                  .map((splitFlavor) => (
                    <option key={splitFlavor.id} value={splitFlavor.flavorProductId}>
                      {splitFlavor.flavorProduct.name} ·{" "}
                      {formatCurrency(splitFlavor.flavorProduct.price)}
                    </option>
                  ))}
              </select>
            </div>
          );
        })}

        <p className="text-xs text-neutral-500">
          {selectedCount === product.maxSplits
            ? "Todos os sabores foram definidos."
            : `Faltam ${product.maxSplits - selectedCount} partes para concluir a divisão.`}
        </p>
      </div>
    </section>
  );
}
