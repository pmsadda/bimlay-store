import { connection } from "next/server";
import {
  Boxes,
  FolderTree,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  await connection();
  const admin = await requireAdmin();

  const [productCount, categoryCount] = await Promise.all([
    db.product.count(),
    db.category.count(),
  ]);

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Your store workspace</p>
        <h1>Welcome, {admin.name}.</h1>
        <p>
          Your admin account is connected to the BIMLAY database.
        </p>
      </section>

      <section className="admin-stat-grid">
        <article className="admin-stat">
          <Boxes size={23} strokeWidth={1.5} />
          <span>Products</span>
          <strong>{productCount}</strong>
        </article>

        <article className="admin-stat">
          <FolderTree size={23} strokeWidth={1.5} />
          <span>Categories</span>
          <strong>{categoryCount}</strong>
        </article>

        <article className="admin-stat">
          <ShieldCheck size={23} strokeWidth={1.5} />
          <span>Account access</span>
          <strong className="admin-stat-text">
            {admin.role}
          </strong>
        </article>
      </section>

      <section className="admin-next-step">
        <h2>Your store starts here.</h2>
        <p>
          Login and session management are ready. Category and
          product management will be added in the next step.
        </p>
      </section>
    </>
  );
}