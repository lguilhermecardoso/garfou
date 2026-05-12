/**
 * CashRegisterPanel
 *
 * Painel completo de gestão de caixa com abertura, fechamento, sangria e suprimento.
 * Mostra status visual do caixa e permite todas as operações.
 *
 * Permissões: OWNER, MANAGER, CASHIER
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lock,
  Unlock,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  restaurantId: string;
}

interface CashRegister {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  initialAmount: string;
  openedBy: { name: string | null };
}

interface ExpectedTotals {
  cash: number;
  debit: number;
  credit: number;
  pix: number;
  total: number;
}

interface CashRegisterData {
  register: CashRegister | null;
  expectedTotals?: ExpectedTotals;
}

export function CashRegisterPanel({ restaurantId }: Props) {
  const queryClient = useQueryClient();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);

  // Estados dos formulários
  const [initialAmount, setInitialAmount] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [declaredCash, setDeclaredCash] = useState("");
  const [declaredDebit, setDeclaredDebit] = useState("");
  const [declaredCredit, setDeclaredCredit] = useState("");
  const [declaredPix, setDeclaredPix] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDesc, setWithdrawalDesc] = useState("");
  const [supplyAmount, setSupplyAmount] = useState("");
  const [supplyDesc, setSupplyDesc] = useState("");

  // Query para buscar status do caixa
  const { data, isLoading, refetch } = useQuery<CashRegisterData>({
    queryKey: ["cash-register", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cash-register`);
      if (!res.ok) throw new Error("Erro ao carregar caixa");
      return res.json();
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const register = data?.register;
  const expectedTotals = data?.expectedTotals;
  const isOpen = register?.status === "OPEN";

  // Mutation: Abrir caixa
  const openMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cash-register/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialAmount: parseFloat(initialAmount),
          notes: openNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao abrir caixa");
      return json;
    },
    onSuccess: () => {
      toast.success("Caixa aberto com sucesso!");
      setShowOpenModal(false);
      setInitialAmount("");
      setOpenNotes("");
      queryClient.invalidateQueries({ queryKey: ["cash-register", restaurantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation: Fechar caixa
  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cash-register/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declaredCash: parseFloat(declaredCash),
          declaredDebit: parseFloat(declaredDebit),
          declaredCredit: parseFloat(declaredCredit),
          declaredPix: parseFloat(declaredPix),
          notes: closeNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao fechar caixa");
      return json;
    },
    onSuccess: (data) => {
      const reg = data.register;
      const hasDiff =
        Math.abs(reg.cashDifference) > 0.01 ||
        Math.abs(reg.debitDifference) > 0.01 ||
        Math.abs(reg.creditDifference) > 0.01 ||
        Math.abs(reg.pixDifference) > 0.01;

      if (hasDiff) {
        toast.warning("Caixa fechado com diferenças!", {
          description: `Verifique o relatório de fechamento`,
        });
      } else {
        toast.success("Caixa fechado com sucesso!");
      }

      setShowCloseModal(false);
      setDeclaredCash("");
      setDeclaredDebit("");
      setDeclaredCredit("");
      setDeclaredPix("");
      setCloseNotes("");
      queryClient.invalidateQueries({ queryKey: ["cash-register", restaurantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation: Sangria
  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cash-register/withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          description: withdrawalDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao realizar sangria");
      return json;
    },
    onSuccess: () => {
      toast.success("Sangria registrada com sucesso!");
      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
      setWithdrawalDesc("");
      queryClient.invalidateQueries({ queryKey: ["cash-register", restaurantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation: Suprimento
  const supplyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cash-register/supply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(supplyAmount),
          description: supplyDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao realizar suprimento");
      return json;
    },
    onSuccess: () => {
      toast.success("Suprimento registrado com sucesso!");
      setShowSupplyModal(false);
      setSupplyAmount("");
      setSupplyDesc("");
      queryClient.invalidateQueries({ queryKey: ["cash-register", restaurantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            {isOpen ? (
              <Unlock className="h-8 w-8 text-green-600" aria-hidden="true" />
            ) : (
              <Lock className="h-8 w-8 text-neutral-400" aria-hidden="true" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                {isOpen ? "Caixa Aberto" : "Caixa Fechado"}
              </h3>
              {register && isOpen && (
                <p className="text-sm text-neutral-500">
                  Aberto por {register.openedBy.name || "N/A"} às{" "}
                  {new Date(register.openedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          <Badge variant={isOpen ? "default" : "secondary"} className="text-sm">
            {isOpen ? "EM OPERAÇÃO" : "FECHADO"}
          </Badge>
        </CardContent>
      </Card>

      {/* Totais Esperados (quando aberto) */}
      {isOpen && expectedTotals && (
        <Card>
          <CardContent className="py-6">
            <h4 className="mb-4 font-semibold text-neutral-900">Valores no Caixa</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                <Banknote className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-neutral-600">Dinheiro</p>
                  <p className="font-semibold text-neutral-900">
                    {formatCurrency(expectedTotals.cash)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-neutral-600">Débito</p>
                  <p className="font-semibold text-neutral-900">
                    {formatCurrency(expectedTotals.debit)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-neutral-600">Crédito</p>
                  <p className="font-semibold text-neutral-900">
                    {formatCurrency(expectedTotals.credit)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-cyan-50 p-3">
                <QrCode className="h-5 w-5 text-cyan-600" />
                <div>
                  <p className="text-xs text-neutral-600">PIX</p>
                  <p className="font-semibold text-neutral-900">
                    {formatCurrency(expectedTotals.pix)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Total Esperado:</span>
                <span className="text-xl font-bold text-neutral-900">
                  {formatCurrency(expectedTotals.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isOpen ? (
          <Button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2"
            size="lg"
          >
            <Unlock className="h-5 w-5" />
            Abrir Caixa
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setShowCloseModal(true)}
              variant="destructive"
              className="flex items-center gap-2"
              size="lg"
            >
              <Lock className="h-5 w-5" />
              Fechar Caixa
            </Button>
            <Button
              onClick={() => setShowWithdrawalModal(true)}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <TrendingDown className="h-5 w-5" />
              Sangria
            </Button>
            <Button
              onClick={() => setShowSupplyModal(true)}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <TrendingUp className="h-5 w-5" />
              Suprimento
            </Button>
          </>
        )}
      </div>

      {/* Modal: Abrir Caixa */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 py-6">
              <h3 className="text-lg font-semibold">Abrir Caixa</h3>
              <Input
                type="number"
                label="Valor Inicial (R$)"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                required
              />
              <Input
                label="Observações (opcional)"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Ex: Troco para o dia"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => openMutation.mutate()}
                  loading={openMutation.isPending}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Fechar Caixa */}
      {showCloseModal && expectedTotals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <Card className="my-8 w-full max-w-2xl">
            <CardContent className="space-y-4 py-6">
              <h3 className="text-lg font-semibold">Fechar Caixa</h3>

              <div className="space-y-2 rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-700">Valores Esperados (Sistema):</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Dinheiro:</span>
                  <span className="font-semibold">{formatCurrency(expectedTotals.cash)}</span>
                  <span>Débito:</span>
                  <span className="font-semibold">{formatCurrency(expectedTotals.debit)}</span>
                  <span>Crédito:</span>
                  <span className="font-semibold">{formatCurrency(expectedTotals.credit)}</span>
                  <span>PIX:</span>
                  <span className="font-semibold">{formatCurrency(expectedTotals.pix)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Informe os valores reais no caixa:
                </p>
                <Input
                  type="number"
                  label="Dinheiro Declarado (R$)"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  placeholder={expectedTotals.cash.toFixed(2)}
                  step="0.01"
                  required
                />
                <Input
                  type="number"
                  label="Débito Declarado (R$)"
                  value={declaredDebit}
                  onChange={(e) => setDeclaredDebit(e.target.value)}
                  placeholder={expectedTotals.debit.toFixed(2)}
                  step="0.01"
                  required
                />
                <Input
                  type="number"
                  label="Crédito Declarado (R$)"
                  value={declaredCredit}
                  onChange={(e) => setDeclaredCredit(e.target.value)}
                  placeholder={expectedTotals.credit.toFixed(2)}
                  step="0.01"
                  required
                />
                <Input
                  type="number"
                  label="PIX Declarado (R$)"
                  value={declaredPix}
                  onChange={(e) => setDeclaredPix(e.target.value)}
                  placeholder={expectedTotals.pix.toFixed(2)}
                  step="0.01"
                  required
                />
                <Input
                  label="Observações (opcional)"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Diferença de troco"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => closeMutation.mutate()}
                  loading={closeMutation.isPending}
                  className="flex-1"
                >
                  Fechar Caixa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Sangria */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 py-6">
              <h3 className="text-lg font-semibold">Sangria</h3>
              <p className="text-sm text-neutral-600">Retirada de dinheiro do caixa</p>
              <Input
                type="number"
                label="Valor (R$)"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                required
              />
              <Input
                label="Motivo"
                value={withdrawalDesc}
                onChange={(e) => setWithdrawalDesc(e.target.value)}
                placeholder="Ex: Depósito bancário"
                required
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => withdrawalMutation.mutate()}
                  loading={withdrawalMutation.isPending}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Suprimento */}
      {showSupplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 py-6">
              <h3 className="text-lg font-semibold">Suprimento</h3>
              <p className="text-sm text-neutral-600">Entrada de dinheiro no caixa</p>
              <Input
                type="number"
                label="Valor (R$)"
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                required
              />
              <Input
                label="Motivo"
                value={supplyDesc}
                onChange={(e) => setSupplyDesc(e.target.value)}
                placeholder="Ex: Troco adicional"
                required
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSupplyModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => supplyMutation.mutate()}
                  loading={supplyMutation.isPending}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
