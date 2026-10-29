"use server";

import { quoteCart } from "@/app/actions/cart";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  calculateCouponDiscount,
  CouponValidationError,
  normalizeCouponCode,
} from "@/lib/coupons";

export type CouponQuoteResult =
  | {
      ok: true;
      code: string;
      subtotal: string;
      discount: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function quoteCheckoutCoupon(
  items: unknown,
  inputCode: unknown,
): Promise<CouponQuoteResult> {
  try {
    const code = normalizeCouponCode(inputCode);
    const quote = await quoteCart(items);

    if (!quote.ok) {
      return { ok: false, error: quote.error };
    }

    if (quote.lines.length === 0 || quote.hasIssues) {
      return {
        ok: false,
        error: "Review your bag before applying a coupon.",
      };
    }

    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return {
        ok: false,
        error: "Coupon code is invalid.",
      };
    }

    const subtotal = new Prisma.Decimal(quote.subtotal);

    const discount = calculateCouponDiscount(
      coupon,
      subtotal,
      new Date(),
    );

    return {
      ok: true,
      code,
      subtotal: quote.subtotal,
      discount: discount.toFixed(2),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CouponValidationError
          ? error.message
          : "Could not check this coupon. Please try again.",
    };
  }
}
