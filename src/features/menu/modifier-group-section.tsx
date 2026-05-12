/**
 * ModifierGroupSection
 *
 * Renders a single modifier group for the digital menu and delegates selection
 * changes to the parent ProductDetailSheet.
 */

"use client";

import { formatCurrency } from "@/lib/utils";
import type {
  CartSelectedOption,
  ModifierGroupData,
  ModifierOptionData,
} from "@/features/menu/menu-customization-types";

interface Props {
  group: ModifierGroupData;
  selections: CartSelectedOption[];
  onChange(option: ModifierOptionData, checked: boolean): void;
}

function isChecked(option: ModifierOptionData, selections: CartSelectedOption[]) {
  const selection = selections.find((item) => item.optionId === option.id);
  if (option.isDefault) {
    return !selection?.isRemoval;
  }

  return Boolean(selection && !selection.isRemoval);
}

function getSelectionCount(group: ModifierGroupData, selections: CartSelectedOption[]) {
  if (group.type === "INGREDIENT") {
    return group.options.filter((option) => isChecked(option, selections)).length;
  }

  return selections.filter((item) => !item.isRemoval).length;
}

export function ModifierGroupSection({ group, selections, onChange }: Props) {
  const selectionCount = getSelectionCount(group, selections);

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{group.name}</h3>
          <p className="text-xs text-neutral-500">
            {group.minSelections > 0
              ? `Escolha pelo menos ${group.minSelections}`
              : `Opcional${group.maxSelections > 1 ? ` · até ${group.maxSelections}` : ""}`}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-neutral-500">
          {selectionCount}/{group.maxSelections}
        </span>
      </div>

      <div className="space-y-2">
        {group.options.map((option) => {
          const checked = isChecked(option, selections);
          const disableUnchecked =
            !checked &&
            group.type !== "REQUIRED_CHOICE" &&
            group.maxSelections > 0 &&
            selectionCount >= group.maxSelections;

          return (
            <label
              key={option.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                checked ? "border-primary-300 bg-primary-50" : "border-neutral-200 bg-white"
              } ${!option.isAvailable ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type={group.type === "REQUIRED_CHOICE" ? "radio" : "checkbox"}
                  name={`group-${group.id}`}
                  checked={checked}
                  onChange={(event) => onChange(option, event.target.checked)}
                  disabled={!option.isAvailable || disableUnchecked}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <div>
                  <p className="font-medium text-neutral-900">{option.name}</p>
                  {!option.isAvailable && (
                    <p className="text-xs text-red-500">Indisponível no momento</p>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-neutral-600">
                {option.price > 0 ? `+ ${formatCurrency(option.price)}` : "Incluso"}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
