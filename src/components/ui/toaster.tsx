/**
 * Toast System
 *
 * Sistema de notificações usando Sonner para feedback visual consistente
 * em todas as operações CRUD do sistema.
 *
 * @example
 * import { toast } from 'sonner'
 *
 * toast.success('Pedido criado com sucesso!')
 * toast.error('Erro ao criar pedido')
 * toast.warning('Atenção: estoque baixo')
 * toast.info('Processando...')
 * toast.promise(promise, {
 *   loading: 'Salvando...',
 *   success: 'Salvo!',
 *   error: 'Erro ao salvar'
 * })
 */

"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid #e5e7eb",
          padding: "16px",
          borderRadius: "12px",
        },
        className: "toast-custom",
      }}
    />
  );
}
