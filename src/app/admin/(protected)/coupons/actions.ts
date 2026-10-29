"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeCouponCode } from "@/lib/coupons";
import { db } from "@/lib/db";

export type CouponFormState = {
  error: string;
  success: string;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: string): Prisma.Decimal | null {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const result = new Prisma.Decimal(value);
  return result.lte(1000000) ? result : null;
}

// Date inputs are interpreted as Bangladesh calendar dates.
function bdDay(value: string, nextDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const check = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(check.getTime()) ||
    check.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00+06:00`);

  if (nextDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

export async function createCoupon(
  _previous: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can manage coupons.",
      success: "",
    };
  }

  let code: string;

  try {
    code = normalizeCouponCode(field(formData, "code"));
  } catch {
    return {
      error: "Use 3–32 English letters, numbers, hyphens or underscores for the code.",
      success: "",
    };
  }

  const kind = field(formData, "kind");
  const value = amount(field(formData, "value"));
  const minimumSubtotal = amount(
    field(formData, "minimumSubtotal"),
  );
  const maximumText = field(formData, "maximumDiscount");
  const maximumDiscount = maximumText
    ? amount(maximumText)
    : null;
  const usageText = field(formData, "usageLimit");
  const usageLimit = usageText ? Number(usageText) : null;
  const startText = field(formData, "startsAt");
  const expiryText = field(formData, "expiresAt");
  const startsAt = startText ? bdDay(startText) : null;
  const expiresAt = expiryText
    ? bdDay(expiryText, true)
    : null;
  const isActive = formData.get("isActive") === "on";

  if (kind !== "PERCENT" && kind !== "FIXED") {
    return { error: "Choose a discount type.", success: "" };
  }

  if (
    !value ||
    value.lte(0) ||
    (kind === "PERCENT" && value.gt(100))
  ) {
    return {
      error:
        kind === "PERCENT"
          ? "Enter a percentage greater than 0 and up to 100."
          : "Enter a fixed discount greater than 0.",
      success: "",
    };
  }

  if (!minimumSubtotal || minimumSubtotal.lt(0)) {
    return {
      error: "Enter a valid minimum subtotal. Use 0 for no minimum.",
      success: "",
    };
  }

  if (
    maximumText &&
    (!maximumDiscount || maximumDiscount.lte(0))
  ) {
    return {
      error: "Enter a valid maximum discount or leave it empty.",
      success: "",
    };
  }

  if (
    usageText &&
    (!/^\d{1,7}$/.test(usageText) ||
      !Number.isSafeInteger(usageLimit) ||
      usageLimit! < 1 ||
      usageLimit! > 1000000)
  ) {
    return {
      error: "Usage limit must be a whole number from 1 to 1000000.",
      success: "",
    };
  }

  if ((startText && !startsAt) || (expiryText && !expiresAt)) {
    return {
      error: "Enter valid start and expiry dates.",
      success: "",
    };
  }

  if (
    startsAt &&
    expiresAt &&
    startsAt.getTime() >= expiresAt.getTime()
  ) {
    return {
      error: "Expiry date must be on or after the start date.",
      success: "",
    };
  }

  try {
    await db.coupon.create({
      data: {
        code,
        kind,
        value,
        minimumSubtotal,
        maximumDiscount,
        usageLimit,
        startsAt,
        expiresAt,
        isActive,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "This coupon code already exists.",
        success: "",
      };
    }

    return {
      error: "Could not create the coupon. Please try again.",
      success: "",
    };
  }

  revalidatePath("/admin/coupons");

  return {
    error: "",
    success: `Coupon ${code} created.`,
  };
}

export async function toggleCoupon(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") return;

  const id = field(formData, "id");
  if (!id || id.length > 100) return;

  const coupon = await db.coupon.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!coupon) return;

  await db.coupon.updateMany({
    where: { id, isActive: coupon.isActive },
    data: { isActive: !coupon.isActive },
  });

  revalidatePath("/admin/coupons");
}