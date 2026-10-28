"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bimlay-wishlist-v1";
const CHANGE_EVENT = "bimlay-wishlist-change";
const MAX_ITEMS = 50;

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

export function readWishlistIds(snapshot: string): string[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return [
      ...new Set(
        parsed.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0 &&
            value.length <= 100,
        ),
      ),
    ].slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function saveIds(ids: string[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ids),
  );

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWishlistSnapshot(): string {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}

export function toggleWishlist(productId: string) {
  if (!productId || productId.length > 100) {
    throw new Error("Invalid product.");
  }

  const ids = readWishlistIds(getSnapshot());

  if (ids.includes(productId)) {
    saveIds(ids.filter((id) => id !== productId));
    return;
  }

  if (ids.length >= MAX_ITEMS) {
    throw new Error("Your wishlist can contain up to 50 products.");
  }

  saveIds([productId, ...ids]);
}

export function removeWishlistItems(productIds: string[]) {
  const remove = new Set(productIds);

  saveIds(
    readWishlistIds(getSnapshot()).filter(
      (id) => !remove.has(id),
    ),
  );
}