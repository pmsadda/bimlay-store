import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { label } from "@/lib/order-rules";
import PrintInvoiceButton from "@/components/print-invoice-button";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: { toFixed: (digits: number) => string }) {
  return `৳ ${value.toFixed(2)}`;
}

async function InvoiceContent({ params }: Props) {
  await connection();
  await requireAdmin();

  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

  const settings = await db.storeSetting.findUnique({
    where: { id: "main" },
    select: {
      storeName: true,
      supportPhone: true,
      supportEmail: true,
    },
  });

  const placedAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(order.createdAt);

  return (
    <div className="invoice-page">
      <div className="invoice-actions">
        <Link
          href={`/admin/orders/${order.id}`}
          className="product-small-button"
        >
          Back to order
        </Link>
        <PrintInvoiceButton />
      </div>

      <article className="invoice-paper">
        <header className="invoice-header">
          <div>
            <p className="invoice-kicker">Order invoice</p>
            <h1>{settings?.storeName || "BIMLAY"}</h1>
            <p>Bimlay.com</p>
          </div>

          <div className="invoice-header-meta">
            <strong>{order.orderNumber}</strong>
            <span>{placedAt} · Bangladesh time</span>
          </div>
        </header>

        <div className="invoice-details">
          <section>
            <h2>Deliver to</h2>
            <strong>{order.customerName}</strong>
            <p>{order.phone}</p>
            {order.email && <p>{order.email}</p>}
            <p>{order.address}</p>
            <p>{order.district}</p>
          </section>

          <section>
            <h2>Order details</h2>
            <p>Status: {label(order.status)}</p>
            <p>Payment: Cash on Delivery</p>
            <p>Payment status: {label(order.paymentStatus)}</p>
            {settings?.supportPhone && (
              <p>Support: {settings.supportPhone}</p>
            )}
            {settings?.supportEmail && (
              <p>{settings.supportEmail}</p>
            )}
          </section>
        </div>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.productName}</strong>
                    <small>
                      {item.sku}
                      {[item.size, item.color].filter(Boolean).length > 0 &&
                        ` · ${[item.size, item.color]
                          .filter(Boolean)
                          .join(" / ")}`}
                    </small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPrice)}</td>
                  <td>{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-totals">
          <div>
            <span>Subtotal</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>{money(order.deliveryFee)}</strong>
          </div>
          {order.discount.gt(0) && (
            <div>
              <span>
                Discount
                {order.couponCode && ` (${order.couponCode})`}
              </span>
              <strong>−{money(order.discount)}</strong>
            </div>
          )}
          <div className="invoice-grand-total">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>

        {order.notes && (
          <div className="invoice-note">
            <strong>Customer note</strong>
            <p>{order.notes}</p>
          </div>
        )}

        <footer className="invoice-footer">
          Order details and payment status are shown as recorded by BIMLAY.
        </footer>
      </article>
    </div>
  );
}

export default function InvoicePage(props: Props) {
  return (
    <Suspense fallback={<div className="admin-loading">Opening invoice...</div>}>
      <InvoiceContent {...props} />
    </Suspense>
  );
}