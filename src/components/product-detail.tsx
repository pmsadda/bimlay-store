"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { validateCartItem } from "@/app/actions/cart";
import { getCartQuantity, setCartQuantity } from "@/lib/cart-store";
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
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const wishlistSnapshot = useWishlistSnapshot();

  const isSaved = readWishlistIds(wishlistSnapshot).includes(product.id);

  const variant =
    product.variants.find((item) => item.id === selectedId) ?? firstAvailable;

  const image = product.images[imageIndex] ?? product.images[0];

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
        <section aria-label="Product gallery">
          <div className="detail-main-image">
            <Image
              src={image.url}
              alt={image.alt}
              fill
              unoptimized
              priority
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>

          {product.images.length > 1 && (
            <div className="detail-thumbnails">
              {product.images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === imageIndex ? "selected" : ""}
                  onClick={() => setImageIndex(index)}
                  aria-label={`View product image ${index + 1}`}
                  aria-pressed={index === imageIndex}
                >
                  <Image
                    src={item.url}
                    alt={item.alt}
                    width={90}
                    height={110}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </section>

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

          <section className="detail-description">
            <h2>Product details</h2>
            <p>
              {product.description ||
                "Further product details will be added soon."}
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}
