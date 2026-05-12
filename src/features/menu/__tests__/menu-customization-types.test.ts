import { describe, expect, it } from "vitest";
import { getSplitBasePrice, getCartItemUnitPrice } from "@/features/menu/menu-customization-types";

describe("menu customization pricing", () => {
  it("uses the highest flavor price for HIGHEST", () => {
    const result = getSplitBasePrice(
      [
        { splitIndex: 0, flavorProductId: "a", productName: "Calabresa", price: 50 },
        { splitIndex: 1, flavorProductId: "b", productName: "Frango", price: 60 },
      ],
      "HIGHEST",
      0
    );

    expect(result).toBe(60);
  });

  it("uses the average flavor price for AVERAGE", () => {
    const result = getSplitBasePrice(
      [
        { splitIndex: 0, flavorProductId: "a", productName: "Calabresa", price: 50 },
        { splitIndex: 1, flavorProductId: "b", productName: "Frango", price: 60 },
      ],
      "AVERAGE",
      0
    );

    expect(result).toBe(55);
  });

  it("uses the sum of flavor prices for SUM", () => {
    const result = getSplitBasePrice(
      [
        { splitIndex: 0, flavorProductId: "a", productName: "Calabresa", price: 50 },
        { splitIndex: 1, flavorProductId: "b", productName: "Frango", price: 60 },
      ],
      "SUM",
      0
    );

    expect(result).toBe(110);
  });

  it("adds paid modifiers after split rule is applied", () => {
    const result = getCartItemUnitPrice({
      id: "draft",
      productId: "pizza-grande",
      name: "Pizza Grande 2 Sabores",
      price: 0,
      quantity: 1,
      splitPriceRule: "HIGHEST",
      splits: [
        { splitIndex: 0, flavorProductId: "a", productName: "Calabresa", price: 50 },
        { splitIndex: 1, flavorProductId: "b", productName: "Frango", price: 60 },
      ],
      selectedOptions: [
        {
          optionId: "extra-queijo",
          optionName: "Extra queijo",
          quantity: 1,
          price: 8,
          isRemoval: false,
        },
      ],
    });

    expect(result).toBe(68);
  });
});
