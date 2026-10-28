"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";

import {
  quoteCart,
  validateCartItem,
  type CartQuoteResult,
  type CartLine,
} from "@/app/actions/cart";

import {
  readCartItems,
  removeCartItem,
  setCartQuantity,
  useCartSnapshot,
} from "@/lib/cart-store";

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

function QuantityEditor({
  line,
  disabled,
  onUpdate,
}: {
  line: CartLine;
  disabled: boolean;
  onUpdate: (variantId: string, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(String(line.quantity));

  return (
    <form
      className="cart-quantity-form"
      onSubmit={(event) => {
        event.preventDefault();
        onUpdate(line.variantId, Number(quantity));
      }}
    >
      <label>
        <span className="cart-small-label">Quantity</span>
        <input
          type="number"
          min={1}
          max={99}
          step={1}
          value={quantity}
          disabled={disabled}
          onChange={(event) => setQuantity(event.target.value)}
          aria-label={`Quantity for ${line.name}`}
          required
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="product-small-button"
      >
        Update
      </button>
    </form>
  );
}

export default function CartPageContent() {
  const snapshot = useCartSnapshot();

  const [reply, setReply] = useState<{
    snapshot: string;
    result: CartQuoteResult;
  } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const result = await quoteCart(readCartItems(snapshot));

        if (!cancelled) {
          setReply({ snapshot, result });
        }
      } catch {
        if (!cancelled) {
          setReply({
            snapshot,
            result: {
              ok: false,
              error: "Could not load your bag. Please try again.",
            },
          });
        }
      }
    }

    void loadCart();

    return () => {
      cancelled = true;
    };
  }, [snapshot, refreshKey]);

  const loading = reply?.snapshot !== snapshot;

  const quote = reply?.result.ok ? reply.result : null;

  const loadError = reply && !reply.result.ok ? reply.result.error : "";

  function updateQuantity(variantId: string, quantity: number) {
    setError("");

    startTransition(async () => {
      try {
        const result = await validateCartItem(variantId, quantity);

        if (!result.ok) {
          setError(result.error);
          setRefreshKey((current) => current + 1);
          return;
        }

        setCartQuantity(result.variantId, result.quantity);
      } catch {
        setError("Could not update your bag. Please try again.");
      }
    });
  }

  function removeItem(variantId: string) {
    setError("");

    try {
      removeCartItem(variantId);
    } catch {
      setError("Could not remove the item. Please try again.");
    }
  }

  return (
    <section className="cart-page shell">
      <div className="cart-heading">
        <p className="eyebrow">Your selection</p>
        <h1>Shopping bag</h1>
        <p>Review your pieces before completing your order.</p>
      </div>

      <div aria-live="polite">
        {error && <p className="admin-form-error cart-message">{error}</p>}

        {!loading && loadError && (
          <div className="cart-load-error">
            <p className="admin-form-error">{loadError}</p>
            <button
              type="button"
              className="product-small-button"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {loading && (
        <p className="cart-updating" role="status">
          Checking current prices and availability...
        </p>
      )}

      {!loading && quote?.lines.length === 0 && (
        <div className="cart-empty">
          <ShoppingBag size={38} strokeWidth={1.2} />
          <h2>Your bag is waiting.</h2>
          <p>Discover something for your everyday.</p>

          <Link href="/shop" className="primary-button">
            Explore the collection
          </Link>
        </div>
      )}

      {quote && quote.lines.length > 0 && (
        <div
          className={`cart-layout ${loading ? "is-updating" : ""}`}
          aria-busy={loading || pending}
        >
          <div className="cart-items">
            {quote.lines.map((line) => (
              <article className="cart-item" key={line.variantId}>
                <div className="cart-item-image">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt={line.imageAlt}
                      width={130}
                      height={160}
                      unoptimized
                    />
                  ) : (
                    <ShoppingBag size={30} strokeWidth={1.2} />
                  )}
                </div>

                <div className="cart-item-information">
                  <h2>
                    {line.slug ? (
                      <Link href={`/products/${line.slug}`}>{line.name}</Link>
                    ) : (
                      line.name
                    )}
                  </h2>

                  <p className="cart-option">{line.option}</p>

                  {line.unitPrice && (
                    <p className="cart-unit-price">
                      {money(line.unitPrice)} each
                    </p>
                  )}

                  {line.issue && (
                    <p className="cart-item-issue">{line.issue}</p>
                  )}

                  {line.slug && line.stock > 0 && (
                    <QuantityEditor
                      key={`${line.variantId}-${line.quantity}`}
                      line={line}
                      disabled={loading || pending}
                      onUpdate={updateQuantity}
                    />
                  )}

                  <button
                    type="button"
                    className="cart-remove"
                    disabled={loading || pending}
                    onClick={() => removeItem(line.variantId)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>

                <div className="cart-line-total">
                  {line.lineTotal ? money(line.lineTotal) : "Unavailable"}
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="eyebrow">Order summary</p>
            <h2>Your everyday edit.</h2>

            <div className="cart-summary-row">
              <span>
                {quote.hasIssues ? "Available items subtotal" : "Subtotal"}
              </span>
              <strong>{money(quote.subtotal)}</strong>
            </div>

            <div className="cart-summary-row">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>

            {quote.hasIssues && (
              <p className="cart-summary-note cart-item-issue">
                Update or remove unavailable items before checkout. Their prices
                are excluded from this subtotal.
              </p>
            )}

            <p className="cart-summary-note">
              Adding an item to your bag does not reserve stock.
            </p>

            {!quote.hasIssues && !loading && !pending && (
              <Link href="/checkout" className="primary-button checkout-submit">
                Proceed to checkout
              </Link>
            )}

            <Link href="/shop" className="text-link">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
