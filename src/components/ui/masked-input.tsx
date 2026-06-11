/**
 * Input components with Brazilian masks and validations
 *
 * Components ready to use with automatic masking and validation:
 * - PhoneInput: Phone/WhatsApp with (XX) XXXXX-XXXX format
 * - CPFInput: CPF with XXX.XXX.XXX-XX format
 * - CNPJInput: CNPJ with XX.XXX.XXX/XXXX-XX format
 * - CPFOrCNPJInput: Auto-detects and applies correct mask
 * - CEPInput: CEP with XXXXX-XXX format
 * - EmailInput: Email validation
 * - CurrencyInput: BRL currency with R$ X.XXX,XX format (imported from currency-input.tsx)
 *
 * All components support:
 * - Real-time masking as user types
 * - Validation on blur
 * - Error message display
 * - All standard input props
 *
 * @example
 * ```tsx
 * <PhoneInput
 *   value={phone}
 *   onChange={(e) => setPhone(e.target.value)}
 *   required
 * />
 *
 * <CurrencyInput
 *   value={price}
 *   onChange={(e) => setPrice(e.target.value)}
 *   label="Preço"
 * />
 * ```
 */

"use client";

import { InputHTMLAttributes, forwardRef, useState, useEffect } from "react";
import {
  maskPhone,
  validatePhone,
  maskCPF,
  validateCPF,
  maskCNPJ,
  validateCNPJ,
  maskCPFOrCNPJ,
  validateCPFOrCNPJ,
  maskCEP,
  validateCEP,
  validateEmail,
} from "@/lib/masks";

// Re-export CurrencyInput for convenience
export {
  CurrencyInput,
  formatCurrencyInput,
  parseCurrencyInput,
  parseCurrencyToNumber,
} from "./currency-input";

// ─── Base Input Component ─────────────────────────────────────────────────

interface BaseInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValidate?: (isValid: boolean) => void;
}

const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
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
BaseInput.displayName = "BaseInput";

// ─── PhoneInput ───────────────────────────────────────────────────────────

export type PhoneInputProps = BaseInputProps;

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onValidate, onBlur, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        const isValid = validatePhone(value);
        onValidate?.(isValid);
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskPhone(e.target.value);
      e.target.value = masked;
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value && !validatePhone(e.target.value)) {
        setError("Telefone inválido. Use o formato (XX) XXXXX-XXXX");
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="tel"
        placeholder="(41) 98792-4760"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";

// ─── CPFInput ─────────────────────────────────────────────────────────────

export type CPFInputProps = BaseInputProps;

export const CPFInput = forwardRef<HTMLInputElement, CPFInputProps>(
  ({ value, onChange, onValidate, onBlur, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        const isValid = validateCPF(value);
        onValidate?.(isValid);
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCPF(e.target.value);
      e.target.value = masked;
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value && !validateCPF(e.target.value)) {
        setError("CPF inválido");
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="text"
        placeholder="123.456.789-00"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
CPFInput.displayName = "CPFInput";

// ─── CNPJInput ────────────────────────────────────────────────────────────

export type CNPJInputProps = BaseInputProps;

export const CNPJInput = forwardRef<HTMLInputElement, CNPJInputProps>(
  ({ value, onChange, onValidate, onBlur, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        const isValid = validateCNPJ(value);
        onValidate?.(isValid);
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCNPJ(e.target.value);
      e.target.value = masked;
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value && !validateCNPJ(e.target.value)) {
        setError("CNPJ inválido");
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="text"
        placeholder="12.345.678/0001-00"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
CNPJInput.displayName = "CNPJInput";

// ─── CPFOrCNPJInput ───────────────────────────────────────────────────────

export type CPFOrCNPJInputProps = BaseInputProps;

export const CPFOrCNPJInput = forwardRef<HTMLInputElement, CPFOrCNPJInputProps>(
  ({ value, onChange, onValidate, onBlur, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        const isValid = validateCPFOrCNPJ(value);
        onValidate?.(isValid);
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCPFOrCNPJ(e.target.value);
      e.target.value = masked;
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value && !validateCPFOrCNPJ(e.target.value)) {
        setError("CPF ou CNPJ inválido");
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="text"
        placeholder="CPF ou CNPJ"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
CPFOrCNPJInput.displayName = "CPFOrCNPJInput";

// ─── CEPInput ─────────────────────────────────────────────────────────────

export interface CEPInputProps extends BaseInputProps {
  onCEPComplete?: (cep: string) => void;
}

export const CEPInput = forwardRef<HTMLInputElement, CEPInputProps>(
  ({ value, onChange, onValidate, onBlur, onCEPComplete, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        onValidate?.(validateCEP(value));
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCEP(e.target.value);
      e.target.value = masked;
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (e.target.value && !validateCEP(e.target.value)) {
        setError("CEP inválido. Use o formato XXXXX-XXX");
      } else if (raw.length === 8) {
        // Only fetch on blur when CEP is complete and valid
        onCEPComplete?.(raw);
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="text"
        placeholder="80000-000"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
CEPInput.displayName = "CEPInput";

// ─── EmailInput ───────────────────────────────────────────────────────────

export type EmailInputProps = BaseInputProps;

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ value, onChange, onValidate, onBlur, ...props }, ref) => {
    const [error, setError] = useState<string>("");

    useEffect(() => {
      if (value && typeof value === "string") {
        const isValid = validateEmail(value);
        onValidate?.(isValid);
      }
    }, [value, onValidate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      if (error) setError("");
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value && !validateEmail(e.target.value)) {
        setError("Email inválido");
      }
      onBlur?.(e);
    };

    return (
      <BaseInput
        ref={ref}
        type="email"
        placeholder="seu@email.com"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        inputMode="email"
        autoComplete="email"
        {...props}
      />
    );
  }
);
EmailInput.displayName = "EmailInput";
