import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { requireCustomer } from "@/lib/customer-auth";
import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";
import {
  CustomerPasswordForm,
  CustomerProfileForm,
} from "@/components/customer-settings-forms";

export const metadata: Metadata = {
  title: "Account Settings",
};

async function ProfileContent() {
  await connection();

  const customer = await requireCustomer();
  const categories = await getStoreCategories();

  return (
    <Storefront
      mode="account"
      categories={categories}
      products={[]}
    >
      <section className="shell customer-account">
        <Link href="/account" className="text-link">
          Back to account
        </Link>

        <div className="cart-heading account-settings-heading">
          <p className="eyebrow">Your personal space</p>
          <h1>Account settings</h1>
        </div>

        <div className="customer-settings-grid">
          <CustomerProfileForm
            name={customer.name}
            email={customer.email}
          />

          <CustomerPasswordForm />
        </div>
      </section>
    </Storefront>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Opening account settings...
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}