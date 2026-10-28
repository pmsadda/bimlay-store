"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  createAdminSession,
  deleteAdminSession,
} from "@/lib/admin-auth";

export type LoginState = {
  error: string;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

// Nonexistent accounts still perform a password hash check.
const DUMMY_HASH = [
  "scrypt",
  "131072",
  "8",
  "1",
  "0".repeat(32),
  "0".repeat(128),
].join("$");

export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string"
  ) {
    return { error: "Enter your email and password." };
  }

  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 1 ||
    password.length > 128
  ) {
    return { error: "Email or password is incorrect." };
  }

  try {
    const windowNumber = Math.floor(Date.now() / WINDOW_MS);

    const limitId = createHash("sha256")
      .update(`${email}:${windowNumber}`)
      .digest("hex");

    const limit = await db.adminLoginLimit.upsert({
      where: { id: limitId },
      create: {
        id: limitId,
        attempts: 1,
        expiresAt: new Date((windowNumber + 1) * WINDOW_MS),
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    if (limit.attempts > MAX_ATTEMPTS) {
      return {
        error: "Too many login attempts. Try again after 15 minutes.",
      };
    }

    const admin = await db.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    const validPassword = await verifyPassword(
      password,
      admin?.passwordHash ?? DUMMY_HASH,
    );

    if (!admin || !admin.isActive || !validPassword) {
      return { error: "Email or password is incorrect." };
    }

    await db.adminLoginLimit.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });

    await createAdminSession(admin.id);
  } catch {
    return {
      error: "Login is temporarily unavailable. Please try again.",
    };
  }

  // redirect must stay outside the try/catch.
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await deleteAdminSession();
  redirect("/admin/login");
}