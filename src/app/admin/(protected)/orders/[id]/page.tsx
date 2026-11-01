import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { label } from "@/lib/order-rules";
import OrderControls from "../order-controls";

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(value);
}

export default async function AdminOrderDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const admin = await requireAdmin();
  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      audits: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Order details</p>
        <h1>{order.orderNumber}</h1>
        <p>Placed {dateLabel(order.createdAt)} — Bangladesh time</p>
      </section>

      <Link
        href="/admin/orders"
        className="product-small-button product-new-link"
      >
        Back to orders
      </Link>

      <Link
        href={`/admin/orders/${order.id}/invoice`}
        className="product-small-button product-new-link"
      >
        View / print invoice
      </Link>

      <div className="order-detail-grid">
        <section className="category-panel">
          <h2>Customer & delivery</h2>
          <p>
            <strong>{order.customerName}</strong>
          </p>
          <p>{order.phone}</p>
          {order.email && <p>{order.email}</p>}
          <p className="order-address">{order.address}</p>
          <p>{order.district}</p>
          <p>Delivery area: {label(order.deliveryZone)}</p>

          {order.notes && (
            <>
              <h3>Customer notes</h3>
              <p className="order-address">{order.notes}</p>
            </>
          )}
        </section>

        <section className="category-panel">
          <h2>Order summary</h2>

          <div className="order-summary-line">
            <span>Status</span>
            <strong>{label(order.status)}</strong>
          </div>

          <div className="order-summary-line">
            <span>Payment method</span>
            <strong>Cash on Delivery</strong>
          </div>

          <div className="order-summary-line">
            <span>Payment status</span>
            <strong>{label(order.paymentStatus)}</strong>
          </div>

          <div className="order-summary-line">
            <span>Subtotal</span>
            <strong>৳ {order.subtotal.toFixed(2)}</strong>
          </div>

          <div className="order-summary-line">
            <span>Delivery</span>
            <strong>৳ {order.deliveryFee.toFixed(2)}</strong>
          </div>

          {order.discount.gt(0) && (
            <div className="order-summary-line checkout-discount">
              <span>
                Coupon
                {order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <strong>−৳ {order.discount.toFixed(2)}</strong>
            </div>
          )}

          <div className="order-summary-line">
            <span>Total</span>
            <strong>৳ {order.total.toFixed(2)}</strong>
          </div>

          {order.stockReleasedAt && (
            <p className="category-help">
              Stock restoration processed on {dateLabel(order.stockReleasedAt)}.
              See history for restored quantities.
            </p>
          )}

          {order.paymentStatus === "PAID" &&
            (order.status === "CANCELLED" || order.status === "RETURNED") && (
              <p className="cart-item-issue">
                Payment is still marked Paid. Review whether a refund is due.
              </p>
            )}
        </section>
      </div>

      <section className="category-panel">
        <h2>Ordered items</h2>

        {order.items.map((item) => (
          <article className="order-item-row" key={item.id}>
            {item.imageUrl && (
              <Image
                src={item.imageUrl}
                alt={item.productName}
                width={70}
                height={85}
                unoptimized
              />
            )}

            <div className="order-item-copy">
              <h3>{item.productName}</h3>
              <p className="category-help">
                {item.sku} ·{" "}
                {[item.size, item.color].filter(Boolean).join(" / ") ||
                  "Standard"}
              </p>
              <p className="category-help">
                Qty {item.quantity} × ৳ {item.unitPrice.toFixed(2)}
              </p>
            </div>

            <strong>৳ {item.lineTotal.toFixed(2)}</strong>
          </article>
        ))}
      </section>

      {admin.role === "OWNER" && (
        <OrderControls
          key={`${order.status}-${order.paymentStatus}`}
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
        />
      )}

      <section className="category-panel">
        <h2>Order history</h2>

        {order.audits.map((audit) => (
          <article className="order-audit" key={audit.id}>
            <strong>
              {label(audit.event)}: {label(audit.fromValue)}
              {" → "}
              {label(audit.toValue)}
            </strong>

            <p className="category-help">
              {audit.actorEmail} · {dateLabel(audit.createdAt)}
            </p>

            {audit.note && <p className="order-address">{audit.note}</p>}
          </article>
        ))}

        <article className="order-audit">
          <strong>Order placed</strong>
          <p className="category-help">{dateLabel(order.createdAt)}</p>
        </article>
      </section>
    </>
  );
}
