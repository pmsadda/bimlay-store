import "server-only";

import {
  Prisma,
  type Coupon,
} from "@/generated/prisma/client";

export class CouponValidationError extends Error {}

export function normalizeCouponCode(value: unknown): string {
  if (typeof value !== "string") {
    throw new CouponValidationError("Enter a valid coupon code.");
  }

  const code = value.trim().toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
    throw new CouponValidationError(
      "Coupon code must be 3 to 32 English letters, numbers, hyphens or underscores.",
    );
  }

  return code;
}

type CouponForDiscount = Pick<
  Coupon,
  | "isActive"
  | "kind"
  | "value"
  | "minimumSubtotal"
  | "maximumDiscount"
  | "usageLimit"
  | "usedCount"
  | "startsAt"
  | "expiresAt"
>;

export function calculateCouponDiscount(
  coupon: CouponForDiscount,
  subtotal: Prisma.Decimal,
  now: Date,
): Prisma.Decimal {
  if (!coupon.isActive) {
    throw new CouponValidationError(
      "This coupon is not available.",
    );
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    throw new CouponValidationError(
      "This coupon is not active yet.",
    );
  }

  if (coupon.expiresAt && now >= coupon.expiresAt) {
    throw new CouponValidationError(
      "This coupon has expired.",
    );
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new CouponValidationError(
      "This coupon has reached its usage limit.",
    );
  }

  if (subtotal.lt(coupon.minimumSubtotal)) {
    throw new CouponValidationError(
      `This coupon needs a minimum subtotal of ৳${coupon.minimumSubtotal.toFixed(2)}.`,
    );
  }

  if (
    coupon.value.lte(0) ||
    (coupon.kind === "PERCENT" && coupon.value.gt(100))
  ) {
    throw new CouponValidationError(
      "This coupon is not configured correctly.",
    );
  }

  let discount =
    coupon.kind === "PERCENT"
      ? subtotal.mul(coupon.value).div(100)
      : coupon.value;

  if (
    coupon.maximumDiscount &&
    discount.gt(coupon.maximumDiscount)
  ) {
    discount = coupon.maximumDiscount;
  }

  if (discount.gt(subtotal)) {
    discount = subtotal;
  }

  return discount.toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}