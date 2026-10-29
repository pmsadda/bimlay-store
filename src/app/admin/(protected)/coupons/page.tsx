import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import CouponForm from "./coupon-form";
import { toggleCoupon } from "./actions";

function bdDate(value: Date | null) {
  if (!value) return "No date limit";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function CouponsPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can manage coupons.</p>
      </section>
    );
  }

  const coupons = await db.coupon.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Promotions</p>
        <h1>Coupons</h1>
        <p>Create discount codes and control availability.</p>
      </section>

      <section className="category-panel">
        <div className="category-panel-heading">
          <h2>Create a coupon</h2>
          <p>Codes are case-insensitive at checkout.</p>
        </div>

        <CouponForm />
      </section>

      <section className="category-list">
        <div className="category-list-heading">
          <h2>Your coupons</h2>
          <span>{coupons.length} total</span>
        </div>

        {coupons.length === 0 && (
          <div className="category-empty">
            No coupons yet. Create one above.
          </div>
        )}

        {coupons.map((coupon) => (
          <article
            key={coupon.id}
            className="category-panel coupon-admin-card"
          >
            <div className="category-summary">
              <div>
                <p className="category-parent">
                  {coupon.kind === "PERCENT"
                    ? "Percentage discount"
                    : "Fixed discount"}
                </p>
                <h3>{coupon.code}</h3>
                <p className="category-slug">
                  {coupon.kind === "PERCENT"
                    ? `${coupon.value.toFixed(2)}% off`
                    : `৳${coupon.value.toFixed(2)} off`}
                </p>
              </div>

              <span
                className={`category-status ${
                  coupon.isActive ? "is-active" : ""
                }`}
              >
                {coupon.isActive ? "Active" : "Paused"}
              </span>
            </div>

            <div className="coupon-admin-meta">
              <span>
                Minimum: ৳
                {coupon.minimumSubtotal.toFixed(2)}
              </span>
              <span>
                Maximum discount:{" "}
                {coupon.maximumDiscount
                  ? `৳${coupon.maximumDiscount.toFixed(2)}`
                  : "No cap"}
              </span>
              <span>
                Used: {coupon.usedCount}
                {coupon.usageLimit !== null
                  ? ` / ${coupon.usageLimit}`
                  : " / unlimited"}
              </span>
              <span>
                Starts: {bdDate(coupon.startsAt)}
              </span>
              <span>
                Last valid:{" "}
                {coupon.expiresAt
                  ? bdDate(
                      new Date(
                        coupon.expiresAt.getTime() - 1,
                      ),
                    )
                  : "No date limit"}
              </span>
            </div>

            <form action={toggleCoupon}>
              <input
                type="hidden"
                name="id"
                value={coupon.id}
              />
              <button
                type="submit"
                className="coupon-admin-toggle"
              >
                {coupon.isActive
                  ? "Pause coupon"
                  : "Activate coupon"}
              </button>
            </form>
          </article>
        ))}
      </section>
    </>
  );
}