import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import ProductForm from "../product-form";

export default async function NewProductPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can create products.</p>
      </section>
    );
  }

  const categories = await db.category.findMany({
    where: {
      isActive: true,
      OR: [
        { parentId: null },
        { parent: { is: { isActive: true } } },
      ],
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      parent: {
        select: { name: true },
      },
    },
  });

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Build your catalogue</p>
        <h1>Create product</h1>
        <p>Add product details, images, pricing and stock.</p>
      </section>

      {categories.length === 0 ? (
        <section className="category-panel">
          <p>Create an active category before adding a product.</p>
          <Link
            href="/admin/categories"
            className="primary-button"
          >
            Manage categories
          </Link>
        </section>
      ) : (
        <ProductForm
          categories={categories.map((category) => ({
            id: category.id,
            name: category.parent
              ? `${category.parent.name} / ${category.name}`
              : category.name,
          }))}
        />
      )}
    </>
  );
}