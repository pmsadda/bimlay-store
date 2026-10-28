import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import ImageUpload from "@/components/admin/image-upload";

export default async function AdminMediaPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the store owner can upload images.</p>
      </section>
    );
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Store imagery</p>
        <h1>Image upload</h1>
        <p>
          Upload and optimise a product image before adding it
          to your catalogue.
        </p>
      </section>

      <section className="category-panel">
        <ImageUpload />
      </section>
    </>
  );
}