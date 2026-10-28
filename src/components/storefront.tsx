"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useCartCount } from "@/lib/cart-store";
import HeroSlider from "@/components/hero-slider";
import type { HeroSlideData } from "@/lib/hero-slides";
import StoreContact from "@/components/store-contact";
import { HomeCampaigns, HomeStory } from "@/components/home-sections";

import type { HomeSectionData } from "@/lib/home-sections";
import {
  ArrowRight,
  Grid2X2,
  Heart,
  House,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import {
  readWishlistIds,
  toggleWishlist,
  useWishlistSnapshot,
} from "@/lib/wishlist-store";

import type { StoreCategory, StoreProduct } from "@/lib/catalog";

type Props = {
  categories: StoreCategory[];
  products: StoreProduct[];
  mode:
    | "home"
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "wishlist"
    | "account";
  children?: ReactNode;
  query?: string;
  selectedCategory?: string;
  total?: number;
  page?: number;
  totalPages?: number;
  heroSlides?: HeroSlideData[];
  homeSections?: HomeSectionData[];
};

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

function Brand() {
  return (
    <Link href="/" className="brand brand-original" aria-label="BIMLAY home">
      <Image
        src="/branding/bimlay-logo.png"
        alt="BIMLAY — Fashion & Lifestyle"
        width={256}
        height={256}
        className="original-logo"
        unoptimized
      />
    </Link>
  );
}

export default function Storefront({
  categories,
  products,
  mode,
  query = "",
  selectedCategory = "",
  total = 0,
  page = 1,
  totalPages = 1,
  children,
  heroSlides = [],
  homeSections = [],
}: Props) {
  const cartCount = useCartCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const wishlistSnapshot = useWishlistSnapshot();
  const saved = readWishlistIds(wishlistSnapshot);
  const visibleProducts = products;
  const [notice, setNotice] = useState("");

  const mainCategories = categories.filter(
    (category) => category.parentId === null,
  );

  <h2>{mode === "home" ? "Featured Picks" : "The Collection"}</h2>;

  function categoryHref(slug: string) {
    return `/shop?category=${encodeURIComponent(slug)}`;
  }

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (selectedCategory) params.set("category", selectedCategory);
    params.set("page", String(targetPage));

    return `/shop?${params.toString()}`;
  }

  function toggleSaved(id: string) {
    try {
      toggleWishlist(id);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not update your wishlist.",
      );
    }
  }

  return (
    <>
      <div className="announcement">BIMLAY — A MORE CONSIDERED EVERYDAY</div>

      <header className="site-header">
        <div className="shell header-inner">
          <nav className="desktop-links" aria-label="Shop navigation">
            <Link href="/shop">Shop</Link>

            {mainCategories.slice(0, 4).map((category) => (
              <Link key={category.id} href={categoryHref(category.slug)}>
                {category.name}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="icon-button mobile-menu-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="store-mobile-menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>

          <Brand />

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Search products"
              aria-expanded={searchOpen}
              aria-controls="store-search"
              onClick={() => setSearchOpen((current) => !current)}
            >
              <Search size={21} strokeWidth={1.5} />
            </button>

            <Link
              href="/wishlist"
              className="icon-button header-wishlist"
              aria-label={`Wishlist, ${saved.length} saved products`}
            >
              <Heart size={21} strokeWidth={1.5} />

              {saved.length > 0 && (
                <span className="cart-count">{saved.length}</span>
              )}
            </Link>

            <Link
              href="/account"
              className="icon-button header-account"
              aria-label="My account"
            >
              <UserRound size={21} strokeWidth={1.5} />
            </Link>

            <Link
              href="/cart"
              className="icon-button"
              aria-label={`Shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={21} strokeWidth={1.5} />

              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <form
            id="store-search"
            action="/shop"
            method="get"
            className="store-search shell"
          >
            <input
              name="q"
              type="search"
              placeholder="Search by product name or SKU"
              defaultValue={query}
              maxLength={100}
              aria-label="Search by product name or SKU"
            />

            <button type="submit" className="primary-button">
              Search
            </button>
          </form>
        )}

        {menuOpen && (
          <nav
            id="store-mobile-menu"
            className="mobile-menu"
            aria-label="Mobile shop navigation"
          >
            <Link href="/shop" onClick={() => setMenuOpen(false)}>
              All products
            </Link>

            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(category.slug)}
                onClick={() => setMenuOpen(false)}
              >
                {category.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main>
        {children}
        {mode === "home" && (
          <>
            <HeroSlider slides={heroSlides} categories={mainCategories} />

            <HomeCampaigns sections={homeSections} />
          </>
        )}

        {(mode === "home" || mode === "shop") && (
          <section id="products" className="products-section shell">
            <div className="section-heading">
              <div>
                <h2>{mode === "home" ? "Featured Picks" : "The Collection"}</h2>

                <p>
                  {mode === "home"
                    ? "A thoughtful selection for your everyday."
                    : `${total} products found`}
                </p>
              </div>

              {mode === "home" && (
                <Link href="/shop" className="text-link">
                  View all <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {mode === "shop" && (
              <form action="/shop" method="get" className="store-filter">
                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  maxLength={100}
                  placeholder="Search products"
                  aria-label="Search products"
                />

                <select
                  name="category"
                  defaultValue={selectedCategory}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.label}
                    </option>
                  ))}
                </select>

                <button type="submit" className="primary-button">
                  Apply
                </button>

                <Link href="/shop" className="text-link">
                  Reset
                </Link>
              </form>
            )}

            {visibleProducts.length === 0 && (
              <div className="store-empty">
                {mode === "home"
                  ? "Our featured collection is being prepared."
                  : "No products match your search. Try another category or search term."}
              </div>
            )}

            <div className="product-grid">
              {visibleProducts.map((product) => {
                const isSaved = saved.includes(product.id);

                return (
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
                        aria-label={
                          isSaved
                            ? `Unsave ${product.name}`
                            : `Save ${product.name}`
                        }
                        aria-pressed={isSaved}
                        onClick={() => toggleSaved(product.id)}
                      >
                        <Heart
                          size={17}
                          strokeWidth={1.5}
                          fill={isSaved ? "#816334" : "none"}
                          color={isSaved ? "#816334" : "currentColor"}
                        />
                      </button>

                      {!product.inStock && (
                        <span className="store-stock-label">Out of stock</span>
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
                );
              })}
            </div>

            {mode === "shop" && totalPages > 1 && (
              <nav className="store-pagination" aria-label="Product pages">
                {page > 1 && <Link href={pageHref(page - 1)}>Previous</Link>}

                <span>
                  Page {page} of {totalPages}
                </span>

                {page < totalPages && (
                  <Link href={pageHref(page + 1)}>Next</Link>
                )}
              </nav>
            )}
          </section>
        )}

        {mode === "home" && <HomeStory sections={homeSections} />}
      </main>

      <footer className="site-footer">
        <div className="shell">
          <div className="footer-grid">
            <div className="footer-brand">
              <Brand />
              <p className="footer-description">
                Fashion and lifestyle essentials for a more considered everyday.
              </p>
            </div>

            <div className="footer-links">
              <h3>Explore</h3>

              {mainCategories.map((category) => (
                <Link key={category.id} href={categoryHref(category.slug)}>
                  {category.name}
                </Link>
              ))}
            </div>

            <div className="footer-links">
              <h3>BIMLAY</h3>
              <Link href="/">Home</Link>
              <Link href="/shop">All products</Link>
            </div>
          </div>

          <StoreContact />

          <div className="footer-bottom">
            © 2026 BIMLAY. All rights reserved.
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Mobile shopping navigation">
        <Link href="/" className={mode === "home" ? "active" : ""}>
          <House size={22} strokeWidth={1.5} />
          <span>Home</span>
        </Link>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="store-mobile-menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Grid2X2 size={22} strokeWidth={1.5} />
          <span>Categories</span>
        </button>

        <Link
          href="/wishlist"
          className={mode === "wishlist" ? "active" : ""}
          aria-label={`Wishlist, ${saved.length} saved products`}
        >
          <Heart size={22} strokeWidth={1.5} />
          <span>Wishlist{saved.length > 0 ? ` (${saved.length})` : ""}</span>
        </Link>

        <Link href="/cart" className={mode === "cart" ? "active" : ""}>
          <ShoppingBag size={22} strokeWidth={1.5} />
          <span>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</span>
        </Link>

        <Link href="/account" className={mode === "account" ? "active" : ""}>
          <UserRound size={22} strokeWidth={1.5} />
          <span>Account</span>
        </Link>
      </nav>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>

          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      
    </>
  );
}
