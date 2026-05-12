"use client";

import { useEffect, useRef } from "react";

/**
 * Modal de confirmação de impressão
 *
 * Exibido após tentar imprimir um cupom (pedido ou comanda).
 * Pergunta ao usuário se a impressão foi bem-sucedida.
 * Se não, oferece botão para reimprimir.
 *
 * @param open - Controla visibilidade do modal
 * @param onOpenChange - Callback quando o estado de abertura muda
 * @param onConfirm - Callback quando usuário confirma que imprimiu com sucesso
 * @param onRetry - Callback quando usuário quer reimprimir
 */
interface PrintConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onRetry: () => void;
}

export function PrintConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onRetry,
}: PrintConfirmationModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onOpenChange(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-confirmation-title"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="print-confirmation-title" className="mb-2 text-lg font-semibold text-neutral-900">
          Seu cupom foi impresso?
        </h2>
        <p className="mb-6 text-sm text-neutral-600">
          Verifique se a impressora emitiu o cupom corretamente.
          <br />
          Se não saiu, clique em &quot;Reimprimir&quot;.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onRetry}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Não, Reimprimir
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600"
          >
            Sim, Imprimiu
          </button>
        </div>
      </div>
    </div>
  );
}
