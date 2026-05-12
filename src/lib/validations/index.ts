import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────

export const signUpSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter ao menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});

export const signInSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

// ─── Restaurant ──────────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

// ─── Menu ────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const createProductSchema = z.object({
  categoryId: z.string().cuid("Categoria inválida"),
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.number().positive("Preço deve ser positivo"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isInternalOnly: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  preparationTime: z.number().int().positive().optional(),
  costPrice: z.number().positive().optional(),
});

// ─── Orders ──────────────────────────────────────────────────

export const orderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  addons: z
    .array(
      z.object({
        addonId: z.string().cuid(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .default([]),
});

export const createOrderSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEOUT", "DELIVERY"]),
  tableNumber: z.string().optional(),
  customerId: z.string().cuid().optional(),
  items: z.array(orderItemSchema).min(1, "Ao menos 1 item obrigatório"),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  deliveryAddress: z
    .object({
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      neighborhood: z.string(),
      city: z.string(),
    })
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "AGUARDANDO_CONFIRMACAO",
    "CONFIRMADO",
    "EM_PREPARO",
    "PRONTO",
    "SAIU_PARA_ENTREGA",
    "FINALIZADO",
    "CANCELADO",
  ]),
  reason: z.string().optional(), // for cancellation
});

// ─── Finance ─────────────────────────────────────────────────

export const createFinanceEntrySchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"]).optional(),
});

// ─── NPS ─────────────────────────────────────────────────────

export const createNpsResponseSchema = z.object({
  orderId: z.string().cuid(),
  score: z.number().int().min(0).max(10),
  comment: z.string().optional(),
});

// ─── Customer ────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

// ─── Coupon ──────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Apenas letras maiúsculas e números"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().positive(),
  minOrderValue: z.number().default(0),
  maxUses: z.number().int().positive().optional(),
  isFirstOrderOnly: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});
