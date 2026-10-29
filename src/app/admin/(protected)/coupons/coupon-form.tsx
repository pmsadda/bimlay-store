"use client";

import { useActionState } from "react";
import { createCoupon } from "./actions";

export default function CouponForm() {
  const [state, formAction, pending] = useActionState(
    createCoupon,
    { error: "", success: "" },
  );

  return (
    <form action={formAction} className="category-form">
      <fieldset disabled={pending}>
        <div className="category-form-grid">
          <label>
            <span>Coupon code</span>
            <input
              name="code"
              placeholder="Example: BIMLAY10"
              minLength={3}
              maxLength={32}
              autoCapitalize="characters"
              required
            />
          </label>

          <label>
            <span>Discount type</span>
            <select name="kind" defaultValue="PERCENT">
              <option value="PERCENT">Percentage (%)</option>
              <option value="FIXED">Fixed amount (৳)</option>
            </select>
          </label>

          <label>
            <span>Discount value</span>
            <input
              name="value"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              placeholder="Example: 10"
              required
            />
          </label>

          <label>
            <span>Minimum order subtotal (৳)</span>
            <input
              name="minimumSubtotal"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>

          <label>
            <span>Maximum discount (৳) — optional</span>
            <input
              name="maximumDiscount"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              placeholder="Leave empty for no cap"
            />
          </label>

          <label>
            <span>Usage limit — optional</span>
            <input
              name="usageLimit"
              type="number"
              min="1"
              max="1000000"
              step="1"
              placeholder="Leave empty for unlimited"
            />
          </label>

          <label>
            <span>Start date — optional</span>
            <input name="startsAt" type="date" />
          </label>

          <label>
            <span>Last valid date — optional</span>
            <input name="expiresAt" type="date" />
          </label>
        </div>

        <label className="category-checkbox">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
          />
          <span>Activate immediately</span>
        </label>

        <p className="category-help">
          Dates use Bangladesh time. Discounts apply to
          products only; delivery charge is not discounted.
        </p>

        <button type="submit" className="primary-button">
          {pending ? "Creating..." : "Create coupon"}
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p className="admin-form-error">{state.error}</p>
        )}
        {state.success && (
          <p className="category-success">{state.success}</p>
        )}
      </div>
    </form>
  );
}