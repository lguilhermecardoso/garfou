import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("sets disabled and aria-busy when loading", () => {
    render(<Button loading>Enviando</Button>);

    const button = screen.getByRole("button", { name: /enviando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("honors an explicit disabled prop", () => {
    render(<Button disabled>Bloqueado</Button>);

    expect(screen.getByRole("button", { name: "Bloqueado" })).toBeDisabled();
  });
});
