import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Storefront from "@/components/storefront";
import {
  getStoreCategories,
  getStoreProducts,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Explore BIMLAY fashion, accessories and lifestyle essentials.",
};

type SearchValues = Record<
  string,
  string | string[] | undefined
>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
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
    Number.isSafeInteger(pageNumber) && pageNumber > 0
      ? pageNumber
      : 1;

  const categories = await getStoreCategories();

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
  });

  return (
    <Storefront
      mode="shop"
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
      fallback={
        <div className="store-loading">
          Loading the collection...
        </div>
      }
    >
      <ShopContent searchParams={searchParams} />
    </Suspense>
  );
}