/* eslint-disable react-hooks/set-state-in-effect */
/**
 * ProductDetailSheet
 *
 * Handles product customization in the digital menu, including split flavors,
 * modifier groups, item notes, and dynamic total calculation before the item
 * is added to the cart.
 */

"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  buildCartItemId,
  getCartItemUnitPrice,
  type CartItem,
  type CartSelectedOption,
  type CartSplitSelection,
  type MenuProductData,
} from "@/features/menu/menu-customization-types";
import { ModifierGroupSection } from "@/features/menu/modifier-group-section";
import { SplitSelector } from "@/features/menu/split-selector";

interface Props {
  product: MenuProductData | null;
  isOpen: boolean;
  onClose(): void;
  onAdd(item: CartItem): void;
}

function getInitialSelections(product: MenuProductData | null) {
  if (!product) return [] as CartSelectedOption[];

  return product.modifierGroups.flatMap((group) =>
    group.type === "REQUIRED_CHOICE"
      ? group.options
          .filter((option) => option.isDefault)
          .slice(0, 1)
          .map((option) => ({
            optionId: option.id,
            optionName: option.name,
            quantity: 1,
            price: option.price,
            isRemoval: false,
          }))
      : []
  );
}

function isGroupSatisfied(
  group: MenuProductData["modifierGroups"][number],
  selections: CartSelectedOption[]
) {
  if (group.minSelections === 0) return true;

  const count = selections.filter((selection) => {
    const option = group.options.find((item) => item.id === selection.optionId);
    if (!option) return false;
    if (group.type === "INGREDIENT") return !selection.isRemoval;
    return !selection.isRemoval;
  }).length;

  return count >= group.minSelections;
}

export function ProductDetailSheet({ product, isOpen, onClose, onAdd }: Props) {
  const [notes, setNotes] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<CartSelectedOption[]>([]);
  const [splits, setSplits] = useState<CartSplitSelection[]>([]);

  // Reset state when product changes
  const productId = product?.id;
  useEffect(() => {
    if (product) {
      setNotes("");
      setSelectedOptions(getInitialSelections(product));
      setSplits([]);
    }
  }, [productId, product]);

  if (!isOpen || !product) return null;

  const currentProduct = product;

  function updateOption(
    option: MenuProductData["modifierGroups"][number]["options"][number],
    checked: boolean
  ) {
    setSelectedOptions((current) => {
      const next = current.filter((selection) => selection.optionId !== option.id);
      const group = currentProduct.modifierGroups.find((item) =>
        item.options.some((candidate) => candidate.id === option.id)
      );
      if (!group) return current;

      if (!checked) {
        if (option.isDefault) {
          next.push({
            optionId: option.id,
            optionName: option.name,
            quantity: 1,
            price: option.price,
            isRemoval: true,
          });
        }
        return next;
      }

      if (group.type === "REQUIRED_CHOICE") {
        return [
          ...next.filter(
            (selection) => !group.options.some((candidate) => candidate.id === selection.optionId)
          ),
          {
            optionId: option.id,
            optionName: option.name,
            quantity: 1,
            price: option.price,
            isRemoval: false,
          },
        ];
      }

      if (option.isDefault) {
        return next;
      }

      next.push({
        optionId: option.id,
        optionName: option.name,
        quantity: 1,
        price: option.price,
        isRemoval: false,
      });
      return next;
    });
  }

  function updateSplit(splitIndex: number, flavorProductId: string) {
    const flavor = currentProduct.splitFlavors.find(
      (item) => item.flavorProductId === flavorProductId
    )?.flavorProduct;
    if (!flavor) return;

    setSplits((current) => {
      const next = current.filter((split) => split.splitIndex !== splitIndex);
      next.push({
        splitIndex,
        flavorProductId,
        productName: flavor.name,
        price: flavor.price,
      });
      return next.sort((left, right) => left.splitIndex - right.splitIndex);
    });
  }

  const draftItem: CartItem = {
    id: "draft",
    productId: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    quantity: 1,
    notes: notes.trim() || undefined,
    selectedOptions,
    splits: currentProduct.allowSplit ? splits : [],
    splitPriceRule: currentProduct.splitPriceRule,
  };

  const unitPrice = getCartItemUnitPrice(draftItem);
  const missingRequiredGroup = currentProduct.modifierGroups.some(
    (group) => !isGroupSatisfied(group, selectedOptions)
  );
  const missingSplit = currentProduct.allowSplit && splits.length !== currentProduct.maxSplits;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{currentProduct.name}</h2>
            <p className="text-sm text-neutral-500">{formatCurrency(unitPrice)}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar personalização">
            <X className="h-5 w-5 text-neutral-500" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {currentProduct.description && (
            <p className="text-sm text-neutral-600">{currentProduct.description}</p>
          )}

          <SplitSelector product={currentProduct} selections={splits} onSelect={updateSplit} />

          {currentProduct.modifierGroups.map((group) => (
            <ModifierGroupSection
              key={group.id}
              group={group}
              selections={selectedOptions.filter((selection) =>
                group.options.some((option) => option.id === selection.optionId)
              )}
              onChange={updateOption}
            />
          ))}

          <Input
            label="Observações"
            id={`notes-${currentProduct.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: caprichar no molho"
          />
        </div>

        <div className="sticky bottom-0 border-t border-neutral-100 bg-white px-4 py-4">
          <Button
            className="w-full"
            size="lg"
            disabled={missingRequiredGroup || missingSplit}
            onClick={() => {
              const itemWithoutId = {
                productId: draftItem.productId,
                name: draftItem.name,
                price: draftItem.price,
                notes: draftItem.notes,
                selectedOptions: draftItem.selectedOptions,
                splits: draftItem.splits,
                splitPriceRule: draftItem.splitPriceRule,
              };
              onAdd({
                ...draftItem,
                id: buildCartItemId(itemWithoutId),
              });
              onClose();
            }}
          >
            Adicionar · {formatCurrency(unitPrice)}
          </Button>
        </div>
      </div>
    </div>
  );
}
