export type ModifierGroupType = "INGREDIENT" | "ADDON" | "REQUIRED_CHOICE" | "REQUIRED_MULTI";
export type SplitPriceRule = "HIGHEST" | "AVERAGE" | "SUM";

export interface ModifierOptionData {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ModifierGroupData {
  id: string;
  name: string;
  type: ModifierGroupType;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  options: ModifierOptionData[];
}

export interface SplitFlavorData {
  id: string;
  flavorProductId: string;
  sortOrder: number;
  isAvailable: boolean;
  flavorProduct: {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
  };
}

export interface MenuProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image?: string | null;
  isFeatured?: boolean;
  isInternalOnly?: boolean;
  isActive?: boolean;
  isPaused?: boolean;
  categoryId?: string;
  category?: { id: string; name: string };
  allowCustomization: boolean;
  allowSplit: boolean;
  maxSplits: 2 | 3 | 4;
  splitPriceRule: SplitPriceRule;
  modifierGroups: ModifierGroupData[];
  splitFlavors: SplitFlavorData[];
}

export interface CartSelectedOption {
  optionId: string;
  optionName: string;
  quantity: number;
  price: number;
  isRemoval: boolean;
}

export interface CartSplitSelection {
  splitIndex: number;
  flavorProductId: string;
  productName: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  splitPriceRule?: SplitPriceRule;
  selectedOptions: CartSelectedOption[];
  splits: CartSplitSelection[];
}

export function getSplitBasePrice(
  splits: CartSplitSelection[],
  splitPriceRule: SplitPriceRule,
  fallbackPrice: number
) {
  if (splits.length === 0) return fallbackPrice;

  const prices = splits.map((split) => split.price);
  switch (splitPriceRule) {
    case "AVERAGE":
      return prices.reduce((acc, price) => acc + price, 0) / prices.length;
    case "SUM":
      return prices.reduce((acc, price) => acc + price, 0);
    case "HIGHEST":
    default:
      return Math.max(...prices);
  }
}

export function getCartItemUnitPrice(item: CartItem) {
  const basePrice = getSplitBasePrice(item.splits, item.splitPriceRule ?? "HIGHEST", item.price);
  const selectedOptionsPrice = item.selectedOptions.reduce((acc, option) => {
    return option.isRemoval ? acc : acc + option.price * option.quantity;
  }, 0);

  return basePrice + selectedOptionsPrice;
}

export function buildCartItemId(item: Omit<CartItem, "id" | "quantity">) {
  return JSON.stringify({
    productId: item.productId,
    notes: item.notes ?? "",
    selectedOptions: item.selectedOptions
      .map((option) => ({
        optionId: option.optionId,
        quantity: option.quantity,
        isRemoval: option.isRemoval,
      }))
      .sort((left, right) => left.optionId.localeCompare(right.optionId)),
    splits: item.splits
      .map((split) => ({
        splitIndex: split.splitIndex,
        flavorProductId: split.flavorProductId,
      }))
      .sort((left, right) => left.splitIndex - right.splitIndex),
  });
}

export function describeCartItem(item: CartItem) {
  if (item.splits.length === 0) return null;

  const denominator = item.splits.length;
  return item.splits
    .slice()
    .sort((left, right) => left.splitIndex - right.splitIndex)
    .map((split) => `${1}/${denominator} ${split.productName}`)
    .join(" + ");
}
