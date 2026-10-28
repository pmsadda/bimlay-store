"use client";

import { useActionState, useState } from "react";
import {
  allowedPaymentStates,
  label,
  NEXT_ORDER_STATES,
  type OrderState,
} from "@/lib/order-rules";

import {
  changeOrderPayment,
  changeOrderStatus,
} from "./actions";

type Props = {
  orderId: string;
  status: OrderState;
  paymentStatus: string;
};

export default function OrderControls({
  orderId,
  status,
  paymentStatus,
}: Props) {
  const nextStatuses = NEXT_ORDER_STATES[status];

  const [selectedStatus, setSelectedStatus] = useState<string>(
    nextStatuses[0] ?? "",
  );

  const [statusState, statusAction, statusPending] =
    useActionState(changeOrderStatus, {
      error: "",
      success: "",
    });

  const [paymentState, paymentAction, paymentPending] =
    useActionState(changeOrderPayment, {
      error: "",
      success: "",
    });

  const payments = allowedPaymentStates(status, paymentStatus);

  return (
    <div className="order-controls-grid">
      <section className="category-panel">
        <h2>Order status</h2>
        <p className="category-help">
          Current status: {label(status)}
        </p>

        {nextStatuses.length === 0 ? (
          <p className="category-help">
            No further status changes are available.
          </p>
        ) : (
          <form action={statusAction} className="category-form">
            <input type="hidden" name="orderId" value={orderId} />

            <fieldset disabled={statusPending}>
              <div className="category-form-grid">
                <label className="category-full-width">
                  <span>Change status to</span>
                  <select
                    name="status"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                    required
                  >
                    {nextStatuses.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="category-full-width">
                  <span>Reason / internal note</span>
                  <textarea
                    name="reason"
                    rows={3}
                    maxLength={500}
                    minLength={
                      selectedStatus === "CANCELLED" ||
                      selectedStatus === "RETURNED"
                        ? 5
                        : undefined
                    }
                    required={
                      selectedStatus === "CANCELLED" ||
                      selectedStatus === "RETURNED"
                    }
                  />
                </label>
              </div>

              {selectedStatus === "RETURNED" && (
                <label className="category-checkbox">
                  <input
                    type="checkbox"
                    name="restockReturn"
                  />
                  <span>
                    Returned goods are received and fit for resale.
                    Add them back to stock.
                  </span>
                </label>
              )}

              {selectedStatus === "CANCELLED" && (
                <p className="category-help">
                  Cancelling restores stock to existing variants.
                </p>
              )}

              <button
                type="submit"
                className="primary-button"
              >
                {statusPending ? "Updating..." : "Update status"}
              </button>
            </fieldset>
          </form>
        )}

        <div aria-live="polite">
          {statusState.error && (
            <p className="admin-form-error">
              {statusState.error}
            </p>
          )}
          {statusState.success && (
            <p className="category-success">
              {statusState.success}
            </p>
          )}
        </div>
      </section>

      <section className="category-panel">
        <h2>Payment record</h2>
        <p className="category-help">
          Current payment: {label(paymentStatus)}
        </p>

        {payments.length === 0 ? (
          <p className="category-help">
            Payment updates are unavailable at this order stage.
          </p>
        ) : (
          <form action={paymentAction} className="category-form">
            <input type="hidden" name="orderId" value={orderId} />

            <fieldset disabled={paymentPending}>
              <div className="category-form-grid">
                <label className="category-full-width">
                  <span>Record payment as</span>
                  <select name="paymentStatus" required>
                    {payments.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="category-full-width">
                  <span>Payment reference / note</span>
                  <textarea
                    name="paymentNote"
                    rows={3}
                    minLength={5}
                    maxLength={500}
                    required
                    placeholder="Record when and how payment or refund was completed."
                  />
                </label>
              </div>

              <p className="category-help">
                Record Paid only after receiving the money.
                Record Refunded only after completing the refund.
              </p>

              <button type="submit" className="primary-button">
                {paymentPending ? "Saving..." : "Save payment record"}
              </button>
            </fieldset>
          </form>
        )}

        <div aria-live="polite">
          {paymentState.error && (
            <p className="admin-form-error">
              {paymentState.error}
            </p>
          )}
          {paymentState.success && (
            <p className="category-success">
              {paymentState.success}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}