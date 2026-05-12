/**
 * TableRepository
 *
 * Data access layer for Table domain (physical restaurant tables).
 * Enforces multi-tenancy via restaurantId.
 */

import { prisma } from "@/lib/db";
import type { Prisma, TableStatus } from "@prisma/client";

export interface CreateTableInput {
  identifier: string;
  capacity?: number;
  isActive?: boolean;
}

export interface UpdateTableInput {
  identifier?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface FindTablesFilters {
  status?: TableStatus;
  isActive?: boolean;
}

export class TableRepository {
  /**
   * Find all tables for a restaurant, with optional filters.
   */
  async findMany(restaurantId: string, filters?: FindTablesFilters) {
    const where: Prisma.TableWhereInput = {
      restaurantId,
      deletedAt: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.table.findMany({
      where,
      orderBy: [
        { status: "asc" }, // AVAILABLE first, then OCCUPIED, then RESERVED
        { identifier: "asc" },
      ],
    });
  }

  /**
   * Find table by ID (tenant-guarded).
   */
  async findById(restaurantId: string, tableId: string) {
    return prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Find table by identifier (tenant-guarded).
   */
  async findByIdentifier(restaurantId: string, identifier: string) {
    return prisma.table.findFirst({
      where: {
        restaurantId,
        identifier,
        deletedAt: null,
      },
    });
  }

  /**
   * Create a new table.
   */
  async create(restaurantId: string, data: CreateTableInput) {
    return prisma.table.create({
      data: {
        restaurantId,
        identifier: data.identifier,
        capacity: data.capacity,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update an existing table.
   */
  async update(restaurantId: string, tableId: string, data: UpdateTableInput) {
    return prisma.table.updateMany({
      where: {
        id: tableId,
        restaurantId,
        deletedAt: null,
      },
      data,
    });
  }

  /**
   * Update table status (e.g., AVAILABLE → OCCUPIED).
   */
  async updateStatus(restaurantId: string, tableId: string, status: TableStatus) {
    return prisma.table.updateMany({
      where: {
        id: tableId,
        restaurantId,
        deletedAt: null,
      },
      data: { status },
    });
  }

  /**
   * Soft-delete a table.
   */
  async softDelete(restaurantId: string, tableId: string) {
    return prisma.table.updateMany({
      where: {
        id: tableId,
        restaurantId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
