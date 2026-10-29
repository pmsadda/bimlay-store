import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import CategoryForm from "./category-form";

export default async function CategoriesPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the store owner can manage categories.</p>
      </section>
    );
  }

  const categories = await db.category.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
      parent: {
        select: { name: true },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  });

  const parents = categories
    .filter((category) => category.parentId === null)
    .map((category) => ({
      id: category.id,
      name: category.name,
    }));

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Store organisation</p>
        <h1>Categories</h1>
        <p>
          Organise your collections and choose their display order.
        </p>
      </section>

      <section className="category-panel">
        <div className="category-panel-heading">
          <h2>Create a category</h2>
          <p>
            Leave the parent empty for a main category.
          </p>
        </div>

        <CategoryForm parents={parents} />
      </section>

      <section className="category-list">
        <div className="category-list-heading">
          <h2>Your categories</h2>
          <span>{categories.length} total</span>
        </div>

        {categories.length === 0 && (
          <div className="category-empty">
            No categories yet. Create your first collection above.
          </div>
        )}

        {categories.map((category) => (
          <article
            className="category-panel"
            key={category.id}
          >
            <div className="category-summary">
              <div>
                <p className="category-parent">
                  {category.parent
                    ? `${category.parent.name} / Subcategory`
                    : "Main category"}
                </p>

                <h3>{category.name}</h3>
                <p className="category-slug">
                  {category.slug}
                </p>
              </div>

              <span
                className={`category-status ${
                  category.isActive ? "is-active" : ""
                }`}
              >
                {category.isActive ? "Active" : "Hidden"}
              </span>
            </div>

            <div className="category-meta">
              <span>
                {category._count.products} products
              </span>
              <span>
                {category._count.children} subcategories
              </span>
              <span>Order: {category.sortOrder}</span>
            </div>

            <details className="category-edit">
              <summary>Edit category</summary>

              <CategoryForm
                category={{
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                  description: category.description,
                  imageUrl: category.imageUrl,
                  parentId: category.parentId,
                  sortOrder: category.sortOrder,
                  isActive: category.isActive,
                }}
                parents={parents}
              />
            </details>
          </article>
        ))}
      </section>
    </>
  );
}