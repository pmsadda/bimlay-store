export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

export type OrderState = typeof ORDER_STATUSES[number];

export const NEXT_ORDER_STATES: Record<
  OrderState,
  readonly OrderState[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function isOrderState(
  value: string,
): value is OrderState {
  return ORDER_STATUSES.some((status) => status === value);
}

export function allowedPaymentStates(
  status: OrderState,
  paymentStatus: string,
): string[] {
  if (paymentStatus === "UNPAID" && status === "DELIVERED") {
    return ["PAID"];
  }

  if (
    paymentStatus === "PAID" &&
    (status === "CANCELLED" || status === "RETURNED")
  ) {
    return ["REFUNDED"];
  }

  return [];
}

export function label(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}