// Global TypeScript types for chamou.delivery

import type {
  UserRole,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface SessionUser extends AuthUser {
  restaurants: RestaurantMembership[];
}

export interface RestaurantMembership {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: UserRole;
}

// ─── Restaurant ───────────────────────────────────────────────

export interface RestaurantSettings {
  autoApproveOrders: boolean;
  allowOnlineOrders: boolean;
  whatsappNumber: string | null;
  currency: string;
  timezone: string;
  printers: PrinterConfig[];
}

export interface PrinterConfig {
  id: string;
  name: string;
  type: "kitchen" | "counter";
  isDefault: boolean;
}

// ─── Orders ───────────────────────────────────────────────────

export interface OrderWithItems {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  tableNumber: string | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  notes: string | null;
  printConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  waiter: {
    id: string;
    name: string | null;
  } | null;
  items: OrderItemWithProduct[];
}

export interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
  addons: {
    id: string;
    quantity: number;
    unitPrice: number;
    addon: {
      id: string;
      name: string;
    };
  }[];
}

// ─── Menu ─────────────────────────────────────────────────────

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  products: MenuProduct[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isFeatured: boolean;
  allowCustomization: boolean;
  allowSplit: boolean;
  maxSplits: 2 | 3 | 4;
  splitPriceRule: "HIGHEST" | "AVERAGE" | "SUM";
  preparationTime: number | null;
  modifierGroups: {
    id: string;
    name: string;
    type: "INGREDIENT" | "ADDON" | "REQUIRED_CHOICE" | "REQUIRED_MULTI";
    minSelections: number;
    maxSelections: number;
    sortOrder: number;
    options: {
      id: string;
      name: string;
      price: number;
      isDefault: boolean;
      isAvailable: boolean;
      sortOrder: number;
    }[];
  }[];
  splitFlavors: {
    id: string;
    flavorProductId: string;
    sortOrder: number;
    isAvailable: boolean;
    flavorProduct: {
      id: string;
      name: string;
      price: number;
      isActive: boolean;
    };
  }[];
  addons: {
    id: string;
    name: string;
    price: number;
    isRequired: boolean;
    maxQuantity: number;
  }[];
}

// ─── API Responses ────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Dashboard ────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageTicket: number;
  pendingOrders: number;
  canceledOrders: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

// ─── Print Agent ──────────────────────────────────────────────

export interface PrintJob {
  orderId: string;
  orderNumber: number;
  type: "NEW_ORDER" | "RECEIPT" | "REPRINT";
  restaurantName: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    notes: string | null;
    addons: { name: string; quantity: number }[];
  }[];
  tableNumber: string | null;
  notes: string | null;
  total: number;
  createdAt: string;
}
