import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import SettingsForm from "./settings-form";

export default async function StoreSettingsPage() {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can manage store settings.</p>
      </section>
    );
  }

  const settings = await db.storeSetting.findUnique({
    where: { id: "main" },
  });

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Store configuration</p>
        <h1>Store settings</h1>
        <p>Manage store contacts, delivery charges and Cash on Delivery.</p>
      </section>

      {!settings && (
        <section className="admin-next-step settings-introduction">
          <h2>Configure delivery before checkout.</h2>
          <p>
            Save your delivery charges and payment settings below. Checkout will
            require these settings.
          </p>
        </section>
      )}

      <section className="category-panel">
        <SettingsForm
          settings={
            settings
              ? {
                  storeName: settings.storeName,
                  supportPhone: settings.supportPhone ?? "",
                  whatsappNumber: settings.whatsappNumber ?? "",
                  facebookPageUrl: settings.facebookPageUrl ?? "",
                  supportEmail: settings.supportEmail ?? "",
                  dhakaDeliveryCharge: settings.dhakaDeliveryCharge.toFixed(2),
                  outsideDeliveryCharge:
                    settings.outsideDeliveryCharge.toFixed(2),
                  codEnabled: settings.codEnabled,
                }
              : null
          }
        />
      </section>
    </>
  );
}
