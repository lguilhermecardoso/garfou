/**
 * Toast Utilities
 *
 * Helper functions para operações assíncronas com feedback visual consistente.
 */

import { toast } from "sonner";

/**
 * Wrapper para operações assíncronas com toast de loading/success/error automático.
 *
 * @example
 * await toastPromise(
 *   fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
 *   {
 *     loading: 'Salvando produto...',
 *     success: 'Produto salvo com sucesso!',
 *     error: 'Erro ao salvar produto'
 *   }
 * );
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  options: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((error: unknown) => string);
  }
): Promise<T> {
  return toast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: options.error || "Ocorreu um erro",
  });
}

/**
 * Toast de sucesso para operações CRUD.
 */
export const toastSuccess = {
  created: (entity: string) => toast.success(`${entity} criado com sucesso!`),
  updated: (entity: string) => toast.success(`${entity} atualizado com sucesso!`),
  deleted: (entity: string) => toast.success(`${entity} excluído com sucesso!`),
  saved: (entity: string) => toast.success(`${entity} salvo com sucesso!`),
};

/**
 * Toast de erro para operações CRUD.
 */
export const toastError = {
  create: (entity: string, error?: string) =>
    toast.error(error || `Erro ao criar ${entity.toLowerCase()}`),
  update: (entity: string, error?: string) =>
    toast.error(error || `Erro ao atualizar ${entity.toLowerCase()}`),
  delete: (entity: string, error?: string) =>
    toast.error(error || `Erro ao excluir ${entity.toLowerCase()}`),
  load: (entity: string, error?: string) =>
    toast.error(error || `Erro ao carregar ${entity.toLowerCase()}`),
  generic: (message: string) => toast.error(message),
};

/**
 * Toast de aviso/validação.
 */
export const toastWarning = {
  required: (field: string) => toast.warning(`${field} é obrigatório`),
  invalid: (field: string) => toast.warning(`${field} inválido`),
  generic: (message: string) => toast.warning(message),
};
