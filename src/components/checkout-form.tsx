"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { quoteCheckoutCoupon } from "@/app/actions/coupons";
import { useEffect, useState, useTransition } from "react";

import { quoteCart, type CartQuoteResult } from "@/app/actions/cart";
import { submitCheckout } from "@/app/actions/checkout";

import {
  completeCartOrder,
  readCartItems,
  useCartSnapshot,
} from "@/lib/cart-store";

type Props = {
  dhakaCharge: string;
  outsideCharge: string;
};

const CHECKOUT_SESSION_KEY = "bimlay-checkout-pending-v1";

function checkoutIdentity(): {
  checkoutKey: string;
  receiptSecret: string;
} {
  const existing = window.sessionStorage.getItem(CHECKOUT_SESSION_KEY);

  if (existing) {
    const parsed = JSON.parse(existing);

    if (
      typeof parsed.checkoutKey === "string" &&
      typeof parsed.receiptSecret === "string"
    ) {
      return parsed;
    }

    throw new Error(
      "Invalid checkout session. Please reopen this browser tab.",
    );
  }

  const bytes = window.crypto.getRandomValues(new Uint8Array(32));

  const identity = {
    checkoutKey: window.crypto.randomUUID(),
    receiptSecret: Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };

  window.sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(identity));

  return identity;
}

function cents(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function decimalFromCents(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

export default function CheckoutForm({ dhakaCharge, outsideCharge }: Props) {
  const router = useRouter();
  const snapshot = useCartSnapshot();

  const [reply, setReply] = useState<{
    snapshot: string;
    result: CartQuoteResult;
  } | null>(null);

  const [zone, setZone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    snapshot: string;
    code: string;
    subtotal: string;
    discount: string;
  } | null>(null);
  const [couponPending, startCouponTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    quoteCart(readCartItems(snapshot))
      .then((result) => {
        if (!cancelled) {
          setReply({ snapshot, result });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReply({
            snapshot,
            result: {
              ok: false,
              error: "Could not load checkout. Refresh this page.",
            },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  if (!reply || reply.snapshot !== snapshot) {
    return <div className="store-loading">Checking your order...</div>;
  }

  if (!reply.result.ok) {
    return (
      <div className="shell checkout-page">
        <p className="admin-form-error">{reply.result.error}</p>
        <Link href="/cart" className="text-link">
          Return to bag
        </Link>
      </div>
    );
  }

  const quote = reply.result;
  const activeCoupon =
    appliedCoupon?.snapshot === snapshot &&
    appliedCoupon.subtotal === quote.subtotal
      ? appliedCoupon
      : null;

  if (quote.lines.length === 0 || quote.hasIssues) {
    return (
      <div className="shell checkout-page">
        <h1>Review your shopping bag.</h1>
        <p className="category-help">
          {quote.lines.length === 0
            ? "Add an item before proceeding to checkout."
            : "Update or remove unavailable items before checkout."}
        </p>
        <Link href="/cart" className="primary-button">
          Return to bag
        </Link>
      </div>
    );
  }

  const shipping =
    zone === "DHAKA"
      ? dhakaCharge
      : zone === "OUTSIDE_DHAKA"
        ? outsideCharge
        : null;

  const total = decimalFromCents(
    cents(quote.subtotal) -
      (activeCoupon ? cents(activeCoupon.discount) : 0) +
      (shipping ? cents(shipping) : 0),
  );

  function applyCoupon() {
    const requestedCode = couponCode.trim();

    if (!requestedCode) {
      setCouponMessage("Enter a coupon code.");
      return;
    }

    setCouponMessage("");
    setAppliedCoupon(null);

    startCouponTransition(async () => {
      try {
        const result = await quoteCheckoutCoupon(
          readCartItems(snapshot),
          requestedCode,
        );

        if (!result.ok) {
          setCouponMessage(result.error);
          return;
        }

        setAppliedCoupon({
          snapshot,
          code: result.code,
          subtotal: result.subtotal,
          discount: result.discount,
        });
        setCouponCode(result.code);
        setCouponMessage(`${result.code} applied successfully.`);
      } catch {
        setCouponMessage("Could not check this coupon. Please try again.");
      }
    });
  }

  function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    setError("");

    startTransition(async () => {
      try {
        const identity = checkoutIdentity();

        const result = await submitCheckout({
          ...identity,
          customerName: formData.get("customerName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          district: formData.get("district"),
          address: formData.get("address"),
          notes: formData.get("notes"),
          deliveryZone: zone,
          expectedTotal: total,
          couponCode: activeCoupon?.code ?? "",
          items: readCartItems(snapshot),
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        // A committed order must still open its receipt,
        // even if browser storage cleanup fails.
        try {
          completeCartOrder(result.orderId, result.items);

          window.sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
        } catch {
          // Keep the checkout identity for a safe retry.
        }

        router.push(`/order-confirmation/${result.orderId}`);
      } catch {
        setError("Checkout could not finish. Please retry from this page.");
      }
    });
  }

  return (
    <section className="shell checkout-page">
      <div className="cart-heading">
        <p className="eyebrow">Complete your selection</p>
        <h1>Checkout</h1>
      </div>

      <form onSubmit={placeOrder} className="checkout-layout">
        <fieldset disabled={pending} className="checkout-fields">
          <h2>Delivery details</h2>

          <div className="category-form-grid">
            <label>
              <span>Full name</span>
              <input
                name="customerName"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>

            <label>
              <span>Mobile number</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                maxLength={25}
                required
              />
            </label>

            <label>
              <span>Email — optional</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
              />
            </label>

            <label>
              <span>District</span>
              <input
                name="district"
                autoComplete="address-level2"
                minLength={2}
                maxLength={80}
                required
              />
            </label>

            <label className="category-full-width">
              <span>Complete delivery address</span>
              <textarea
                name="address"
                autoComplete="street-address"
                placeholder="House, road, area, thana and other delivery details"
                rows={4}
                minLength={10}
                maxLength={500}
                required
              />
            </label>

            <label className="category-full-width">
              <span>Delivery area</span>
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                required
              >
                <option value="" disabled>
                  Choose delivery area
                </option>
                <option value="DHAKA">
                  Inside Dhaka — {money(dhakaCharge)}
                </option>
                <option value="OUTSIDE_DHAKA">
                  Outside Dhaka — {money(outsideCharge)}
                </option>
              </select>
            </label>

            <label className="category-full-width">
              <span>Order notes — optional</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={500}
                placeholder="Any helpful delivery instructions"
              />
            </label>
          </div>
        </fieldset>

        <aside className="cart-summary checkout-summary">
          <p className="eyebrow">Your order</p>
          <h2>Order summary</h2>

          {quote.lines.map((line) => (
            <div className="checkout-order-line" key={line.variantId}>
              <div>
                <strong>{line.name}</strong>
                <p>
                  {line.option} · Qty {line.quantity}
                </p>
              </div>
              <span>{money(line.lineTotal!)}</span>
            </div>
          ))}

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <strong>{money(quote.subtotal)}</strong>
          </div>

          <div className="checkout-coupon">
            <label htmlFor="checkout-coupon-code">Coupon code</label>

            <div className="checkout-coupon-controls">
              <input
                id="checkout-coupon-code"
                type="text"
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value);
                  setAppliedCoupon(null);
                  setCouponMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCoupon();
                  }
                }}
                maxLength={32}
                autoComplete="off"
                placeholder="Enter code"
              />

              <button
                type="button"
                onClick={applyCoupon}
                disabled={pending || couponPending || !couponCode.trim()}
              >
                {couponPending ? "Checking..." : "Apply"}
              </button>
            </div>

            {activeCoupon && (
              <button
                type="button"
                className="checkout-coupon-remove"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCouponCode("");
                  setCouponMessage("");
                }}
                disabled={pending || couponPending}
              >
                Remove coupon
              </button>
            )}

            <p className="checkout-coupon-message" role="status">
              {couponMessage}
            </p>
          </div>

          <div className="cart-summary-row">
            <span>Delivery</span>
            <span>{shipping ? money(shipping) : "Choose area"}</span>
          </div>

          {activeCoupon && (
            <div className="cart-summary-row checkout-discount">
              <span>Coupon ({activeCoupon.code})</span>
              <strong>−{money(activeCoupon.discount)}</strong>
            </div>
          )}

          <div className="cart-summary-row checkout-total">
            <strong>Total</strong>
            <strong>{money(total)}</strong>
          </div>

          <div className="checkout-payment">
            <strong>Cash on Delivery</strong>
            <p>Pay when your order arrives.</p>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {error && <p className="admin-form-error cart-message">{error}</p>}
          </div>

          <button
            type="submit"
            className="primary-button checkout-submit"
            disabled={pending || couponPending || !zone}
          >
            {pending ? "Placing order..." : "Place order"}
          </button>
        </aside>
      </form>
    </section>
  );
}
