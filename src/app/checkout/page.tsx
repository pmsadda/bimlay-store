import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";
import CheckoutForm from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

async function CheckoutContent() {
  await connection();

  const [categories, settings] = await Promise.all([
    getStoreCategories(),
    db.storeSetting.findUnique({
      where: { id: "main" },
    }),
  ]);

  return (
    <Storefront
      mode="checkout"
      categories={categories}
      products={[]}
    >
      {settings?.codEnabled ? (
        <CheckoutForm
          dhakaCharge={settings.dhakaDeliveryCharge.toFixed(2)}
          outsideCharge={settings.outsideDeliveryCharge.toFixed(2)}
        />
      ) : (
        <section className="shell checkout-page">
          <h1>Orders are temporarily unavailable.</h1>
          <p className="category-help">
            Please check back shortly.
          </p>
          <Link href="/shop" className="primary-button">
            Continue browsing
          </Link>
        </section>
      )}
    </Storefront>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Opening checkout...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}