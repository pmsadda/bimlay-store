"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

import {
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import {
  createCustomerSession,
  deleteCustomerSession,
  requireCustomer,
} from "@/lib/customer-auth";

import { revalidatePath } from "next/cache";

export type CustomerAuthState = {
  error: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function passwordValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validEmail(email: string) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

async function allowAttempt(
  email: string,
  purpose: "login" | "register",
) {
  const windowMs = 15 * 60 * 1000;
  const windowNumber = Math.floor(Date.now() / windowMs);

  const id = createHash("sha256")
    .update(`customer:${purpose}:${email}:${windowNumber}`)
    .digest("hex");

  const limit = await db.customerAuthLimit.upsert({
    where: { id },
    create: {
      id,
      attempts: 1,
      expiresAt: new Date((windowNumber + 1) * windowMs),
    },
    update: {
      attempts: { increment: 1 },
    },
  });

  return limit.attempts <= (purpose === "login" ? 8 : 5);
}

export async function registerCustomer(
  _previousState: CustomerAuthState,
  formData: FormData,
): Promise<CustomerAuthState> {
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = passwordValue(formData, "password");
  const confirmation = passwordValue(
    formData,
    "confirmPassword",
  );

  if (name.length < 2 || name.length > 100) {
    return { error: "Enter a name containing 2 to 100 characters." };
  }

  if (!validEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 12 || password.length > 128) {
    return { error: "Password must contain 12 to 128 characters." };
  }

  if (password !== confirmation) {
    return { error: "Passwords do not match." };
  }

  try {
    if (!(await allowAttempt(email, "register"))) {
      return {
        error: "Too many attempts. Try again after 15 minutes.",
      };
    }

    const existing = await db.customer.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        error: "Registration is unavailable for this email. Try signing in.",
      };
    }

    const passwordHash = await hashPassword(password);

    const customer = await db.customer.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: { id: true },
    });

    await createCustomerSession(customer.id);
  } catch {
    return {
      error: "Could not finish registration. If you already registered, try signing in.",
    };
  }

  redirect("/account");
}

const DUMMY_HASH = [
  "scrypt",
  "131072",
  "8",
  "1",
  "0".repeat(32),
  "0".repeat(128),
].join("$");

export async function loginCustomer(
  _previousState: CustomerAuthState,
  formData: FormData,
): Promise<CustomerAuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = passwordValue(formData, "password");

  if (
    !validEmail(email) ||
    password.length < 1 ||
    password.length > 128
  ) {
    return { error: "Email or password is incorrect." };
  }

  try {
    if (!(await allowAttempt(email, "login"))) {
      return {
        error: "Too many attempts. Try again after 15 minutes.",
      };
    }

    const customer = await db.customer.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    const valid = await verifyPassword(
      password,
      customer?.passwordHash ?? DUMMY_HASH,
    );

    if (!customer || !customer.isActive || !valid) {
      return { error: "Email or password is incorrect." };
    }

    await createCustomerSession(customer.id);

    await db.customerAuthLimit.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });
  } catch {
    return {
      error: "Sign in is temporarily unavailable. Please try again.",
    };
  }

  redirect("/account");
}

export async function logoutCustomer(): Promise<void> {
  await deleteCustomerSession();
  redirect("/account/login");
}

export type CustomerProfileState = {
  error: string;
  success: string;
};

export async function updateCustomerProfile(
  _previousState: CustomerProfileState,
  formData: FormData,
): Promise<CustomerProfileState> {
  const customer = await requireCustomer();
  const name = text(formData, "name");

  if (name.length < 2 || name.length > 100) {
    return {
      error: "Name must contain 2 to 100 characters.",
      success: "",
    };
  }

  try {
    const result = await db.customer.updateMany({
      where: {
        id: customer.id,
        isActive: true,
      },
      data: { name },
    });

    if (result.count !== 1) {
      return {
        error: "Your account is unavailable. Please sign in again.",
        success: "",
      };
    }
  } catch {
    return {
      error: "Could not save your profile. Please try again.",
      success: "",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");

  return {
    error: "",
    success: "Your profile has been updated.",
  };
}

export async function changeCustomerPassword(
  _previousState: CustomerAuthState,
  formData: FormData,
): Promise<CustomerAuthState> {
  const customer = await requireCustomer();

  const currentPassword = passwordValue(
    formData,
    "currentPassword",
  );

  const newPassword = passwordValue(
    formData,
    "newPassword",
  );

  const confirmation = passwordValue(
    formData,
    "confirmPassword",
  );

  if (
    currentPassword.length < 1 ||
    currentPassword.length > 128
  ) {
    return { error: "Enter your current password." };
  }

  if (newPassword.length < 12 || newPassword.length > 128) {
    return {
      error: "New password must contain 12 to 128 characters.",
    };
  }

  if (newPassword !== confirmation) {
    return { error: "New passwords do not match." };
  }

  if (newPassword === currentPassword) {
    return {
      error: "Choose a password different from your current password.",
    };
  }

  try {
    const windowMs = 15 * 60 * 1000;
    const windowNumber = Math.floor(Date.now() / windowMs);

    const limitId = createHash("sha256")
      .update(`customer:password:${customer.id}:${windowNumber}`)
      .digest("hex");

    const limit = await db.customerAuthLimit.upsert({
      where: { id: limitId },
      create: {
        id: limitId,
        attempts: 1,
        expiresAt: new Date((windowNumber + 1) * windowMs),
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    if (limit.attempts > 5) {
      return {
        error: "Too many attempts. Try again after 15 minutes.",
      };
    }

    const account = await db.customer.findUnique({
      where: { id: customer.id },
      select: {
        passwordHash: true,
        isActive: true,
      },
    });

    if (!account?.isActive) {
      return {
        error: "Your account is unavailable. Please sign in again.",
      };
    }

    const valid = await verifyPassword(
      currentPassword,
      account.passwordHash,
    );

    if (!valid) {
      return { error: "Your current password is incorrect." };
    }

    const newHash = await hashPassword(newPassword);

    await db.$transaction(async (tx) => {
      const changed = await tx.customer.updateMany({
        where: {
          id: customer.id,
          isActive: true,
          passwordHash: account.passwordHash,
        },
        data: {
          passwordHash: newHash,
        },
      });

      if (changed.count !== 1) {
        throw new Error("Account changed during password update.");
      }

      await tx.customerSession.deleteMany({
        where: { customerId: customer.id },
      });
    });
  } catch {
    return {
      error: "Could not change your password. Please sign in again or retry.",
    };
  }

  await deleteCustomerSession();
  redirect("/account/login");
}