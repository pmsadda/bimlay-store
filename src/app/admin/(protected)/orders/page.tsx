import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  isOrderState,
  label,
  ORDER_STATUSES,
} from "@/lib/order-rules";

type SearchValues = Record<
  string,
  string | string[] | undefined
>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const query = single(params.q).trim().slice(0, 100);
  const status = single(params.status);
  const rawPage = Number(single(params.page) || "1");

  const requestedPage =
    Number.isSafeInteger(rawPage) && rawPage > 0
      ? rawPage
      : 1;

  const where: Prisma.OrderWhereInput = {};

  if (isOrderState(status)) {
    where.status = status;
  }

  if (query) {
    where.OR = [
      {
        orderNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        customerName: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: query,
        },
      },
    ];
  }

  const total = await db.order.count({ where });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const orders = await db.order.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      phone: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  function pageHref(target: number) {
    const values = new URLSearchParams();

    if (query) values.set("q", query);
    if (isOrderState(status)) values.set("status", status);
    values.set("page", String(target));

    return `/admin/orders?${values.toString()}`;
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Sales workspace</p>
        <h1>Orders</h1>
        <p>{total} matching orders.</p>
      </section>

      <form
        action="/admin/orders"
        method="get"
        className="order-filter"
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Order number, customer name or phone"
          maxLength={100}
          aria-label="Search orders"
        />

        <select
          name="status"
          defaultValue={isOrderState(status) ? status : ""}
          aria-label="Order status"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>

        <button type="submit" className="primary-button">
          Search
        </button>

        <Link href="/admin/orders" className="text-link">
          Reset
        </Link>
      </form>

      {orders.length === 0 ? (
        <section className="category-panel">
          <h2>No orders found.</h2>
          <p className="category-help">
            Orders placed through checkout will appear here.
          </p>
        </section>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-list-card" key={order.id}>
              <div>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="order-number-link"
                >
                  {order.orderNumber}
                </Link>

                <p>{order.customerName}</p>
                <p className="category-help">{order.phone}</p>
              </div>

              <div>
                <span className="category-status">
                  {label(order.status)}
                </span>

                <p className="category-help">
                  Payment: {label(order.paymentStatus)}
                </p>

                <strong>
                  ৳ {order.total.toFixed(2)}
                </strong>
              </div>

              <div>
                <p className="category-help">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dhaka",
                  }).format(order.createdAt)}
                </p>

                <Link
                  href={`/admin/orders/${order.id}`}
                  className="product-small-button"
                >
                  View order
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="store-pagination" aria-label="Order pages">
          {page > 1 && (
            <Link href={pageHref(page - 1)}>Previous</Link>
          )}

          <span>Page {page} of {totalPages}</span>

          {page < totalPages && (
            <Link href={pageHref(page + 1)}>Next</Link>
          )}
        </nav>
      )}
    </>
  );
}