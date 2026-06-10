/**
 * CashRegisterRepository
 *
 * Repository para gerenciar operações de caixa (abertura, fechamento, sangria, suprimento).
 * Implementa o padrão Repository para abstração do acesso ao banco de dados.
 */

import { prisma } from "@/lib/db";
import {
  CashRegisterStatus,
  CashTransactionType,
  PaymentMethod,
  type CashRegister,
  type CashTransaction,
  type Prisma,
} from "@prisma/client";

export interface OpenCashRegisterInput {
  restaurantId: string;
  userId: string;
  initialAmount: number;
  notes?: string;
}

export interface CloseCashRegisterInput {
  registerId: string;
  userId: string;
  declaredCash: number;
  declaredDebit: number;
  declaredCredit: number;
  declaredPix: number;
  notes?: string;
}

export interface CreateTransactionInput {
  registerId: string;
  type: CashTransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  orderId?: string;
  userId?: string;
}

export interface CashRegisterWithRelations extends CashRegister {
  openedBy: { id: string; name: string | null };
  closedByUser?: { id: string; name: string | null } | null;
  transactions: CashTransaction[];
  _count: { transactions: number };
}

export class CashRegisterRepository {
  /**
   * Busca o caixa aberto atual para um restaurante
   */
  async findOpenRegister(restaurantId: string): Promise<CashRegisterWithRelations | null> {
    return prisma.cashRegister.findFirst({
      where: {
        restaurantId,
        status: CashRegisterStatus.OPEN,
      },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
        closedByUser: {
          select: { id: true, name: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50, // Últimas 50 transações
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });
  }

  /**
   * Busca um caixa específico pelo ID
   */
  async findById(registerId: string): Promise<CashRegisterWithRelations | null> {
    return prisma.cashRegister.findUnique({
      where: { id: registerId },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
        closedByUser: {
          select: { id: true, name: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  /**
   * Busca histórico de caixas de um restaurante
   */
  async findHistory(
    restaurantId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { limit = 30, offset = 0, startDate, endDate } = options;

    const where: Prisma.CashRegisterWhereInput = { restaurantId };

    if (startDate || endDate) {
      where.openedAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const [registers, total] = await Promise.all([
      prisma.cashRegister.findMany({
        where,
        include: {
          openedBy: {
            select: { id: true, name: true },
          },
          closedByUser: {
            select: { id: true, name: true },
          },
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { openedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.cashRegister.count({ where }),
    ]);

    return { registers, total };
  }

  /**
   * Abre um novo caixa
   */
  async openRegister(input: OpenCashRegisterInput): Promise<CashRegister> {
    // Verifica se já existe caixa aberto
    const existingOpen = await this.findOpenRegister(input.restaurantId);
    if (existingOpen) {
      throw new Error("Já existe um caixa aberto para este restaurante");
    }

    return prisma.cashRegister.create({
      data: {
        restaurantId: input.restaurantId,
        userId: input.userId,
        initialAmount: input.initialAmount,
        openNotes: input.notes,
        status: CashRegisterStatus.OPEN,
      },
    });
  }

  /**
   * Fecha um caixa
   */
  async closeRegister(input: CloseCashRegisterInput): Promise<CashRegister> {
    const register = await this.findById(input.registerId);
    if (!register) {
      throw new Error("Caixa não encontrado");
    }

    if (register.status === CashRegisterStatus.CLOSED) {
      throw new Error("Este caixa já está fechado");
    }

    // Calcula totais esperados por forma de pagamento
    const expectedTotals = await this.calculateExpectedTotals(input.registerId);

    // Calcula diferenças (quebra de caixa)
    const cashDifference = input.declaredCash - expectedTotals.cash;
    const debitDifference = input.declaredDebit - expectedTotals.debit;
    const creditDifference = input.declaredCredit - expectedTotals.credit;
    const pixDifference = input.declaredPix - expectedTotals.pix;

    return prisma.cashRegister.update({
      where: { id: input.registerId },
      data: {
        status: CashRegisterStatus.CLOSED,
        closedAt: new Date(),
        closedBy: input.userId,
        declaredCash: input.declaredCash,
        declaredDebit: input.declaredDebit,
        declaredCredit: input.declaredCredit,
        declaredPix: input.declaredPix,
        expectedCash: expectedTotals.cash,
        expectedDebit: expectedTotals.debit,
        expectedCredit: expectedTotals.credit,
        expectedPix: expectedTotals.pix,
        cashDifference,
        debitDifference,
        creditDifference,
        pixDifference,
        closeNotes: input.notes,
      },
    });
  }

  /**
   * Cria uma transação de caixa
   */
  async createTransaction(input: CreateTransactionInput): Promise<CashTransaction> {
    const register = await prisma.cashRegister.findUnique({
      where: { id: input.registerId },
      select: { status: true },
    });

    if (!register) {
      throw new Error("Caixa não encontrado");
    }

    if (register.status === CashRegisterStatus.CLOSED) {
      throw new Error("Não é possível adicionar transações a um caixa fechado");
    }

    return prisma.cashTransaction.create({
      data: {
        registerId: input.registerId,
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        description: input.description,
        orderId: input.orderId,
        userId: input.userId,
      },
    });
  }

  /**
   * Calcula os totais esperados por forma de pagamento
   */
  async calculateExpectedTotals(registerId: string): Promise<{
    cash: number;
    debit: number;
    credit: number;
    pix: number;
    total: number;
  }> {
    const register = await prisma.cashRegister.findUnique({
      where: { id: registerId },
      select: { initialAmount: true },
    });

    if (!register) {
      throw new Error("Caixa não encontrado");
    }

    const transactions = await prisma.cashTransaction.findMany({
      where: { registerId },
      select: {
        type: true,
        amount: true,
        paymentMethod: true,
      },
    });

    const totals = {
      cash: Number(register.initialAmount),
      debit: 0,
      credit: 0,
      pix: 0,
      total: Number(register.initialAmount),
    };

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const multiplier =
        transaction.type === CashTransactionType.SALE ||
        transaction.type === CashTransactionType.SUPPLY
          ? 1
          : -1;

      const effectiveAmount = amount * multiplier;

      switch (transaction.paymentMethod) {
        case PaymentMethod.CASH:
          totals.cash += effectiveAmount;
          break;
        case PaymentMethod.DEBIT_CARD:
          totals.debit += effectiveAmount;
          break;
        case PaymentMethod.CREDIT_CARD:
          totals.credit += effectiveAmount;
          break;
        case PaymentMethod.PIX:
          totals.pix += effectiveAmount;
          break;
      }

      totals.total += effectiveAmount;
    }

    return totals;
  }

  /**
   * Busca transações de um caixa
   */
  async findTransactions(
    registerId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<CashTransaction[]> {
    const { limit = 50, offset = 0 } = options;

    return prisma.cashTransaction.findMany({
      where: { registerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Busca resumo de vendas por forma de pagamento
   */
  async getSalesSummary(registerId: string): Promise<{
    byPaymentMethod: Record<string, { count: number; total: number }>;
    withdrawals: { count: number; total: number };
    supplies: { count: number; total: number };
  }> {
    const transactions = await prisma.cashTransaction.findMany({
      where: { registerId },
      select: {
        type: true,
        amount: true,
        paymentMethod: true,
      },
    });

    const summary = {
      byPaymentMethod: {} as Record<string, { count: number; total: number }>,
      withdrawals: { count: 0, total: 0 },
      supplies: { count: 0, total: 0 },
    };

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === CashTransactionType.SALE) {
        const method = transaction.paymentMethod;
        if (!summary.byPaymentMethod[method]) {
          summary.byPaymentMethod[method] = { count: 0, total: 0 };
        }
        summary.byPaymentMethod[method].count++;
        summary.byPaymentMethod[method].total += amount;
      } else if (transaction.type === CashTransactionType.WITHDRAWAL) {
        summary.withdrawals.count++;
        summary.withdrawals.total += amount;
      } else if (transaction.type === CashTransactionType.SUPPLY) {
        summary.supplies.count++;
        summary.supplies.total += amount;
      }
    }

    return summary;
  }
}

export const cashRegisterRepository = new CashRegisterRepository();
