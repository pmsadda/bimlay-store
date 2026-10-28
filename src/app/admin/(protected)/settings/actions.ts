"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type SettingsState = {
  error: string;
  success: string;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string): SettingsState {
  return { error, success: "" };
}

function parseCharge(value: string): Prisma.Decimal | null {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const amount = new Prisma.Decimal(value);

  if (amount.lt(0) || amount.gt(1000000)) {
    return null;
  }

  return amount;
}

function normalizeWhatsApp(value: string): string {
  const digits = value
    .replace(/[০-৯]/g, (digit) =>
      String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
    )
    .replace(/[\s()+-]/g, "");

  return digits.startsWith("01") ? `88${digits}` : digits;
}

function normalizeFacebook(value: string): string | null {
  if (!value) return "";

  if (value.length > 500) return null;

  try {
    const url = new URL(value);

    const allowedHosts = new Set([
      "facebook.com",
      "www.facebook.com",
      "m.facebook.com",
      "fb.com",
      "www.fb.com",
    ]);

    if (
      url.protocol !== "https:" ||
      !allowedHosts.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

export async function saveStoreSettings(
  _previousState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return fail("Only the owner can change store settings.");
  }

  const storeName = text(formData, "storeName");

  const supportPhone = text(formData, "supportPhone")
    .replace(/[\s()-]/g, "");

  const whatsappNumber = normalizeWhatsApp(
    text(formData, "whatsappNumber"),
  );

  const facebookPageUrl = normalizeFacebook(
    text(formData, "facebookPageUrl"),
  );

  const supportEmail = text(formData, "supportEmail");

  const dhakaDeliveryCharge = parseCharge(
    text(formData, "dhakaDeliveryCharge"),
  );

  const outsideDeliveryCharge = parseCharge(
    text(formData, "outsideDeliveryCharge"),
  );

  const codEnabled = formData.get("codEnabled") === "on";

  if (storeName.length < 2 || storeName.length > 100) {
    return fail("Store name must contain 2 to 100 characters.");
  }

  if (supportPhone && !/^\+?\d{7,15}$/.test(supportPhone)) {
    return fail("Enter a valid support phone number or leave it empty.");
  }

  if (
    whatsappNumber &&
    !/^8801[3-9]\d{8}$/.test(whatsappNumber)
  ) {
    return fail(
      "Enter a valid Bangladesh WhatsApp number starting with 01 or 8801.",
    );
  }

  if (facebookPageUrl === null) {
    return fail(
      "Enter a complete HTTPS Facebook page link, or leave it empty.",
    );
  }

  if (
    supportEmail &&
    (
      supportEmail.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supportEmail)
    )
  ) {
    return fail("Enter a valid support email or leave it empty.");
  }

  if (!dhakaDeliveryCharge || !outsideDeliveryCharge) {
    return fail(
      "Enter valid delivery charges from 0 to 1000000, with up to 2 decimal places.",
    );
  }

  const data = {
    storeName,
    supportPhone: supportPhone || null,
    whatsappNumber: whatsappNumber || null,
    facebookPageUrl: facebookPageUrl || null,
    supportEmail: supportEmail || null,
    dhakaDeliveryCharge,
    outsideDeliveryCharge,
    codEnabled,
  };

  try {
    await db.storeSetting.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        ...data,
      },
      update: data,
    });
  } catch {
    return fail("Could not save settings. Please try again.");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");

  return {
    error: "",
    success: "Store settings saved successfully.",
  };
}