import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("associates the label with the input", () => {
    render(<Input label="Email" placeholder="voce@exemplo.com" />);

    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "email");
  });

  it("shows hint text when there is no error", () => {
    render(<Input label="Telefone" hint="Use DDD" />);

    const input = screen.getByLabelText("Telefone");
    const hint = screen.getByText("Use DDD");

    expect(input).toHaveAttribute("aria-describedby", "telefone-hint");
    expect(hint).toHaveAttribute("id", "telefone-hint");
  });

  it("shows error state accessibly", () => {
    render(<Input label="Senha" error="Campo obrigatório" required />);

    const input = screen.getByLabelText(/senha/i);
    const alert = screen.getByRole("alert");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "senha-error");
    expect(alert).toHaveTextContent("Campo obrigatório");
  });
});
