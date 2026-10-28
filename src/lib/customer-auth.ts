import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "bimlay_customer_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCustomerSession(
  customerId: string,
) {
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(COOKIE_NAME)?.value;

  if (previousToken && /^[a-f0-9]{64}$/.test(previousToken)) {
    await db.customerSession.deleteMany({
      where: {
        tokenHash: hashToken(previousToken),
      },
    });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_SECONDS * 1000,
  );

  await db.customerSession.deleteMany({
    where: {
      customerId,
      expiresAt: { lte: new Date() },
    },
  });

  await db.customerSession.create({
    data: {
      customerId,
      tokenHash: hashToken(token),
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

export async function getCustomer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const session = await db.customerSession.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    select: {
      expiresAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    !session.customer.isActive
  ) {
    return null;
  }

  return session.customer;
}

export async function requireCustomer() {
  const customer = await getCustomer();

  if (!customer) {
    redirect("/account/login");
  }

  return customer;
}

export async function deleteCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.customerSession.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}