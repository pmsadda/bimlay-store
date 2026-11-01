import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/customer-auth";
import { getStoreCategories } from "@/lib/catalog";
import { label } from "@/lib/order-rules";
import Storefront from "@/components/storefront";

export const metadata: Metadata = {
  title: "Order Details",
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

async function OrderContent({ params }: Props) {
  await connection();

  const customer = await requireCustomer();
  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  const order = await db.order.findFirst({
    where: {
      id,
      customerId: customer.id,
    },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      phone: true,
      address: true,
      district: true,
      notes: true,
      subtotal: true,
      deliveryFee: true,
      discount: true,
      couponCode: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          size: true,
          color: true,
          imageUrl: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const categories = await getStoreCategories();

  return (
    <Storefront mode="account" categories={categories} products={[]}>
      <section className="shell customer-account">
        <Link href="/account" className="text-link">
          Back to your orders
        </Link>

        <div className="cart-heading account-settings-heading">
          <p className="eyebrow">Your order</p>
          <h1>{order.orderNumber}</h1>

          <p>
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Dhaka",
            }).format(order.createdAt)}
          </p>

          <p>
            Status: <strong>{label(order.status)}</strong>
          </p>
        </div>

        <div className="customer-settings-grid">
          <section className="customer-settings-card">
            <h2>Delivery details</h2>
            <p>
              <strong>{order.customerName}</strong>
            </p>
            <p>{order.phone}</p>
            <p className="order-address">{order.address}</p>
            <p>{order.district}</p>

            {order.notes && (
              <>
                <h3>Order notes</h3>
                <p className="order-address">{order.notes}</p>
              </>
            )}

            <p className="category-help">Payment: Cash on Delivery</p>

            <p className="category-help">
              Payment status: {label(order.paymentStatus)}
            </p>
          </section>

          <section className="cart-summary">
            <h2>Order summary</h2>

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
          </section>
        </div>

        <section className="customer-settings-card customer-order-items">
          <h2>Ordered items</h2>

          {order.items.map((item) => (
            <article key={item.id} className="customer-order-item">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  width={75}
                  height={90}
                  unoptimized
                />
              )}

              <div>
                <h3>{item.productName}</h3>

                <p className="category-help">
                  {[item.size, item.color].filter(Boolean).join(" / ") ||
                    "Standard"}
                </p>

                <p className="category-help">SKU: {item.sku}</p>

                <p className="category-help">
                  Qty {item.quantity} × {money(item.unitPrice.toFixed(2))}
                </p>
              </div>

              <strong>{money(item.lineTotal.toFixed(2))}</strong>
            </article>
          ))}
        </section>
      </section>
    </Storefront>
  );
}

export default function CustomerOrderPage(props: Props) {
  return (
    <Suspense
      fallback={<div className="store-loading">Opening order details...</div>}
    >
      <OrderContent {...props} />
    </Suspense>
  );
}
