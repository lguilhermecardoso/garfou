import { prisma } from "@/lib/db";

interface UpsertByPhoneInput {
  restaurantId: string;
  phone: string;
  name?: string;
  email?: string | null;
  source?: string;
}

/**
 * Finds a customer by phone within a restaurant and upserts name/email if changed.
 * Phone is the canonical deduplication key — the same person may order under
 * different name variations ("Gui", "Guilherme", "Luis Guilherme") but their
 * phone number is always the same.
 *
 * Returns the existing (possibly updated) customer, or creates a new one.
 * Returns null if phone is blank after cleaning or name is missing on first creation.
 */
export async function findOrUpsertCustomerByPhone(
  input: UpsertByPhoneInput
): Promise<{ id: string } | null> {
  const cleanPhone = input.phone.replace(/\D/g, "");
  if (!cleanPhone) return null;

  const existing = await prisma.customer.findFirst({
    where: { restaurantId: input.restaurantId, phone: cleanPhone, deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  if (existing) {
    const nameChanged = input.name && input.name !== existing.name;
    const emailChanged = input.email !== undefined && input.email !== existing.email;

    if (nameChanged || emailChanged) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(nameChanged ? { name: input.name } : {}),
          ...(emailChanged ? { email: input.email ?? null } : {}),
        },
        select: { id: true },
      });
    }

    return { id: existing.id };
  }

  if (!input.name) return null;

  return prisma.customer.create({
    data: {
      restaurantId: input.restaurantId,
      name: input.name,
      phone: cleanPhone,
      email: input.email ?? null,
      source: input.source ?? "DIGITAL_MENU",
    },
    select: { id: true },
  });
}
