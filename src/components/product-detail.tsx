"use client";

import ProductGallery from "@/components/product-gallery";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { validateCartItem } from "@/app/actions/cart";
import { getCartQuantity, setCartQuantity } from "@/lib/cart-store";
import ProductShare from "@/components/product-share";
import { addProductReview } from "@/app/actions/reviews";
import {
  readWishlistIds,
  toggleWishlist,
  useWishlistSnapshot,
} from "@/lib/wishlist-store";

export type ProductDetailData = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: {
    name: string;
    slug: string;
  };
  images: {
    id: string;
    url: string;
    alt: string;
  }[];
  variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    price: string;
    regularPrice: string | null;
    stock: number;
  }[];
  reviews?: {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    imageUrl: string | null;
    createdAt: string;
  }[];
};

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

export default function ProductDetail({
  product,
}: {
  product: ProductDetailData;
}) {
  const firstAvailable =
    product.variants.find((variant) => variant.stock > 0) ??
    product.variants[0];

  const [selectedId, setSelectedId] = useState(firstAvailable.id);

  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const wishlistSnapshot = useWishlistSnapshot();

  const isSaved = readWishlistIds(wishlistSnapshot).includes(product.id);

  const variant =
    product.variants.find((item) => item.id === selectedId) ?? firstAvailable;

  function addToBag() {
    setError("");
    setSuccess("");

    const requested = Number(quantity);

    if (!Number.isInteger(requested) || requested < 1 || requested > 99) {
      setError("Enter a quantity between 1 and 99.");
      return;
    }

    startTransition(async () => {
      try {
        const totalQuantity = getCartQuantity(variant.id) + requested;

        const result = await validateCartItem(variant.id, totalQuantity);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setCartQuantity(result.variantId, result.quantity);

        setSuccess(
          `${requested} item${requested > 1 ? "s" : ""} added to your bag.`,
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Could not save your bag. Please try again.",
        );
      }
    });
  }

  return (
    <div className="product-detail shell">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link
          href={`/shop?category=${encodeURIComponent(product.category.slug)}`}
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="product-detail-grid">
        <ProductGallery images={product.images} />

        <section className="detail-information">
          <p className="eyebrow">{product.category.name}</p>
          <h1>{product.name}</h1>

          <div className="detail-price">
            <strong>{money(variant.price)}</strong>
            {variant.regularPrice && <del>{money(variant.regularPrice)}</del>}
          </div>

          <button
            type="button"
            className="detail-wishlist-button"
            aria-pressed={isSaved}
            onClick={() => {
              try {
                toggleWishlist(product.id);
                setError("");
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not update your wishlist.",
                );
              }
            }}
          >
            <Heart
              size={17}
              fill={isSaved ? "#816334" : "none"}
              color={isSaved ? "#816334" : "currentColor"}
            />
            {isSaved ? "Saved to wishlist" : "Save to wishlist"}
          </button>

          {product.shortDescription && (
            <p className="detail-introduction">{product.shortDescription}</p>
          )}

          <label className="detail-field">
            <span>Choose an option</span>

            <select
              value={variant.id}
              disabled={pending}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setQuantity("1");
                setError("");
                setSuccess("");
              }}
            >
              {product.variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {[item.size, item.color].filter(Boolean).join(" / ") ||
                    "Standard"}
                  {item.stock === 0 ? " — Out of stock" : ""}
                </option>
              ))}
            </select>
          </label>

          <p className="detail-sku">SKU: {variant.sku}</p>

          <p className={`detail-stock ${variant.stock > 0 ? "available" : ""}`}>
            {variant.stock > 0
              ? `${variant.stock} units available`
              : "Currently out of stock"}
          </p>

          <div className="detail-purchase">
            <label className="detail-field detail-quantity">
              <span>Quantity</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.min(variant.stock, 99))}
                step={1}
                value={quantity}
                disabled={pending || variant.stock === 0}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="primary-button"
              disabled={pending || variant.stock === 0}
              onClick={addToBag}
            >
              <ShoppingBag size={17} />
              {pending
                ? "Checking availability..."
                : variant.stock === 0
                  ? "Out of stock"
                  : "Add to bag"}
            </button>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {error && (
              <p className="admin-form-error detail-message">{error}</p>
            )}

            {success && (
              <div className="category-success detail-message">
                <p>{success}</p>

                <Link href="/cart" className="text-link">
                  View bag
                </Link>
              </div>
            )}
          </div>

          <p className="detail-note">
            Final availability and pricing are confirmed at checkout.
          </p>

          <ProductShare />

          <section className="detail-description">
            <h2>Product details</h2>
            <p>
              {product.description ||
                "Further product details will be added soon."}
            </p>
          </section>

          {/* Product Reviews & Ratings Section */}
          <section
            className="product-reviews-section"
            style={{
              marginTop: "3rem",
              borderTop: "1px solid #eaeaea",
              paddingTop: "2rem",
            }}
          >
            <h2>Customer Reviews &amp; Ratings</h2>

            <div className="reviews-list" style={{ margin: "1.5rem 0" }}>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      padding: "1rem 0",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong>{review.userName}</strong>
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>
                        {new Date(review.createdAt).toISOString().split("T")[0]}
                      </span>
                    </div>
                    <div style={{ color: "#f59e0b", margin: "0.25rem 0" }}>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                    {review.comment && (
                      <p style={{ margin: "0.5rem 0" }}>{review.comment}</p>
                    )}
                    {review.imageUrl && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <img
                          src={review.imageUrl}
                          alt="Review attachment"
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: "#666" }}>
                  No reviews yet. Be the first to review this product!
                </p>
              )}
            </div>

            <div
              className="add-review-form"
              style={{
                background: "#fafafa",
                padding: "1.5rem",
                borderRadius: "8px",
                marginTop: "2rem",
              }}
            >
              <h3>Write a Review</h3>
              <form
                action={addProductReview}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                <input type="hidden" name="productId" value={product.id} />

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="userName"
                    required
                    placeholder="Enter your name"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    Rating (1 to 5)
                  </label>
                  <select
                    name="rating"
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="5">5 Stars - Excellent</option>
                    <option value="4">4 Stars - Good</option>
                    <option value="3">3 Stars - Average</option>
                    <option value="2">2 Stars - Poor</option>
                    <option value="1">1 Star - Terrible</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    Your Review
                  </label>
                  <textarea
                    name="comment"
                    rows={3}
                    placeholder="Write your feedback..."
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  ></textarea>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  style={{
                    alignSelf: "flex-start",
                    padding: "0.5rem 1.5rem",
                    cursor: "pointer",
                  }}
                >
                  Submit Review
                </button>
              </form>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
