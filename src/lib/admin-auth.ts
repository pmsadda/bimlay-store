import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "bimlay_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const cookieStore = await cookies();

  const previousToken = cookieStore.get(COOKIE_NAME)?.value;

  if (previousToken && /^[a-f0-9]{64}$/.test(previousToken)) {
    await db.adminSession.deleteMany({
      where: {
        tokenHash: tokenHash(previousToken),
      },
    });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_SECONDS * 1000,
  );

  await db.adminSession.deleteMany({
    where: {
      adminId,
      expiresAt: { lte: new Date() },
    },
  });

  await db.adminSession.create({
    data: {
      adminId,
      tokenHash: tokenHash(token),
      expiresAt,
    },
  });

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
    expires: expiresAt,
  });
}

export async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const session = await db.adminSession.findUnique({
    where: {
      tokenHash: tokenHash(token),
    },
    select: {
      expiresAt: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    !session.admin.isActive
  ) {
    return null;
  }

  return session.admin;
}

export async function requireAdmin() {
  const admin = await getAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function deleteAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.adminSession.deleteMany({
      where: {
        tokenHash: tokenHash(token),
      },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}