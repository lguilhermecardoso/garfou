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
  logo: z.string().url().optional().nullable(),
});

// ─── Menu ────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

const modifierOptionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, "Nome da opção obrigatório"),
  price: z.number().min(0, "Preço da opção inválido").default(0),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const modifierGroupSchema = z
  .object({
    id: z.string().cuid().optional(),
    name: z.string().min(1, "Nome do grupo obrigatório"),
    type: z.enum(["INGREDIENT", "ADDON", "REQUIRED_CHOICE", "REQUIRED_MULTI"]),
    minSelections: z.number().int().min(0).default(0),
    maxSelections: z.number().int().positive().default(1),
    sortOrder: z.number().int().default(0),
    options: z.array(modifierOptionSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.maxSelections < value.minSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxSelections deve ser maior ou igual a minSelections",
        path: ["maxSelections"],
      });
    }
  });

const splitFlavorSchema = z.object({
  flavorProductId: z.string().cuid("Sabor inválido"),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

function refineProductSchema(
  value: {
    price?: number;
    allowSplit?: boolean;
    splitFlavors?: Array<{ flavorProductId: string }>;
  },
  ctx: z.RefinementCtx
) {
  if (value.allowSplit === false && value.price !== undefined && value.price <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Preço deve ser positivo para produtos sem divisão",
      path: ["price"],
    });
  }

  if (
    value.allowSplit === true &&
    value.splitFlavors !== undefined &&
    value.splitFlavors.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione ao menos um sabor disponível para divisão",
      path: ["splitFlavors"],
    });
  }
}

const baseProductSchema = z.object({
  categoryId: z.string().cuid("Categoria inválida"),
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.number().min(0, "Preço não pode ser negativo"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isPaused: z.boolean().default(false),
  isInternalOnly: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  allowCustomization: z.boolean().default(false),
  allowSplit: z.boolean().default(false),
  maxSplits: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2),
  splitPriceRule: z.enum(["HIGHEST", "AVERAGE", "SUM"]).default("HIGHEST"),
  preparationTime: z.number().int().positive().optional(),
  costPrice: z.number().positive().optional(),
  promotionExpiresAt: z.string().datetime().optional().nullable(),
  image: z.string().url().optional().nullable(),
  modifierGroups: z.array(modifierGroupSchema).default([]),
  splitFlavors: z.array(splitFlavorSchema).default([]),
});

export const createProductSchema = baseProductSchema.superRefine(refineProductSchema);

export const updateProductSchema = baseProductSchema.partial().superRefine(refineProductSchema);

const orderSelectedOptionSchema = z.object({
  optionId: z.string().cuid(),
  quantity: z.number().int().positive().default(1),
  isRemoval: z.boolean().default(false),
});

const orderSplitSchema = z.object({
  splitIndex: z.number().int().min(0),
  flavorProductId: z.string().cuid(),
});

// ─── Orders ──────────────────────────────────────────────────

export const orderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  selectedOptions: z.array(orderSelectedOptionSchema).default([]),
  splits: z.array(orderSplitSchema).default([]),
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
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "VOUCHER"]).optional(),
  tabId: z.string().cuid().optional(),
  tableNumber: z.string().optional(),
  customerId: z.string().cuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1, "Ao menos 1 item obrigatório"),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  deliveryAddress: z
    .object({
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      neighborhood: z.string(),
      city: z.string(),
      state: z.string().length(2).optional(),
      zipCode: z.string().optional(),
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
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().positive(),
  minOrderValue: z.number().default(0),
  maxUses: z.number().int().positive().optional(),
  isFirstOrderOnly: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});

// ─── Tables ──────────────────────────────────────────────────

export const createTableSchema = z.object({
  identifier: z.string().min(1, "Identificador obrigatório").max(50),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const updateTableSchema = createTableSchema.partial();

// ─── Tabs (Comandas) ─────────────────────────────────────────

export const createTabSchema = z
  .object({
    tableId: z.string().cuid().optional(),
    customerId: z.string().cuid().optional(),
    guestCustomerName: z.string().min(1).max(100).optional(), // Cliente avulso
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.tableId || data.customerId || data.guestCustomerName, {
    message: "Comanda deve ter mesa, cliente cadastrado OU nome de cliente avulso",
  })
  .refine(
    (data) => {
      const count = [data.tableId, data.customerId, data.guestCustomerName].filter(Boolean).length;
      return count <= 1;
    },
    {
      message: "Comanda não pode ter mais de um tipo (mesa, cliente ou avulso) ao mesmo tempo",
    }
  );

export const closeTabSchema = z.object({
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER"]),
  discount: z.number().nonnegative().default(0),
  serviceCharge: z.number().nonnegative().default(0),
  coverCharge: z.number().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});
