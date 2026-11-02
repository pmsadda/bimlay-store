"use client";

import Image from "next/image";
import Link from "next/link";

import { useCartCount } from "@/lib/cart-store";
import HeroSlider from "@/components/hero-slider";
import type { HeroSlideData } from "@/lib/hero-slides";
import StoreContact from "@/components/store-contact";
import { HomeCampaigns, HomeStory } from "@/components/home-sections";
import { useEffect, useRef, useState, type ReactNode } from "react";
import LiveSearch from "@/components/live-search";

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
  categoryProducts?: {
    category: StoreCategory;
    products: StoreProduct[];
  }[];
  flashProducts?: StoreProduct[];
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
  filterSizes?: string[];
  filterColors?: string[];
  minPrice?: string;
  maxPrice?: string;
  selectedSize?: string;
  selectedColor?: string;
  inStockOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
};

function money(value: string) {
  return `৳ ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

function ProductPrice({ product }: { product: StoreProduct }) {
  const isFlash =
    product.flashPrice && product.flashSaleEnd && Number(product.price) > 0;

  if (isFlash) {
    const discount = Math.round(
      (1 - Number(product.flashPrice) / Number(product.price)) * 100,
    );
    return (
      <>
        {product.hasMultipleVariants && (
          <span className="store-from">From </span>
        )}
        <strong className="flash-price">{money(product.flashPrice!)}</strong>{" "}
        <del className="store-regular-price">{money(product.price)}</del>
        <span className="flash-badge">⚡ -{discount}%</span>
      </>
    );
  }

  return (
    <>
      {product.hasMultipleVariants && <span className="store-from">From </span>}
      {money(product.price)}
      {product.regularPrice && (
        <del className="store-regular-price">{money(product.regularPrice)}</del>
      )}
    </>
  );
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
  categoryProducts = [],
  mode,
  flashProducts = [],
  query = "",
  selectedCategory = "",
  total = 0,
  page = 1,
  totalPages = 1,
  children,
  heroSlides = [],
  homeSections = [],
  filterSizes = [],
  filterColors = [],
  minPrice = "",
  maxPrice = "",
  selectedSize = "",
  selectedColor = "",
  inStockOnly = false,
  sort = "newest",
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

  const categoryCarouselRef = useRef<HTMLDivElement>(null);
  const categoryCount = mainCategories.length;

   useEffect(() => {
    const track = categoryCarouselRef.current;

    if (mode !== "home" || !track) return;

    // motion কমাতে চাইলে skip
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let paused = false;

    function pause() {
      paused = true;
    }

    function resume() {
      paused = false;
    }

    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("touchend", resume, { passive: true });
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resume);

    // ⚡ প্রতি ৩ সেকেন্ডে পরের category-তে slide
    const interval = window.setInterval(() => {
      if (paused) return;
      if (document.visibilityState !== "visible") return;
      if (!track) return;

      const firstCard = track.querySelector<HTMLElement>(".home-category-card");
      if (!firstCard) return;

      const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const maxScroll = track.scrollWidth - track.clientWidth;

      if (maxScroll < 4) return;

      // শেষে পৌঁছালে আবার শুরুতে
      if (track.scrollLeft >= maxScroll - 3) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollTo({
          left: Math.min(track.scrollLeft + step, maxScroll),
          behavior: "smooth",
        });
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      track.removeEventListener("mouseenter", pause);
      track.removeEventListener("mouseleave", resume);
      track.removeEventListener("touchstart", pause);
      track.removeEventListener("touchend", resume);
      track.removeEventListener("focusin", pause);
      track.removeEventListener("focusout", resume);
    };
  }, [mode]);

  function categoryHref(slug: string) {
    return `/shop?category=${encodeURIComponent(slug)}`;
  }

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (selectedCategory) {
      params.set("category", selectedCategory);
    }
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (inStockOnly) params.set("inStock", "1");
    if (sort !== "newest") params.set("sort", sort);

    params.set("page", String(targetPage));

    return `/shop?${params.toString()}`;
  }

  function shopCategoryHref(slug = "") {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (slug) params.set("category", slug);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("color", selectedColor);
    if (inStockOnly) params.set("inStock", "1");
    if (sort !== "newest") params.set("sort", sort);

    const search = params.toString();
    return search ? `/shop?${search}` : "/shop";
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
            <LiveSearch initialQuery={query} />

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
            <HeroSlider slides={heroSlides} />

            {mainCategories.length > 0 && (
              <section
                className="home-category-section shell"
                aria-labelledby="home-category-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Curated for every day</p>
                    <h2 id="home-category-title">Shop by category</h2>
                  </div>
                  <Link href="/shop" className="text-link">
                    Explore all <ArrowRight size={16} />
                  </Link>
                </div>

                <div
                  className="home-category-grid"
                  ref={categoryCarouselRef}
                  aria-label="Shop by category"
                >
                  {mainCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={categoryHref(category.slug)}
                      className="home-category-card"
                    >
                      <div className="home-category-media">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="home-category-img"
                          />
                        ) : (
                          <span className="home-category-placeholder">
                            BIMLAY
                          </span>
                        )}
                      </div>
                      <div className="home-category-caption">
                        <span>{category.name}</span>
                        <ArrowRight size={20} aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ⚡ Flash Sale section — একবারই */}
            {flashProducts.length > 0 && (
              <section
                id="flash-sale"
                className="flash-sale-section shell"
                aria-labelledby="flash-sale-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow" style={{ color: "#dc2626" }}>
                      ⚡ Limited time only
                    </p>
                    <h2 id="flash-sale-title" style={{ color: "#dc2626" }}>
                      Flash Sale
                    </h2>
                    <p>Grab these deals before the timer runs out.</p>
                  </div>

                  <Link href="/shop" className="text-link">
                    View all <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="product-grid">
                  {flashProducts.map((product) => {
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
                              <ProductPrice product={product} />
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <HomeCampaigns sections={homeSections} />
          </>
        )}

        {(mode === "home" || mode === "shop") && (
          <section id="products" className="products-section shell">
            <div className="section-heading">
              <div>
                <h2>
                  {mode === "home"
                    ? "Featured Picks"
                    : (categories.find(
                        (category) => category.slug === selectedCategory,
                      )?.name ?? "Shop All Products")}
                </h2>

                <p>
                  {mode === "home"
                    ? "A Thoughtful Selection For Your Everyday."
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
              <div className="shop-tools">
                <nav
                  className="shop-category-tabs"
                  aria-label="Product categories"
                >
                  <Link
                    href={shopCategoryHref()}
                    aria-current={!selectedCategory ? "page" : undefined}
                  >
                    All products
                  </Link>

                  {mainCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={shopCategoryHref(category.slug)}
                      aria-current={
                        selectedCategory === category.slug ? "page" : undefined
                      }
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
                <details className="shop-filter-panel" open={Boolean(query)}>
                  <summary>Search &amp; filters</summary>

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

                    <div className="shop-advanced-filters">
                      <label>
                        <span>Minimum price (৳)</span>
                        <input
                          name="minPrice"
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.01"
                          defaultValue={minPrice}
                          placeholder="From"
                        />
                      </label>

                      <label>
                        <span>Maximum price (৳)</span>
                        <input
                          name="maxPrice"
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.01"
                          defaultValue={maxPrice}
                          placeholder="To"
                        />
                      </label>

                      <label>
                        <span>Size</span>
                        <select name="size" defaultValue={selectedSize}>
                          <option value="">All sizes</option>
                          {filterSizes.map((sizeOption) => (
                            <option key={sizeOption} value={sizeOption}>
                              {sizeOption}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Colour</span>
                        <select name="color" defaultValue={selectedColor}>
                          <option value="">All colours</option>
                          {filterColors.map((colorOption) => (
                            <option key={colorOption} value={colorOption}>
                              {colorOption}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Sort by</span>
                        <select name="sort" defaultValue={sort}>
                          <option value="newest">Newest first</option>
                          <option value="price_asc">Price: low to high</option>
                          <option value="price_desc">Price: high to low</option>
                        </select>
                      </label>

                      <label className="shop-stock-filter">
                        <input
                          name="inStock"
                          type="checkbox"
                          value="1"
                          defaultChecked={inStockOnly}
                        />
                        <span>In stock only</span>
                      </label>
                    </div>

                    <button type="submit" className="primary-button">
                      Apply
                    </button>
                    <Link href="/shop" className="text-link">
                      Reset
                    </Link>
                  </form>
                </details>
              </div>
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
                          <ProductPrice product={product} />
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

            {/* Category-Wise Product Grids */}
            {mode === "home" &&
              categoryProducts &&
              categoryProducts.length > 0 &&
              categoryProducts.map(({ category, products: catProducts }) => {
                if (!catProducts || catProducts.length === 0) return null;

                return (
                  <div
                    key={category.id}
                    className="category-showcase-block"
                    style={{ marginTop: "3.5rem" }}
                  >
                    <div className="section-heading">
                      <div>
                        <h2>{category.name}</h2>
                        <p>
                          Explore our latest {category.name.toLowerCase()}{" "}
                          collection
                        </p>
                      </div>

                      <Link
                        href={categoryHref(category.slug)}
                        className="text-link"
                      >
                        View all <ArrowRight size={14} />
                      </Link>
                    </div>

                    <div className="product-grid">
                      {catProducts.map((product) => {
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
                                  <ProductPrice product={product} />
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
