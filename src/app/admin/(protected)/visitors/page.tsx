import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { Users, Activity, Globe } from "lucide-react";

export default async function VisitorsPage() {
  await connection();
  await requireAdmin();

  const [rawLogs, totalCount, todayCount] = await Promise.all([
    db.visitorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
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

  // 🔍 Group logs by IP + User Agent
  const visitorsMap = new Map();

  for (const log of rawLogs) {
    const key = `${log.ipAddress}-${log.userAgent}`;
    if (!visitorsMap.has(key)) {
      visitorsMap.set(key, {
        id: log.id,
        ipAddress: log.ipAddress || "Unknown",
        userAgent: log.userAgent || "Unknown",
        lastSeen: log.createdAt,
        paths: [log.path],
      });
    } else {
      const visitor = visitorsMap.get(key);
      // Only add unique paths
      if (!visitor.paths.includes(log.path)) {
        visitor.paths.push(log.path);
      }
    }
  }

  const visitors = Array.from(visitorsMap.values());
  const uniqueIps = new Set(visitors.map((v) => v.ipAddress)).size;

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
          {totalCount} total page views — {todayCount} today.
        </p>
      </section>

      <section className="admin-stat-grid">
        <article className="admin-stat">
          <Users size={23} strokeWidth={1.5} />
          <span>Total page views</span>
          <strong>{totalCount}</strong>
        </article>

        <article className="admin-stat">
          <Activity size={23} strokeWidth={1.5} />
          <span>Today&apos;s page views</span>
          <strong>{todayCount}</strong>
        </article>

        <article className="admin-stat">
          <Globe size={23} strokeWidth={1.5} />
          <span>Unique Visitors</span>
          <strong>{uniqueIps}</strong>
        </article>
      </section>

      <section className="category-list">
        <div className="category-list-heading">
          <h2>Recent visitors</h2>
          <span>Last {visitors.length} unique visitors</span>
        </div>

        {visitors.length === 0 ? (
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
                    <th>Last Seen</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Actions (Pages Visited)</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((visitor) => (
                    <tr key={visitor.id}>
                      <td>{formatDate(visitor.lastSeen)}</td>
                      <td>
                        <code>{visitor.ipAddress}</code>
                      </td>
                      <td title={visitor.userAgent || ""}>
                        {shortUserAgent(visitor.userAgent)}
                      </td>
                      <td>
                        <ul className="visitor-paths-list">
                          {visitor.paths.map((path: string, i: number) => (
                            <li key={i}>
                              <code>{path}</code>
                            </li>
                          ))}
                        </ul>
                      </td>
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