import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { logoutAdmin } from "../actions";
import Image from "next/image";

async function AdminFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const admin = await requireAdmin();

  return (
    <div className="admin-workspace">
      <header className="admin-topbar">
        <Link
          href="/admin"
          className="admin-wordmark admin-logo-link"
          aria-label="BIMLAY admin dashboard"
        >
          <Image
            src="/branding/bimlay-logo.png"
            alt="BIMLAY"
            width={62}
            height={62}
            unoptimized
          />
          <span>ADMIN</span>
        </Link>

        <form action={logoutAdmin}>
          <button type="submit" className="admin-logout">
            <LogOut size={16} />
            Logout
          </button>
        </form>
      </header>

      <nav className="admin-section-nav" aria-label="Admin sections">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/categories">Categories</Link>
        <Link href="/admin/products">Products</Link>
        <Link href="/admin/coupons">Coupons</Link>
        <Link href="/admin/flash-sales">Flash Sales</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/media">Images</Link>
        <Link href="/admin/hero">Hero Slider</Link>
        <Link href="/admin/homepage">Homepage</Link>
        <Link href="/admin/settings">Settings</Link>
        <Link href="/" target="_blank" rel="noopener noreferrer">
          View Store
        </Link>
      </nav>

      <main className="admin-main">
        <div className="admin-account-line">
          <span>{admin.email}</span>
          <span className="admin-role">{admin.role}</span>
        </div>

        {children}
      </main>
    </div>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<div className="admin-loading">Opening your workspace...</div>}
    >
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}
