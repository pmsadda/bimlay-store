import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Boxes,
  FolderTree,
  
  TrendingUp,
  Users,
  ShoppingBag,
  ArrowRight,
  PlusCircle,
} from "lucide-react";

export default async function AdminDashboardPage() {
  await connection();
  const admin = await requireAdmin();

  // ড্যাশবোর্ডের জন্য ডেটা ফেচ করা
  const [
    productCount,
    categoryCount,
    visitorCount,
    orderCount,
    pendingOrders,
    revenueData,
    recentOrders,
  ] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.visitorLog.count(),
    db.order.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ["CANCELLED", "RETURNED"] } },
    }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const totalRevenue = revenueData._sum.total?.toFixed(2) || "0.00";

  return (
    <>
      {/* Welcome Section */}
      <section className="admin-welcome">
        <p className="eyebrow">Dashboard Overview</p>
        <h1>Welcome back, {admin.name}.</h1>
       <p>Here is what&apos;s happening with your store today.</p>
      </section>

      {/* Stats Grid */}
      <section className="dash-stat-grid">
        <article className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="dash-stat-label">Total Revenue</span>
            <strong className="dash-stat-value">৳ {totalRevenue}</strong>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "#e3f2fd", color: "#1565c0" }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="dash-stat-label">Total Orders</span>
            <strong className="dash-stat-value">{orderCount}</strong>
            {pendingOrders > 0 && (
              <span className="dash-stat-badge">{pendingOrders} pending</span>
            )}
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "#fce4ec", color: "#c2185b" }}>
            <Users size={24} />
          </div>
          <div>
            <span className="dash-stat-label">Total Visitors</span>
            <strong className="dash-stat-value">{visitorCount}</strong>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "#fff3e0", color: "#e65100" }}>
            <Boxes size={24} />
          </div>
          <div>
            <span className="dash-stat-label">Products</span>
            <strong className="dash-stat-value">{productCount}</strong>
            <span className="dash-stat-sub">{categoryCount} categories</span>
          </div>
        </article>
      </section>

      {/* Bottom Grid: Quick Actions & Recent Orders */}
      <div className="dash-bottom-grid">
        {/* Quick Actions */}
        <section className="dash-panel">
          <h2 className="dash-panel-title">Quick Actions</h2>
          <div className="dash-quick-actions">
            <Link href="/admin/products/new" className="dash-action-btn">
              <PlusCircle size={18} />
              <span>Create Product</span>
            </Link>
            <Link href="/admin/orders" className="dash-action-btn">
              <ShoppingBag size={18} />
              <span>Manage Orders</span>
            </Link>
            <Link href="/admin/categories" className="dash-action-btn">
              <FolderTree size={18} />
              <span>Categories</span>
            </Link>
            <Link href="/admin/visitors" className="dash-action-btn">
              <Users size={18} />
              <span>Visitor Logs</span>
            </Link>
          </div>
        </section>

        {/* Recent Orders */}
        <section className="dash-panel">
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">Recent Orders</h2>
            <Link href="/admin/orders" className="dash-link">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="dash-recent-orders">
            {recentOrders.length === 0 ? (
              <p className="dash-empty">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  href={`/admin/orders/${order.id}`}
                  key={order.id}
                  className="dash-order-row"
                >
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span>{order.customerName}</span>
                  </div>
                  <div className="dash-order-right">
                    <strong>৳ {order.total.toFixed(2)}</strong>
                    <span className={`dash-status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}