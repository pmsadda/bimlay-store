"use client";

import { useRef, useState } from "react";

function productUrl() {
  const canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )?.href;

  return canonical || new URL(
    window.location.pathname,
    window.location.origin,
  ).href;
}

export default function ProductShare() {
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const manualInput = useRef<HTMLInputElement>(null);

  function openShare(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    const url = productUrl();

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(url);
      setManualUrl("");
      setMessage("Product link copied.");
    } catch {
      setManualUrl(url);
      setMessage("Select and copy the link below.");

      window.requestAnimationFrame(() => {
        manualInput.current?.focus();
        manualInput.current?.select();
      });
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: document.title,
        url: productUrl(),
      });
      setMessage("");
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      await copyLink();
    }
  }

  return (
    <section className="product-share" aria-label="Share this product">
      <span className="product-share-label">Share this product</span>

      <div className="product-share-actions">
        <button
          type="button"
          onClick={() => {
            const text = `Take a look at this product: ${productUrl()}`;
            openShare(`https://wa.me/?text=${encodeURIComponent(text)}`);
          }}
        >
          WhatsApp
        </button>

        <button
          type="button"
          onClick={() => {
            openShare(
              `https://www.facebook.com/sharer/sharer.php?u=${
                encodeURIComponent(productUrl())
              }`,
            );
          }}
        >
          Facebook
        </button>

        <button type="button" onClick={copyLink}>
          Copy link
        </button>

        <button type="button" onClick={nativeShare}>
          Share
        </button>
      </div>

      <p className="product-share-message" role="status">
        {message}
      </p>

      {manualUrl && (
        <input
          ref={manualInput}
          type="text"
          readOnly
          value={manualUrl}
          aria-label="Product link to copy"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </section>
  );
}