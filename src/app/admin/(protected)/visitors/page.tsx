import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { Users, Activity, Globe } from "lucide-react";

export default async function VisitorsPage() {
  await connection();
  await requireAdmin();

  const [logs, totalCount, todayCount] = await Promise.all([
    db.visitorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.visitorLog.count(),
    db.visitorLog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const uniqueIps = new Set(logs.map((log) => log.ipAddress).filter(Boolean))
    .size;

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Dhaka",
    }).format(date);
  }

  function shortUserAgent(ua: string | null) {
    if (!ua) return "Unknown";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Linux")) return "Linux";
    return ua.slice(0, 30) + "...";
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Analytics</p>
        <h1>Visitors</h1>
        <p>
          {totalCount} total visits — {todayCount} today.
        </p>
      </section>

      <section className="admin-stat-grid">
        <article className="admin-stat">
          <Users size={23} strokeWidth={1.5} />
          <span>Total visits</span>
          <strong>{totalCount}</strong>
        </article>

        <article className="admin-stat">
          <Activity size={23} strokeWidth={1.5} />
          <span>Today&apos;s visits</span>
          <strong>{todayCount}</strong>
        </article>

        <article className="admin-stat">
          <Globe size={23} strokeWidth={1.5} />
          <span>Unique IPs (recent)</span>
          <strong>{uniqueIps}</strong>
        </article>
      </section>

      <section className="category-list">
        <div className="category-list-heading">
          <h2>Recent visits</h2>
          <span>Last {logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <div className="category-empty">
            No visitors tracked yet. When someone visits your store,
            they&apos;ll appear here.
          </div>
        ) : (
          <div className="category-panel">
            <div className="visitor-table-wrap">
              <table className="visitor-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Page</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>
                        <code>{log.ipAddress || "Unknown"}</code>
                      </td>
                      <td title={log.userAgent || ""}>
                        {shortUserAgent(log.userAgent)}
                      </td>
                      <td>{log.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
