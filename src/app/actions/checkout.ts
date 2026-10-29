"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCustomer } from "@/lib/customer-auth";
import {
  calculateCouponDiscount,
  CouponValidationError,
  normalizeCouponCode,
} from "@/lib/coupons";

class CheckoutError extends Error {}

type CheckoutItem = {
  variantId: string;
  quantity: number;
};

type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      items: CheckoutItem[];
    }
  | {
      ok: false;
      error: string;
    };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new CheckoutError("Your bag is empty or invalid.");
  }

  const seen = new Set<string>();

  return value.map((item) => {
    if (
      !item ||
      typeof item.variantId !== "string" ||
      item.variantId.length < 1 ||
      item.variantId.length > 100 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      seen.has(item.variantId)
    ) {
      throw new CheckoutError("Your bag contains invalid items.");
    }

    seen.add(item.variantId);

    return {
      variantId: item.variantId,
      quantity: item.quantity,
    };
  });
}

function normalizePhone(value: string) {
  const digits = value.replace(/[০-৯]/g, (digit) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
  );

  return digits.replace(/[\s()-]/g, "").replace(/^\+?88/, "");
}

async function grantReceiptAccess(orderId: string, secret: string) {
  const cookieStore = await cookies();

  cookieStore.set("bimlay_order_receipt", `${orderId}:${secret}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/order-confirmation",
    maxAge: 48 * 60 * 60,
  });
}

export async function submitCheckout(input: unknown): Promise<CheckoutResult> {
  try {
    if (!input || typeof input !== "object") {
      throw new CheckoutError("Invalid checkout request.");
    }

    const data = input as Record<string, unknown>;

    const checkoutKey = stringValue(data.checkoutKey);
    const receiptSecret = stringValue(data.receiptSecret);

    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        checkoutKey,
      ) ||
      !/^[a-f0-9]{64}$/.test(receiptSecret)
    ) {
      throw new CheckoutError("Invalid checkout session.");
    }

    const receiptTokenHash = hash(receiptSecret);

    // A retry must return the original order.
    const previous = await db.order.findUnique({
      where: { checkoutKey },
      include: { items: true },
    });

    if (previous) {
      if (previous.receiptTokenHash !== receiptTokenHash) {
        throw new CheckoutError("Invalid checkout session.");
      }

      await grantReceiptAccess(previous.id, receiptSecret);

      return {
        ok: true,
        orderId: previous.id,
        items: previous.items.flatMap((item) =>
          item.variantId
            ? [
                {
                  variantId: item.variantId,
                  quantity: item.quantity,
                },
              ]
            : [],
        ),
      };
    }

    const customerName = stringValue(data.customerName);
    const phone = normalizePhone(stringValue(data.phone));
    const email = stringValue(data.email).toLowerCase();
    const district = stringValue(data.district);
    const address = stringValue(data.address);
    const notes = stringValue(data.notes);
    const deliveryZone = stringValue(data.deliveryZone);
    const expectedTotal = stringValue(data.expectedTotal);
    const couponInput = stringValue(data.couponCode);
    const couponCode = couponInput ? normalizeCouponCode(couponInput) : null;
    const items = parseItems(data.items);

    if (customerName.length < 2 || customerName.length > 100) {
      throw new CheckoutError("Enter your full name.");
    }

    if (!/^01\d{9}$/.test(phone)) {
      throw new CheckoutError(
        "Enter a valid 11-digit Bangladesh mobile number.",
      );
    }

    if (
      email &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      throw new CheckoutError("Enter a valid email or leave it empty.");
    }

    if (district.length < 2 || district.length > 80) {
      throw new CheckoutError("Enter your district.");
    }

    if (address.length < 10 || address.length > 500) {
      throw new CheckoutError("Enter your complete delivery address.");
    }

    if (notes.length > 500) {
      throw new CheckoutError("Order notes must not exceed 500 characters.");
    }

    if (deliveryZone !== "DHAKA" && deliveryZone !== "OUTSIDE_DHAKA") {
      throw new CheckoutError("Choose a delivery area.");
    }

    if (!/^\d{1,14}\.\d{2}$/.test(expectedTotal)) {
      throw new CheckoutError("Refresh checkout and review your total.");
    }

    // Basic phone-based checkout attempt limit.
    const hour = Math.floor(Date.now() / 3600000);

    const limit = await db.checkoutLimit.upsert({
      where: {
        id: hash(`${phone}:${hour}`),
      },
      create: {
        id: hash(`${phone}:${hour}`),
        attempts: 1,
        expiresAt: new Date((hour + 1) * 3600000),
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    if (limit.attempts > 8) {
      throw new CheckoutError(
        "Too many checkout attempts. Please try again later.",
      );
    }

    const customer = await getCustomer();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const order = await db.$transaction(
          async (tx) => {
            const existing = await tx.order.findUnique({
              where: { checkoutKey },
              include: { items: true },
            });

            if (existing) {
              if (existing.receiptTokenHash !== receiptTokenHash) {
                throw new CheckoutError("Invalid checkout session.");
              }

              return existing;
            }

            const settings = await tx.storeSetting.findUnique({
              where: { id: "main" },
            });

            if (!settings?.codEnabled) {
              throw new CheckoutError("Orders are temporarily unavailable.");
            }

            const variants = await tx.productVariant.findMany({
              where: {
                id: {
                  in: items.map((item) => item.variantId),
                },
                isActive: true,
                product: {
                  is: {
                    status: "ACTIVE",
                    images: { some: {} },
                    category: {
                      is: {
                        isActive: true,
                        OR: [
                          { parentId: null },
                          {
                            parent: {
                              is: { isActive: true },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                price: true,
                stock: true,
                productId: true,
                product: {
                  select: {
                    name: true,
                    images: {
                      orderBy: { sortOrder: "asc" },
                      take: 1,
                      select: { url: true },
                    },
                  },
                },
              },
            });

            const byId = new Map(
              variants.map((variant) => [variant.id, variant]),
            );

            let subtotal = new Prisma.Decimal(0);

            const orderItems = items.map((item) => {
              const variant = byId.get(item.variantId);

              if (!variant || variant.stock < item.quantity) {
                throw new CheckoutError(
                  "An item is unavailable or its stock has changed. Review your bag.",
                );
              }

              const lineTotal = variant.price.mul(item.quantity);
              subtotal = subtotal.add(lineTotal);

              return {
                productId: variant.productId,
                variantId: variant.id,
                productName: variant.product.name,
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                imageUrl: variant.product.images[0]?.url ?? null,
                quantity: item.quantity,
                unitPrice: variant.price,
                lineTotal,
              };
            });

            const deliveryFee =
              deliveryZone === "DHAKA"
                ? settings.dhakaDeliveryCharge
                : settings.outsideDeliveryCharge;

            const coupon = couponCode
              ? await tx.coupon.findUnique({
                  where: { code: couponCode },
                })
              : null;

            if (couponCode && !coupon) {
              throw new CheckoutError("Coupon code is invalid.");
            }

            const discount = coupon
              ? calculateCouponDiscount(coupon, subtotal, new Date())
              : new Prisma.Decimal(0);

            const total = subtotal.sub(discount).add(deliveryFee);

            if (!total.eq(new Prisma.Decimal(expectedTotal))) {
              throw new CheckoutError(
                "Pricing or delivery charges changed. Refresh checkout and review the updated total before ordering.",
              );
            }

            if (coupon) {
              const claimed = await tx.coupon.updateMany({
                where: {
                  id: coupon.id,
                  isActive: true,
                  ...(coupon.usageLimit !== null
                    ? {
                        usedCount: {
                          lt: coupon.usageLimit,
                        },
                      }
                    : {}),
                },
                data: {
                  usedCount: { increment: 1 },
                },
              });

              if (claimed.count !== 1) {
                throw new CheckoutError(
                  "This coupon is no longer available. Review your total.",
                );
              }
            }

            for (const item of items) {
              const changed = await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,
                  isActive: true,
                  stock: { gte: item.quantity },
                },
                data: {
                  stock: { decrement: item.quantity },
                },
              });

              if (changed.count !== 1) {
                throw new CheckoutError(
                  "Stock changed while placing your order. Review your bag.",
                );
              }
            }

            return tx.order.create({
              data: {
                orderNumber: `BL-${randomBytes(6).toString("hex").toUpperCase()}`,
                checkoutKey,
                receiptTokenHash,
                customerId: customer?.id ?? null,
                customerName,
                phone,
                email: email || null,
                district,
                address,
                notes: notes || null,
                deliveryZone,
                subtotal,
                deliveryFee,
                discount,
                couponCode,
                couponId: coupon?.id ?? null,
                total,
                items: {
                  create: orderItems,
                },
              },
              include: { items: true },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 15000,
          },
        );

        await grantReceiptAccess(order.id, receiptSecret);

        revalidatePath("/admin");
        revalidatePath("/admin/products");
        revalidatePath("/shop");
        revalidatePath("/");

        return {
          ok: true,
          orderId: order.id,
          items: order.items.flatMap((item) =>
            item.variantId
              ? [
                  {
                    variantId: item.variantId,
                    quantity: item.quantity,
                  },
                ]
              : [],
          ),
        };
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2002");

        if (retryable && attempt < 2) {
          continue;
        }

        throw error;
      }
    }

    throw new CheckoutError("Please try checkout again.");
  } catch (error) {
    return {
      ok: false,
      error:
       error instanceof CheckoutError ||
error instanceof CouponValidationError
  ? error.message
  : "Could not complete checkout. Please retry from this page."
    };
  }
}
