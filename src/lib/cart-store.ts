"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bimlay-cart-v1";
const CHANGE_EVENT = "bimlay-cart-change";

type CartItem = {
  variantId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  completedOrders: string[];
};

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

function parseState(raw: string): CartState {
  try {
    const parsed = JSON.parse(raw);

    // Supports carts saved before this update.
    const source = Array.isArray(parsed)
      ? parsed
      : parsed?.items;

    const completed = Array.isArray(parsed?.completedOrders)
      ? parsed.completedOrders
      : [];

    const items = new Map<string, number>();

    if (Array.isArray(source)) {
      for (const entry of source.slice(0, 50)) {
        if (
          entry &&
          typeof entry.variantId === "string" &&
          entry.variantId.length > 0 &&
          entry.variantId.length <= 100 &&
          Number.isInteger(entry.quantity) &&
          entry.quantity >= 1 &&
          entry.quantity <= 99
        ) {
          items.set(entry.variantId, entry.quantity);
        }
      }
    }

    return {
      items: [...items].map(([variantId, quantity]) => ({
        variantId,
        quantity,
      })),
      completedOrders: completed
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.length <= 100,
        )
        .slice(-20),
    };
  } catch {
    return { items: [], completedOrders: [] };
  }
}

function writeState(state: CartState) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state),
  );

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useCartSnapshot(): string {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}

export function readCartItems(snapshot: string): CartItem[] {
  return parseState(snapshot).items;
}

export function useCartCount(): number {
  return readCartItems(useCartSnapshot()).reduce(
    (total, item) => total + item.quantity,
    0,
  );
}

export function getCartQuantity(variantId: string): number {
  return (
    readCartItems(getSnapshot()).find(
      (item) => item.variantId === variantId,
    )?.quantity ?? 0
  );
}

export function setCartQuantity(
  variantId: string,
  quantity: number,
) {
  if (
    !variantId ||
    variantId.length > 100 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    throw new Error("Invalid cart quantity.");
  }

  const state = parseState(getSnapshot());

  const existing = state.items.find(
    (item) => item.variantId === variantId,
  );

  if (existing) {
    existing.quantity = quantity;
  } else {
    if (state.items.length >= 50) {
      throw new Error("Your bag can contain up to 50 different items.");
    }

    state.items.push({ variantId, quantity });
  }

  writeState(state);
}

export function removeCartItem(variantId: string) {
  const state = parseState(getSnapshot());

  state.items = state.items.filter(
    (item) => item.variantId !== variantId,
  );

  writeState(state);
}

export function completeCartOrder(
  orderId: string,
  purchasedItems: CartItem[],
) {
  const state = parseState(getSnapshot());

  if (state.completedOrders.includes(orderId)) {
    return;
  }

  const purchased = new Map(
    purchasedItems.map((item) => [
      item.variantId,
      item.quantity,
    ]),
  );

  state.items = state.items
    .map((item) => ({
      ...item,
      quantity: Math.max(
        0,
        item.quantity - (purchased.get(item.variantId) ?? 0),
      ),
    }))
    .filter((item) => item.quantity > 0);

  state.completedOrders = [
    ...state.completedOrders,
    orderId,
  ].slice(-20);

  writeState(state);
}