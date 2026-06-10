"use client";

import { useNewOrderAlert } from "@/hooks/use-new-order-alert";

interface Props {
  restaurantId: string;
}

/**
 * Mount once in the dashboard layout (client boundary).
 * Polls for pending orders and fires a global Sonner toast + sound on every page
 * when a new order arrives, no matter which route the user is on.
 */
export function NewOrderAlertProvider({ restaurantId }: Props) {
  useNewOrderAlert(restaurantId);
  return null;
}
