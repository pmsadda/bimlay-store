import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import Storefront from "@/components/storefront";
import CartPageContent from "@/components/cart-page";
import { getStoreCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shopping Bag",
  robots: {
    index: false,
    follow: true,
  },
};

async function CartContent() {
  await connection();

  const categories = await getStoreCategories();

  return (
    <Storefront
      mode="cart"
      categories={categories}
      products={[]}
    >
      <CartPageContent />
    </Storefront>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Opening your shopping bag...
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}