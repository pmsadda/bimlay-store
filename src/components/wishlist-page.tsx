"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import {
  getWishlistProducts,
  type WishlistResult,
} from "@/app/actions/wishlist";

import {
  readWishlistIds,
  removeWishlistItems,
  useWishlistSnapshot,
} from "@/lib/wishlist-store";

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

export default function WishlistPageContent() {
  const snapshot = useWishlistSnapshot();

  const [reply, setReply] = useState<{
    snapshot: string;
    result: WishlistResult;
  } | null>(null);

  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getWishlistProducts(readWishlistIds(snapshot))
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
              error: "Could not load your wishlist.",
            },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot, retry]);

  function remove(ids: string[]) {
    setError("");

    try {
      removeWishlistItems(ids);
    } catch {
      setError("Could not update your wishlist. Please try again.");
    }
  }

  const loading = !reply || reply.snapshot !== snapshot;

  return (
    <section className="products-section shell wishlist-page">
      <div className="cart-heading">
        <p className="eyebrow">Your personal edit</p>
        <h1>Wishlist</h1>
        <p>Keep your favourites close.</p>
      </div>

      {error && (
        <p className="admin-form-error cart-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="cart-updating" role="status">
          Loading your saved pieces...
        </p>
      ) : !reply.result.ok ? (
        <div className="store-empty">
          <p>{reply.result.error}</p>
          <button
            type="button"
            className="product-small-button"
            onClick={() => setRetry((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {reply.result.unavailableIds.length > 0 && (
            <div className="wishlist-unavailable">
              <p>
                {reply.result.unavailableIds.length} saved
                product(s) are no longer available.
              </p>

              <button
                type="button"
                className="product-small-button"
                onClick={() => {
                  if (reply.result.ok) {
                    remove(reply.result.unavailableIds);
                  }
                }}
              >
                Remove unavailable products
              </button>
            </div>
          )}

          {reply.result.products.length === 0 ? (
            <div className="cart-empty">
              <Heart size={38} strokeWidth={1.2} />
              <h2>Make room for your favourites.</h2>
              <p>Tap a heart to save a piece you love.</p>

              <Link href="/shop" className="primary-button">
                Explore the collection
              </Link>
            </div>
          ) : (
            <div className="product-grid">
              {reply.result.products.map((product) => (
                <article key={product.id}>
                  <div className="product-image">
                    <Link
                      href={`/products/${product.slug}`}
                      aria-label={`View ${product.name}`}
                    >
                      <Image
                        src={product.image}
                        alt={product.imageAlt}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </Link>

                    <button
                      type="button"
                      className="icon-button wishlist-button"
                      aria-label={`Remove ${product.name} from wishlist`}
                      onClick={() => remove([product.id])}
                    >
                      <Heart
                        size={17}
                        fill="#816334"
                        color="#816334"
                      />
                    </button>

                    {!product.inStock && (
                      <span className="store-stock-label">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className="product-info">
                    <div>
                      <h3>
                        <Link href={`/products/${product.slug}`}>
                          {product.name}
                        </Link>
                      </h3>

                      <p>
                        {product.hasMultipleVariants && (
                          <span className="store-from">From </span>
                        )}

                        {money(product.price)}

                        {product.regularPrice && (
                          <del className="store-regular-price">
                            {money(product.regularPrice)}
                          </del>
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}