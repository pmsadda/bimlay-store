"use client";

import { useActionState } from "react";
import {
  changeCustomerPassword,
  updateCustomerProfile,
} from "@/app/account/actions";

export function CustomerProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateCustomerProfile,
    { error: "", success: "" },
  );

  return (
    <section className="customer-settings-card">
      <h2>Personal information</h2>

      <form action={formAction} className="customer-auth-form">
        <fieldset disabled={pending}>
          <label>
            <span>Full name</span>
            <input
              name="name"
              defaultValue={name}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </label>

          <label>
            <span>Email address</span>
            <input
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
            />
          </label>

          <div aria-live="polite" aria-atomic="true">
            {state.error && (
              <p className="admin-form-error">{state.error}</p>
            )}

            {state.success && (
              <p className="category-success">{state.success}</p>
            )}
          </div>

          <button type="submit" className="primary-button">
            {pending ? "Saving..." : "Save profile"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}

export function CustomerPasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeCustomerPassword,
    { error: "" },
  );

  return (
    <section className="customer-settings-card">
      <h2>Change password</h2>

      <p className="category-help">
        You will need to sign in again on your devices after changing
        your password.
      </p>

      <form action={formAction} className="customer-auth-form">
        <fieldset disabled={pending}>
          <label>
            <span>Current password</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>

          <label>
            <span>New password</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label>
            <span>Confirm new password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <p className="category-help">
            Use at least 12 characters.
          </p>

          <div aria-live="polite" aria-atomic="true">
            {state.error && (
              <p className="admin-form-error">{state.error}</p>
            )}
          </div>

          <button type="submit" className="primary-button">
            {pending ? "Updating..." : "Change password"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}