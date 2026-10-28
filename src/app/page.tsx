import { Suspense } from "react";
import { connection } from "next/server";

import Storefront from "@/components/storefront";
import {
  getStoreCategories,
  getStoreProducts,
} from "@/lib/catalog";
import { getHeroSlides } from "@/lib/hero-slides";
import { getHomeSections } from "@/lib/home-sections";

async function HomeContent() {
  await connection();

  const [
    categories,
    catalog,
    heroSlides,
    homeSections,
  ] = await Promise.all([
    getStoreCategories(),
    getStoreProducts({ featured: true }),
    getHeroSlides(),
    getHomeSections(),
  ]);

  return (
    <Storefront
      mode="home"
      categories={categories}
      products={catalog.products}
      heroSlides={heroSlides}
      homeSections={homeSections}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Opening BIMLAY...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}