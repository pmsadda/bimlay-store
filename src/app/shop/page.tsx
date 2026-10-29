import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Storefront from "@/components/storefront";
import {
  getShopFilterOptions,
  getStoreCategories,
  getStoreProducts,
  type ShopSort,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explore BIMLAY fashion, accessories and lifestyle essentials.",
};

type SearchValues = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function priceValue(value: string): number | undefined {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const price = Number(value);
  return price <= 1000000 ? price : undefined;
}

async function ShopContent({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  await connection();

  const params = await searchParams;

  const query = single(params.q).trim().slice(0, 100);
  const categorySlug = single(params.category).trim();
  const rawPage = single(params.page);
  const pageNumber = Number(rawPage || "1");

  const page =
    Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const minPrice = priceValue(single(params.minPrice));
  const maxPrice = priceValue(single(params.maxPrice));
  const size = single(params.size).trim().slice(0, 40);
  const color = single(params.color).trim().slice(0, 60);
  const inStockOnly = single(params.inStock) === "1";

  const requestedSort = single(params.sort);
  const sort: ShopSort =
    requestedSort === "price_asc" || requestedSort === "price_desc"
      ? requestedSort
      : "newest";

  const [categories, filterOptions] = await Promise.all([
    getStoreCategories(),
    getShopFilterOptions(),
  ]);

  const category = categorySlug
    ? categories.find((item) => item.slug === categorySlug)
    : undefined;

  if (categorySlug && !category) {
    notFound();
  }

  const catalog = await getStoreProducts({
    query,
    categoryId: category?.id,
    page,
    minPrice,
    maxPrice:
      minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice
        ? undefined
        : maxPrice,
    size,
    color,
    inStockOnly,
    sort,
  });

  return (
    <Storefront
      mode="shop"
      filterSizes={filterOptions.sizes}
      filterColors={filterOptions.colors}
      minPrice={minPrice?.toString() ?? ""}
      maxPrice={maxPrice?.toString() ?? ""}
      selectedSize={size}
      selectedColor={color}
      inStockOnly={inStockOnly}
      sort={sort}
      categories={categories}
      products={catalog.products}
      query={query}
      selectedCategory={categorySlug}
      total={catalog.total}
      page={catalog.currentPage}
      totalPages={catalog.totalPages}
    />
  );
}

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  return (
    <Suspense
      fallback={<div className="store-loading">Loading the collection...</div>}
    >
      <ShopContent searchParams={searchParams} />
    </Suspense>
  );
}
