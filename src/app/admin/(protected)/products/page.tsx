import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export default async function ProductsPage() {
  await connection();

  const admin = await requireAdmin();

  const [products, total] = await Promise.all([
    db.product.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isFeatured: true,
        category: {
          select: {
            name: true,
            isActive: true,
            parent: {
              select: { isActive: true },
            },
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            url: true,
            alt: true,
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          select: {
            price: true,
            stock: true,
          },
        },
      },
    }),
    db.product.count(),
  ]);

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Your catalogue</p>
        <h1>Products</h1>
        <p>
          {total} products in your database. Showing the latest{" "}
          {products.length}.
        </p>
      </section>

      {admin.role === "OWNER" && (
        <Link
          href="/admin/products/new"
          className="primary-button product-new-link"
        >
          Create product
        </Link>
      )}

      {products.length === 0 ? (
        <section className="category-panel">
          <h2>No products yet.</h2>
          <p className="category-help">
            Create your first product to start building your catalogue.
          </p>
        </section>
      ) : (
        <section className="product-admin-list">
          {products.map((product) => {
            const mainImage = product.images[0];
            const firstVariant = product.variants[0];
            const stock = product.variants.reduce(
              (totalStock, variant) => totalStock + variant.stock,
              0,
            );

            const categoryVisible =
              product.category.isActive &&
              (product.category.parent?.isActive ?? true);

            return (
              <article className="product-admin-row" key={product.id}>
                <div className="product-admin-thumbnail">
                  {mainImage && (
                    <Image
                      src={mainImage.url}
                      alt={mainImage.alt}
                      width={90}
                      height={110}
                      unoptimized
                    />
                  )}
                </div>

                <div className="product-admin-information">
                  <p className="category-parent">{product.category.name}</p>
                  <h2>{product.name}</h2>
                  <p className="category-slug">{product.slug}</p>

                  {admin.role === "OWNER" && (
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="product-small-button product-edit-link"
                    >
                      Edit product
                    </Link>
                  )}

                  <div className="category-meta">
                    <span>{product.variants.length} variants</span>
                    <span>{stock} units in stock</span>
                    {product.isFeatured && <span>Featured</span>}
                    {!categoryVisible && <span>Category hidden</span>}
                  </div>
                </div>

                <div className="product-admin-price">
                  <span
                    className={`category-status ${
                      product.status === "ACTIVE" ? "is-active" : ""
                    }`}
                  >
                    {product.status}
                  </span>

                  <strong>
                    {firstVariant
                      ? `৳ ${new Intl.NumberFormat("en-BD", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(Number(firstVariant.price))}`
                      : "No active variant"}
                  </strong>

                  {product.variants.length > 1 && (
                    <span className="category-help">Starting price</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
