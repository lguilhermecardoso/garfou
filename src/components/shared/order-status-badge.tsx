"use client";

import { cn } from "@/lib/utils";
import { getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        getOrderStatusColor(status),
        className
      )}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}
