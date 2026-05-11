import { formatCurrency, generateSlug, getOrderStatusLabel } from "@/lib/utils";
import { describe, it, expect } from "vitest";

describe("formatCurrency", () => {
  it("formats BRL correctly", () => {
    expect(formatCurrency(10)).toContain("10");
    expect(formatCurrency(10.5)).toContain("10");
  });
});

describe("generateSlug", () => {
  it("lowercases and replaces spaces", () => {
    expect(generateSlug("Meu Restaurante")).toBe("meu-restaurante");
  });

  it("removes accents", () => {
    expect(generateSlug("Pão de Açúcar")).toBe("pao-de-acucar");
  });
});

describe("getOrderStatusLabel", () => {
  it("returns label for NOVO_PEDIDO", () => {
    expect(getOrderStatusLabel("NOVO_PEDIDO")).toBeTruthy();
  });

  it("returns label for FINALIZADO", () => {
    expect(getOrderStatusLabel("FINALIZADO")).toBeTruthy();
  });
});
