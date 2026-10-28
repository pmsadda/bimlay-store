import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";
import WishlistPageContent from "@/components/wishlist-page";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: {
    index: false,
    follow: true,
  },
};

async function WishlistContent() {
  await connection();

  const categories = await getStoreCategories();

  return (
    <Storefront
      mode="wishlist"
      categories={categories}
      products={[]}
    >
      <WishlistPageContent />
    </Storefront>
  );
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Opening your wishlist...
        </div>
      }
    >
      <WishlistContent />
    </Suspense>
  );
}