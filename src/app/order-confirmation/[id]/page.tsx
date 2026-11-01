import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

import { db } from "@/lib/db";
import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

async function ConfirmationContent({ params }: Props) {
  await connection();

  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  const cookieStore = await cookies();
  const receipt = cookieStore.get("bimlay_order_receipt")?.value;
  const [receiptOrderId, secret] = (receipt ?? "").split(":");

  if (receiptOrderId !== id || !secret || !/^[a-f0-9]{64}$/.test(secret)) {
    notFound();
  }

  const receiptTokenHash = createHash("sha256").update(secret).digest("hex");

  const order = await db.order.findFirst({
    where: {
      id,
      receiptTokenHash,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  const categories = await getStoreCategories();

  return (
    <Storefront mode="checkout" categories={categories} products={[]}>
      <section className="shell checkout-page">
        <div className="order-received-heading">
          <CheckCircle2 size={42} strokeWidth={1.3} />
          <p className="eyebrow">Thank you for choosing BIMLAY</p>
          <h1>Your order has been received.</h1>
          <p>
            Order number: <strong>{order.orderNumber}</strong>
          </p>
          <p>Status: {order.status.replaceAll("_", " ")}</p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-fields">
            <h2>Delivery details</h2>
            <p>
              <strong>{order.customerName}</strong>
            </p>
            <p>{order.phone}</p>
            <p className="order-address">{order.address}</p>
            <p>{order.district}</p>

            {order.notes && (
              <>
                <h2>Order notes</h2>
                <p className="order-address">{order.notes}</p>
              </>
            )}

            <p className="category-help">Payment method: Cash on Delivery</p>
            <p className="category-help">
              Payment status: {order.paymentStatus}
            </p>
          </section>

          <aside className="cart-summary">
            <h2>Order summary</h2>

            {order.items.map((item) => (
              <div className="checkout-order-line" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <p>
                    {[item.size, item.color].filter(Boolean).join(" / ") ||
                      "Standard"}
                    {" · "}Qty {item.quantity}
                  </p>
                </div>
                <span>{money(item.lineTotal.toFixed(2))}</span>
              </div>
            ))}

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <strong>{money(order.subtotal.toFixed(2))}</strong>
            </div>

            <div className="cart-summary-row">
              <span>Delivery</span>
              <strong>{money(order.deliveryFee.toFixed(2))}</strong>
            </div>

            {order.discount.gt(0) && (
              <div className="cart-summary-row checkout-discount">
                <span>
                  Coupon
                  {order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
                <strong>−{money(order.discount.toFixed(2))}</strong>
              </div>
            )}

            <div className="cart-summary-row checkout-total">
              <strong>Total</strong>
              <strong>{money(order.total.toFixed(2))}</strong>
            </div>
          </aside>
        </div>

        <Link href="/shop" className="primary-button order-continue">
          Continue shopping
        </Link>
      </section>
    </Storefront>
  );
}

export default function OrderConfirmationPage(props: Props) {
  return (
    <Suspense
      fallback={<div className="store-loading">Opening your order...</div>}
    >
      <ConfirmationContent {...props} />
    </Suspense>
  );
}
