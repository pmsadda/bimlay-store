import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/customer-auth";
import { getStoreCategories } from "@/lib/catalog";
import { label } from "@/lib/order-rules";
import Storefront from "@/components/storefront";
import { logoutCustomer } from "./actions";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function AccountContent({ searchParams }: Props) {
  await connection();

  const customer = await requireCustomer();
  const params = await searchParams;

  const rawPage = Number(typeof params.page === "string" ? params.page : "1");

  const requestedPage =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  // Never query orders by an email supplied by the browser.
  const where = { customerId: customer.id };

  const [categories, total] = await Promise.all([
    getStoreCategories(),
    db.order.count({ where }),
  ]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const orders = await db.order.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
    },
  });

  return (
    <Storefront mode="account" categories={categories} products={[]}>
      <section className="shell customer-account">
        <header className="customer-account-heading">
          <div>
            <p className="eyebrow">Your personal space</p>
            <h1>Hello, {customer.name}.</h1>
            <p>{customer.email}</p>
          </div>

          <div className="customer-account-actions">
            <Link href="/account/profile" className="product-small-button">
              Account settings
            </Link>

            <form action={logoutCustomer}>
              <button type="submit" className="product-small-button">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="customer-orders">
          <div className="section-heading">
            <h2>Your orders</h2>
            <span className="category-help">{total} total</span>
          </div>

          {orders.length === 0 ? (
            <div className="store-empty">
              <p>No orders yet.</p>
              <p>Orders placed while signed in will appear here.</p>
              <Link href="/shop" className="primary-button">
                Explore the collection
              </Link>
            </div>
          ) : (
            <div className="customer-order-list">
              {orders.map((order) => (
                <article className="customer-order-card" key={order.id}>
                  <div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="customer-order-link"
                    >
                      {order.orderNumber}
                    </Link>
                    <p>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeZone: "Asia/Dhaka",
                      }).format(order.createdAt)}
                    </p>
                  </div>

                  <div>
                    <span className="category-status">
                      {label(order.status)}
                    </span>
                    <p>Payment: {label(order.paymentStatus)}</p>
                  </div>

                  <strong>৳ {order.total.toFixed(2)}</strong>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="store-pagination" aria-label="Your order pages">
              {page > 1 && (
                <Link href={`/account?page=${page - 1}`}>Previous</Link>
              )}

              <span>
                Page {page} of {totalPages}
              </span>

              {page < totalPages && (
                <Link href={`/account?page=${page + 1}`}>Next</Link>
              )}
            </nav>
          )}
        </section>
      </section>
    </Storefront>
  );
}

export default function CustomerAccountPage(props: Props) {
  return (
    <Suspense
      fallback={<div className="store-loading">Opening your account...</div>}
    >
      <AccountContent {...props} />
    </Suspense>
  );
}
