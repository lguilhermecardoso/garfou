/**
 * TabService
 *
 * Business logic for Tab (comanda/bill) domain.
 * Handles opening tabs, closing/paying tabs, releasing tables, and recalculating totals.
 */

import {
  TabRepository,
  type CreateTabInput,
  type CloseTabInput,
} from "@/repositories/tab.repository";
import { TableRepository } from "@/repositories/table.repository";
import { prisma } from "@/lib/db";
import type { Tab } from "@prisma/client";

export class TabService {
  private tabRepository: TabRepository;
  private tableRepository: TableRepository;

  constructor() {
    this.tabRepository = new TabRepository();
    this.tableRepository = new TableRepository();
  }

  /**
   * Open a new tab (comanda).
   * If tableId is provided, marks table as OCCUPIED.
   * If customerId is provided without tableId, it's a walk-in customer tab.
   */
  async openTab(restaurantId: string, data: CreateTabInput, userId: string): Promise<Tab> {
    // Validate that table is available (if tableId provided)
    if (data.tableId) {
      const table = await this.tableRepository.findById(restaurantId, data.tableId);
      if (!table) {
        throw new Error("Mesa não encontrada");
      }
      if (table.status !== "AVAILABLE") {
        throw new Error("Mesa não está disponível");
      }
    }

    // Create tab
    const tab = await this.tabRepository.create(restaurantId, data, userId);

    // Update table status to OCCUPIED (if tableId)
    if (data.tableId) {
      await this.tableRepository.updateStatus(restaurantId, data.tableId, "OCCUPIED");
    }

    return tab;
  }

  /**
   * Close and pay a tab.
   * If tab has a table, releases it back to AVAILABLE.
   * Optionally creates a finance entry for the payment.
   */
  async closeTab(
    restaurantId: string,
    tabId: string,
    data: CloseTabInput,
    userId: string
  ): Promise<Tab> {
    // Validate tab exists and is OPEN
    const existingTab = await this.tabRepository.findById(restaurantId, tabId);
    if (!existingTab) {
      throw new Error("Comanda não encontrada");
    }
    if (existingTab.status !== "OPEN") {
      throw new Error("Comanda não está aberta");
    }

    // Ensure tab.total reflects all current orders before reading it in close()
    await this.tabRepository.updateTotal(restaurantId, tabId);

    // Mark all non-cancelled, non-finalized orders as FINALIZADO
    await prisma.order.updateMany({
      where: {
        tabId,
        restaurantId,
        status: { notIn: ["FINALIZADO", "CANCELADO"] },
      },
      data: { status: "FINALIZADO" },
    });

    // Close tab
    const closedTab = await this.tabRepository.close(restaurantId, tabId, data, userId);

    // Release table (if tableId)
    if (existingTab.tableId) {
      await this.tableRepository.updateStatus(restaurantId, existingTab.tableId, "AVAILABLE");
    }

    // TODO: Create finance entry for the payment
    // await financeRepository.create(restaurantId, {
    //   type: "INCOME",
    //   amount: closedTab.finalTotal,
    //   category: "SALES",
    //   description: `Comanda #${closedTab.id.slice(-6)} - ${closedTab.table?.identifier || closedTab.customer?.name}`,
    //   paymentMethod: data.paymentMethod,
    //   tabId: closedTab.id,
    // });

    return closedTab;
  }

  /**
   * Add an order to a tab and recalculate total.
   */
  async addOrderToTab(restaurantId: string, tabId: string, orderId: string): Promise<void> {
    // Link order to tab
    await prisma.order.updateMany({
      where: { id: orderId, restaurantId },
      data: { tabId },
    });

    // Recalculate tab total
    await this.tabRepository.updateTotal(restaurantId, tabId);
  }

  /**
   * Recalculate tab total from confirmed/finalized orders.
   * Useful when order status changes.
   */
  async recalculateTabTotal(restaurantId: string, tabId: string) {
    return this.tabRepository.updateTotal(restaurantId, tabId);
  }

  /**
   * Cancel a tab and all its orders.
   * If tab has a table, releases it back to AVAILABLE.
   */
  async cancelTab(restaurantId: string, tabId: string): Promise<void> {
    const tab = await this.tabRepository.findById(restaurantId, tabId);
    if (!tab) {
      throw new Error("Comanda não encontrada");
    }

    // Cancel tab (also cancels all orders)
    await this.tabRepository.cancel(restaurantId, tabId);

    // Release table (if tableId)
    if (tab.tableId) {
      await this.tableRepository.updateStatus(restaurantId, tab.tableId, "AVAILABLE");
    }
  }

  /**
   * List all open tabs for a restaurant.
   */
  async listOpenTabs(restaurantId: string) {
    return this.tabRepository.findMany(restaurantId, { status: "OPEN" });
  }

  /**
   * Get tab details by ID.
   */
  async getTabById(restaurantId: string, tabId: string) {
    return this.tabRepository.findById(restaurantId, tabId);
  }
}
