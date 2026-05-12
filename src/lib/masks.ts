/**
 * Máscaras e validações para inputs brasileiros
 *
 * Funções utilitárias para aplicar máscaras e validar dados comuns no Brasil:
 * - Telefone/WhatsApp
 * - CPF/CNPJ
 * - CEP
 * - Email
 */

// ─── Telefone ─────────────────────────────────────────────────────────────

/**
 * Aplica máscara de telefone brasileiro
 * Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhone(value: string): string {
  if (!value) return "";

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);

  // Aplica máscara
  if (limited.length <= 10) {
    // Formato antigo: (XX) XXXX-XXXX
    return limited.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    // Formato com 9 dígitos: (XX) XXXXX-XXXX
    return limited.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
}

/**
 * Remove máscara do telefone, retornando apenas números
 */
export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function validatePhone(value: string): boolean {
  const numbers = unmaskPhone(value);
  return numbers.length === 10 || numbers.length === 11;
}

// ─── CPF ──────────────────────────────────────────────────────────────────

/**
 * Aplica máscara de CPF
 * Formato: XXX.XXX.XXX-XX
 */
export function maskCPF(value: string): string {
  if (!value) return "";

  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 11);

  return limited
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/**
 * Remove máscara do CPF
 */
export function unmaskCPF(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida CPF usando algoritmo oficial
 */
export function validateCPF(value: string): boolean {
  const cpf = unmaskCPF(value);

  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// ─── CNPJ ─────────────────────────────────────────────────────────────────

/**
 * Aplica máscara de CNPJ
 * Formato: XX.XXX.XXX/XXXX-XX
 */
export function maskCNPJ(value: string): string {
  if (!value) return "";

  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 14);

  return limited
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/**
 * Remove máscara do CNPJ
 */
export function unmaskCNPJ(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida CNPJ usando algoritmo oficial
 */
export function validateCNPJ(value: string): boolean {
  const cnpj = unmaskCNPJ(value);

  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cnpj.charAt(12))) return false;

  // Valida segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cnpj.charAt(13))) return false;

  return true;
}

// ─── CPF ou CNPJ ──────────────────────────────────────────────────────────

/**
 * Aplica máscara de CPF ou CNPJ automaticamente
 */
export function maskCPFOrCNPJ(value: string): string {
  if (!value) return "";

  const numbers = value.replace(/\D/g, "");

  if (numbers.length <= 11) {
    return maskCPF(value);
  } else {
    return maskCNPJ(value);
  }
}

/**
 * Valida CPF ou CNPJ
 */
export function validateCPFOrCNPJ(value: string): boolean {
  const numbers = unmaskCPF(value);

  if (numbers.length === 11) {
    return validateCPF(value);
  } else if (numbers.length === 14) {
    return validateCNPJ(value);
  }

  return false;
}

// ─── CEP ──────────────────────────────────────────────────────────────────

/**
 * Aplica máscara de CEP
 * Formato: XXXXX-XXX
 */
export function maskCEP(value: string): string {
  if (!value) return "";

  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 8);

  return limited.replace(/^(\d{5})(\d)/, "$1-$2");
}

/**
 * Remove máscara do CEP
 */
export function unmaskCEP(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida CEP (8 dígitos)
 */
export function validateCEP(value: string): boolean {
  const numbers = unmaskCEP(value);
  return numbers.length === 8;
}

// ─── Email ────────────────────────────────────────────────────────────────

/**
 * Valida formato de email
 */
export function validateEmail(value: string): boolean {
  if (!value) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Formata número de telefone para exibição internacional (+55)
 */
export function formatPhoneInternational(value: string): string {
  const numbers = unmaskPhone(value);
  if (!numbers) return "";

  return `+55 ${maskPhone(numbers)}`;
}
