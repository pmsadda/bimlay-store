"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  allowedPaymentStates,
  isOrderState,
  NEXT_ORDER_STATES,
} from "@/lib/order-rules";

export type OrderActionState = {
  error: string;
  success: string;
};

class OrderUpdateError extends Error {}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refreshOrderPages(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order-confirmation/${orderId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

function errorState(error: unknown): OrderActionState {
  if (error instanceof OrderUpdateError) {
    return { error: error.message, success: "" };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return {
      error: "Another update happened at the same time. Refresh and try again.",
      success: "",
    };
  }

  return {
    error: "Could not update this order. Please try again.",
    success: "",
  };
}

export async function changeOrderStatus(
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can change order status.",
      success: "",
    };
  }

  const orderId = text(formData, "orderId");
  const target = text(formData, "status");
  const reason = text(formData, "reason");
  const restockReturn = formData.get("restockReturn") === "on";

  if (!orderId || orderId.length > 100 || !isOrderState(target)) {
    return { error: "Invalid order or status.", success: "" };
  }

  if (reason.length > 500) {
    return {
      error: "Notes must not exceed 500 characters.",
      success: "",
    };
  }

  if (
    (target === "CANCELLED" || target === "RETURNED") &&
    reason.length < 5
  ) {
    return {
      error: "Enter a reason containing at least 5 characters.",
      success: "",
    };
  }

  try {
    await db.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (!order) {
          throw new OrderUpdateError("Order not found.");
        }

        if (!NEXT_ORDER_STATES[order.status].includes(target)) {
          throw new OrderUpdateError(
            "This status change is not allowed. Refresh to see the current order status.",
          );
        }

        const shouldRestock =
          target === "CANCELLED" ||
          (target === "RETURNED" && restockReturn);

        let restoredUnits = 0;

        if (shouldRestock && !order.stockReleasedAt) {
          for (const item of order.items) {
            if (!item.variantId) continue;

            const result = await tx.productVariant.updateMany({
              where: { id: item.variantId },
              data: {
                stock: { increment: item.quantity },
              },
            });

            if (result.count === 1) {
              restoredUnits += item.quantity;
            }
          }
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: target,
            stockReleasedAt:
              shouldRestock && !order.stockReleasedAt
                ? new Date()
                : order.stockReleasedAt,
          },
        });

        const stockNote = shouldRestock
          ? `Restocked ${restoredUnits} units into existing variants.`
          : target === "RETURNED"
            ? "Returned items were not restocked."
            : "";

        await tx.orderAudit.create({
          data: {
            orderId,
            adminId: admin.id,
            actorEmail: admin.email,
            event: "STATUS_CHANGED",
            fromValue: order.status,
            toValue: target,
            note: [reason, stockNote].filter(Boolean).join(" "),
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  } catch (error) {
    return errorState(error);
  }

  refreshOrderPages(orderId);

  return {
    error: "",
    success: "Order status updated.",
  };
}

export async function changeOrderPayment(
  _previousState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can record payments.",
      success: "",
    };
  }

  const orderId = text(formData, "orderId");
  const target = text(formData, "paymentStatus");
  const note = text(formData, "paymentNote");

  if (
    !orderId ||
    orderId.length > 100 ||
    (target !== "PAID" && target !== "REFUNDED")
  ) {
    return {
      error: "Invalid payment update.",
      success: "",
    };
  }

  if (note.length < 5 || note.length > 500) {
    return {
      error: "Enter a payment reference or note of 5 to 500 characters.",
      success: "",
    };
  }

  try {
    await db.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new OrderUpdateError("Order not found.");
        }

        const allowed = allowedPaymentStates(
          order.status,
          order.paymentStatus,
        );

        if (!allowed.includes(target)) {
          throw new OrderUpdateError(
            "This payment change is not allowed for the current order.",
          );
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: target,
          },
        });

        await tx.orderAudit.create({
          data: {
            orderId,
            adminId: admin.id,
            actorEmail: admin.email,
            event: "PAYMENT_CHANGED",
            fromValue: order.paymentStatus,
            toValue: target,
            note,
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    return errorState(error);
  }

  refreshOrderPages(orderId);

  return {
    error: "",
    success: "Payment record updated.",
  };
}