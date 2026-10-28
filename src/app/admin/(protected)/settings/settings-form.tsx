"use client";

import { useActionState } from "react";
import { saveStoreSettings } from "./actions";

type SettingsData = {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  facebookPageUrl: string;
  supportEmail: string;
  dhakaDeliveryCharge: string;
  outsideDeliveryCharge: string;
  codEnabled: boolean;
};

export default function SettingsForm({
  settings,
}: {
  settings: SettingsData | null;
}) {
  const [state, formAction, pending] = useActionState(saveStoreSettings, {
    error: "",
    success: "",
  });

  return (
    <form action={formAction} className="category-form">
      <fieldset disabled={pending}>
        <div className="category-form-grid">
          <label>
            <span>Store name</span>
            <input
              name="storeName"
              defaultValue={settings?.storeName ?? "BIMLAY"}
              minLength={2}
              maxLength={100}
              required
            />
          </label>

          <label>
            <span>Customer support phone — optional</span>
            <input
              name="supportPhone"
              type="tel"
              defaultValue={settings?.supportPhone ?? ""}
              placeholder="Your customer support number"
              maxLength={25}
            />
          </label>

          <label>
            <span>WhatsApp number - optional</span>
            <input
              name="whatsappNumber"
              type="tel"
              defaultValue={settings?.whatsappNumber ?? ""}
              placeholder="01XXXXXXXXX"
              maxLength={30}
            />
            <small>
              Use a number with an active WhatsApp account. Leave empty to hide
              the WhatsApp icon.
            </small>
          </label>

          <label>
            <span>Facebook page link - optional</span>
            <input
              name="facebookPageUrl"
              type="url"
              defaultValue={settings?.facebookPageUrl ?? ""}
              placeholder="https://www.facebook.com/yourpage"
              maxLength={500}
            />
          </label>

          <label>
            <span>Customer support email - optional</span>
            <input
              name="supportEmail"
              type="email"
              defaultValue={settings?.supportEmail ?? ""}
              placeholder="Your business email"
              maxLength={254}
            />
          </label>

          <label>
            <span>Inside Dhaka delivery charge — BDT</span>
            <input
              name="dhakaDeliveryCharge"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue={settings?.dhakaDeliveryCharge ?? ""}
              placeholder="Enter delivery charge"
              required
            />
          </label>

          <label>
            <span>Outside Dhaka delivery charge — BDT</span>
            <input
              name="outsideDeliveryCharge"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue={settings?.outsideDeliveryCharge ?? ""}
              placeholder="Enter delivery charge"
              required
            />
          </label>
        </div>

        <label className="category-checkbox">
          <input
            name="codEnabled"
            type="checkbox"
            defaultChecked={settings?.codEnabled ?? true}
          />
          <span>Enable Cash on Delivery</span>
        </label>

        <p className="category-help">
          Enter 0 for free delivery. These charges apply to the whole order, not
          to each item.
        </p>

        <p className="category-help">
          Online payments are not connected yet. Turning off Cash on Delivery
          will prevent new orders until another payment method is available.
        </p>

        <button type="submit" className="primary-button">
          {pending ? "Saving..." : "Save settings"}
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {state.error && <p className="admin-form-error">{state.error}</p>}

        {state.success && <p className="category-success">{state.success}</p>}
      </div>
    </form>
  );
}
