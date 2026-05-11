import { describe, it, expect, beforeEach, vi } from 'vitest';
import { orderRepository } from '../order.repository';
import { prisma } from '@/lib/db';
import type { OrderStatus } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockRestaurantId = 'rest-123';

describe('orderRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMany', () => {
    it('should find all orders for a restaurant with pagination', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 1,
          restaurantId: mockRestaurantId,
          customer: { id: 'cust-1', name: 'John', phone: '123456' },
          items: [],
        },
        {
          id: 'order-2',
          orderNumber: 2,
          restaurantId: mockRestaurantId,
          customer: { id: 'cust-2', name: 'Jane', phone: '654321' },
          items: [],
        },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([mockOrders, 2]);

      const result = await orderRepository.findMany(mockRestaurantId);

      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter orders by status (single)', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          status: 'CONFIRMADO' as OrderStatus,
          restaurantId: mockRestaurantId,
          items: [],
        },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([mockOrders, 1]);

      const result = await orderRepository.findMany(mockRestaurantId, {
        status: 'CONFIRMADO',
      });

      expect(result.orders[0].status).toBe('CONFIRMADO');
      expect(result.total).toBe(1);
    });

    it('should filter orders by multiple statuses', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'CONFIRMADO' as OrderStatus },
        { id: 'order-2', status: 'EM_PREPARO' as OrderStatus },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([mockOrders, 2]);

      const result = await orderRepository.findMany(mockRestaurantId, {
        status: ['CONFIRMADO', 'EM_PREPARO'],
      });

      expect(result.orders).toHaveLength(2);
    });

    it('should filter orders by type', async () => {
      const mockOrders = [
        { id: 'order-1', type: 'MESA' as const },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([mockOrders, 1]);

      const result = await orderRepository.findMany(mockRestaurantId, {
        type: 'MESA',
      });

      expect(result.orders[0].type).toBe('MESA');
    });

    it('should filter orders by date range', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([[], 0]);

      await orderRepository.findMany(mockRestaurantId, { from, to });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([[], 100]);

      const result = await orderRepository.findMany(mockRestaurantId, {
        page: 3,
        pageSize: 10,
      });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('findById', () => {
    it('should find order by id with all relations', async () => {
      const mockOrder = {
        id: 'order-1',
        restaurantId: mockRestaurantId,
        customer: { id: 'cust-1', name: 'John', phone: '123456' },
        items: [
          {
            id: 'item-1',
            product: { id: 'prod-1', name: 'Pizza' },
            addons: [],
          },
        ],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(mockOrder as any);

      const result = await orderRepository.findById(mockRestaurantId, 'order-1');

      expect(result).toEqual(mockOrder);
      expect(result?.customer.name).toBe('John');
      expect(result?.items).toHaveLength(1);
    });

    it('should return null if order not found', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      const result = await orderRepository.findById(mockRestaurantId, 'order-999');

      expect(result).toBeNull();
    });

    it('should ensure restaurantId matches for security', async () => {
      const order = { id: 'order-1', restaurantId: mockRestaurantId };

      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(order as any);

      await orderRepository.findById(mockRestaurantId, 'order-1');

      // Verify findFirst was called with both id and restaurantId
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'order-1',
            restaurantId: mockRestaurantId,
          }),
        })
      );
    });
  });

  describe('findPrintQueue', () => {
    it('should find orders pending print', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          status: 'CONFIRMADO',
          printConfirmed: false,
          items: [],
        },
        {
          id: 'order-2',
          status: 'EM_PREPARO',
          printConfirmed: false,
          items: [],
        },
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders as any);

      const result = await orderRepository.findPrintQueue(mockRestaurantId);

      expect(result).toHaveLength(2);
      expect(result.every((o: any) => !o.printConfirmed)).toBe(true);
    });

    it('should exclude already printed orders', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([] as any);

      const result = await orderRepository.findPrintQueue(mockRestaurantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getNextOrderNumber', () => {
    it('should return 1 if no orders exist', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

      const result = await orderRepository.getNextOrderNumber(mockRestaurantId);

      expect(result).toBe(1);
    });

    it('should increment last order number', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce({
        orderNumber: 42,
      } as any);

      const result = await orderRepository.getNextOrderNumber(mockRestaurantId);

      expect(result).toBe(43);
    });

    it('should isolate by restaurantId', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce({
        orderNumber: 10,
      } as any);

      await orderRepository.getNextOrderNumber(mockRestaurantId);

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: mockRestaurantId,
          }),
        })
      );
    });
  });

  describe('create', () => {
    it('should create order with provided data', async () => {
      const orderData = {
        orderNumber: 1,
        type: 'MESA' as const,
        total: 100,
        status: 'NOVO_PEDIDO' as OrderStatus,
        items: { create: [] },
      };

      const mockCreatedOrder = {
        id: 'order-1',
        ...orderData,
        items: [],
      };

      vi.mocked(prisma.order.create).mockResolvedValueOnce(mockCreatedOrder as any);

      const result = await orderRepository.create(mockRestaurantId, orderData as any);

      expect(result.id).toBe('order-1');
      expect(result.orderNumber).toBe(1);
    });

    it('should connect to restaurant', async () => {
      const orderData = {
        orderNumber: 1,
        items: { create: [] },
      };

      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'order-1',
      } as any);

      await orderRepository.create(mockRestaurantId, orderData as any);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            restaurant: { connect: { id: mockRestaurantId } },
          }),
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const updatedOrder = {
        id: 'order-1',
        status: 'EM_PREPARO' as OrderStatus,
      };

      vi.mocked(prisma.order.update).mockResolvedValueOnce(updatedOrder as any);

      const result = await orderRepository.updateStatus(
        mockRestaurantId,
        'order-1',
        'EM_PREPARO'
      );

      expect(result.status).toBe('EM_PREPARO');
    });

    it('should enforce restaurantId in where clause', async () => {
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);

      await orderRepository.updateStatus(
        mockRestaurantId,
        'order-1',
        'CONFIRMADO'
      );

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'order-1',
            restaurantId: mockRestaurantId,
          }),
        })
      );
    });
  });

  describe('confirmPrint', () => {
    it('should set printConfirmed flag and timestamp', async () => {
      const updatedOrder = {
        id: 'order-1',
        printConfirmed: true,
        printedAt: new Date('2026-05-11T12:00:00Z'),
      };

      vi.mocked(prisma.order.update).mockResolvedValueOnce(updatedOrder as any);

      const result = await orderRepository.confirmPrint(
        mockRestaurantId,
        'order-1'
      );

      expect(result.printConfirmed).toBe(true);
      expect(result.printedAt).toBeDefined();
    });

    it('should enforce restaurantId isolation', async () => {
      vi.mocked(prisma.order.update).mockResolvedValueOnce({} as any);

      await orderRepository.confirmPrint(mockRestaurantId, 'order-1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: {
          id: 'order-1',
          restaurantId: mockRestaurantId,
        },
        data: {
          printConfirmed: true,
          printedAt: expect.any(Date),
        },
      });
    });
  });
});
