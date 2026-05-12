"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Hook customizado para gerenciar fluxo de impressão com confirmação
 *
 * Após chamar a função de impressão, exibe modal perguntando se imprimiu.
 * Se não imprimiu, permite reimprimir quantas vezes necessário.
 *
 * @returns {object} - Objeto com estado do modal e funções de controle
 */
export function usePrintConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const printFunctionRef = useRef<(() => void) | null>(null);

  /**
   * Inicia o fluxo de impressão
   * @param printFn - Função que executa a impressão (printOrder ou printTab)
   */
  const startPrint = useCallback((printFn: () => void) => {
    // Executa a impressão
    printFn();
    // Salva a função para possível reimpressão usando useRef ao invés de useState
    printFunctionRef.current = printFn;
    // Abre o modal de confirmação
    setIsOpen(true);
  }, []);

  /**
   * Usuário confirmou que imprimiu com sucesso
   */
  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    printFunctionRef.current = null;
  }, []);

  /**
   * Usuário quer reimprimir
   */
  const handleRetry = useCallback(() => {
    if (printFunctionRef.current) {
      // Reimprime
      printFunctionRef.current();
      // Mantém o modal aberto para nova confirmação
    }
  }, []);

  /**
   * Fecha o modal sem reimprimir
   */
  const handleCancel = useCallback(() => {
    setIsOpen(false);
    printFunctionRef.current = null;
  }, []);

  return {
    isOpen,
    startPrint,
    handleConfirm,
    handleRetry,
    handleCancel,
  };
}
