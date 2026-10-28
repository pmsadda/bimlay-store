import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import EditProductForm from "../../edit-product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can edit products.</p>
      </section>
    );
  }

  const { id } = await params;

  if (!id || id.length > 100) {
    notFound();
  }

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        images: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    }),

    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isActive: true,
        parent: {
          select: {
            name: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Manage your catalogue</p>
        <h1>Edit product</h1>
        <p>{product.name}</p>
      </section>

      <Link
        href="/admin/products"
        className="product-small-button product-new-link"
      >
        Back to products
      </Link>

      <EditProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          shortDescription: product.shortDescription ?? "",
          description: product.description,
          status: product.status,
          isFeatured: product.isFeatured,
          images: product.images.map((image) => ({
            id: image.id,
            url: image.url,
            alt: image.alt,
          })),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size ?? "",
            color: variant.color ?? "",
            price: variant.price.toFixed(2),
            compareAtPrice: variant.compareAtPrice?.toFixed(2) ?? "",
            stock: variant.stock,
            isActive: variant.isActive,
          })),
        }}
        categories={categories.map((category) => {
          const visible =
            category.isActive && (category.parent?.isActive ?? true);

          return {
            id: category.id,
            name:
              (category.parent
                ? `${category.parent.name} / ${category.name}`
                : category.name) + (visible ? "" : " — Hidden"),
          };
        })}
      />
    </>
  );
}
