/**
 * CurrencyInput - Input component for BRL currency values
 *
 * Automatically formats values in Brazilian Real (R$) format
 * Supports:
 * - Real-time formatting as user types
 * - Automatic comma/dot conversion
 * - Validation on blur
 * - All standard input props
 *
 * @example
 * ```tsx
 * <CurrencyInput
 *   value={price}
 *   onChange={(e) => setPrice(e.target.value)}
 *   label="Preço"
 *   required
 * />
 * ```
 */

"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

/**
 * Formata valor para moeda BRL
 * Entrada: "1234.56" ou "123456" (centavos)
 * Saída: "R$ 1.234,56"
 */
export function formatCurrencyInput(value: string): string {
  if (!value) return "";

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  if (!numbers) return "";

  // Converte para centavos (divide por 100)
  const amount = parseInt(numbers, 10) / 100;

  // Formata em BRL
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

/**
 * Remove formatação e retorna valor numérico
 * Entrada: "R$ 1.234,56"
 * Saída: "1234.56"
 */
export function parseCurrencyInput(value: string): string {
  if (!value) return "0";

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  if (!numbers) return "0";

  // Converte centavos para decimal
  const amount = parseInt(numbers, 10) / 100;

  return amount.toFixed(2);
}

/**
 * Remove formatação e retorna número
 * Entrada: "R$ 1.234,56"
 * Saída: 1234.56
 */
export function parseCurrencyToNumber(value: string): number {
  return parseFloat(parseCurrencyInput(value));
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, value, onChange, className = "", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(
      value ? formatCurrencyInput(String(value)) : ""
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Formata visualmente
      const formatted = formatCurrencyInput(rawValue);
      setDisplayValue(formatted);

      // Envia valor numérico limpo para o parent
      const numericValue = parseCurrencyInput(rawValue);
      e.target.value = numericValue;
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Garante formatação final ao sair do campo
      if (displayValue) {
        const formatted = formatCurrencyInput(displayValue);
        setDisplayValue(formatted);
      }
      props.onBlur?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="R$ 0,00"
          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "focus:border-primary-500 focus:ring-primary-200 border-neutral-300"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
