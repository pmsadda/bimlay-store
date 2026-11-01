import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Zap } from "lucide-react";

export default async function FlashSalesPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can view flash sales.</p>
      </section>
    );
  }

  const now = new Date();

  const products = await db.product.findMany({
    where: {
      variants: {
        some: {
          isActive: true,
          flashPrice: { not: null },
          flashSaleEnd: { gt: now },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      category: { select: { name: true } },
      variants: {
        where: {
          isActive: true,
          flashPrice: { not: null },
          flashSaleEnd: { gt: now },
        },
        orderBy: { flashSaleEnd: "asc" },
        select: {
          id: true,
          sku: true,
          price: true,
          flashPrice: true,
          flashSaleEnd: true,
          stock: true,
        },
      },
    },
  });

  const totalVariants = products.reduce(
    (sum, p) => sum + p.variants.length,
    0,
  );

  const endingSoon = products.reduce(
    (sum, p) =>
      sum +
      p.variants.filter(
        (v) =>
          v.flashSaleEnd &&
          v.flashSaleEnd.getTime() - now.getTime() <
            24 * 60 * 60 * 1000,
      ).length,
    0,
  );

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Live promotions</p>
        <h1>⚡ Flash Sales</h1>
        <p>All products currently running flash sales.</p>
      </section>

      <section className="admin-stat-grid">
        <article className="admin-stat">
          <Zap size={23} strokeWidth={1.5} />
          <span>Active flash products</span>
          <strong>{products.length}</strong>
        </article>

        <article className="admin-stat">
          <Zap size={23} strokeWidth={1.5} />
          <span>Active flash variants</span>
          <strong>{totalVariants}</strong>
        </article>

        <article className="admin-stat">
          <Zap size={23} strokeWidth={1.5} />
          <span>Ending in 24h</span>
          <strong>{endingSoon}</strong>
        </article>
      </section>

      {products.length === 0 ? (
        <section className="category-panel">
          <h2>No active flash sales.</h2>
          <p className="category-help">
            Set flash sale price and end time on a variant to start
            a sale.
          </p>
          <Link href="/admin/products" className="primary-button">
            Manage products
          </Link>
        </section>
      ) : (
        <section className="category-list">
          <div className="category-list-heading">
            <h2>Active flash sales</h2>
            <span>{products.length} products</span>
          </div>

          {products.map((product) => (
            <article key={product.id} className="category-panel">
              <div className="category-summary">
                <div>
                  <p className="category-parent">
                    {product.category.name}
                  </p>
                  <h3>{product.name}</h3>
                  <p className="category-slug">{product.slug}</p>
                </div>

                <span
                  className={`category-status ${
                    product.status === "ACTIVE" ? "is-active" : ""
                  }`}
                >
                  {product.status}
                </span>
              </div>

              <div className="flash-variant-list">
                {product.variants.map((v) => {
                  const discount = Math.round(
                    (1 - Number(v.flashPrice) / Number(v.price)) * 100,
                  );
                  const remaining = v.flashSaleEnd
                    ? v.flashSaleEnd.getTime() - now.getTime()
                    : 0;
                  const hours = Math.floor(
                    remaining / (1000 * 60 * 60),
                  );
                  const minutes = Math.floor(
                    (remaining % (1000 * 60 * 60)) / (1000 * 60),
                  );

                  return (
                    <div key={v.id} className="flash-variant-row">
                      <div>
                        <strong>{v.sku}</strong>
                        <p className="category-help">
                          Stock: {v.stock}
                        </p>
                      </div>

                      <div>
                        <span className="flash-price">
                          ৳ {v.flashPrice?.toFixed(2)}
                        </span>
                        <del className="store-regular-price">
                          ৳ {v.price.toFixed(2)}
                        </del>
                        <span className="flash-badge">
                          ⚡ -{discount}%
                        </span>
                      </div>

                      <div>
                        <strong>
                          {hours}h {minutes}m left
                        </strong>
                        <p className="category-help">
                          {v.flashSaleEnd
                            ? new Intl.DateTimeFormat("en-GB", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Asia/Dhaka",
                              }).format(v.flashSaleEnd)
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link
                href={`/admin/products/${product.id}/edit`}
                className="product-small-button"
              >
                Edit product
              </Link>
            </article>
          ))}
        </section>
      )}
    </>
  );
}