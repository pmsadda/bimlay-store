"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  price: string;
  inStock: boolean;
};

export default function LiveSearch({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [term, setTerm] = useState(initialQuery);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [open, setOpen] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const searchQuery = term.trim();
  const showResults = open && searchQuery.length >= 2;
  const currentResults =
    loadedQuery === searchQuery ? items : [];

  useEffect(() => {
    if (searchQuery.length < 2) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: { items: Suggestion[] } =
          await response.json();

        if (!controller.signal.aborted) {
          setItems(data.items);
          setLoadedQuery(searchQuery);
          setStatus("ready");
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () =>
      document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <div className="live-search-field" ref={containerRef}>
      <input
        name="q"
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          setStatus("loading");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search by product name or SKU"
        maxLength={100}
        aria-label="Search by product name or SKU"
        aria-controls="live-search-results"

      />

      {showResults && (
        <div
          id="live-search-results"
          className="live-search-results"
          role="status"
          aria-live="polite"
        >
          {status === "loading" ||
          loadedQuery !== searchQuery ? (
            <p className="live-search-message">
              Searching...
            </p>
          ) : status === "error" ? (
            <p className="live-search-message">
              Suggestions are temporarily unavailable.
            </p>
          ) : currentResults.length === 0 ? (
            <p className="live-search-message">
              No matching products.
            </p>
          ) : (
            currentResults.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                className="live-search-item"
                prefetch={false}
                onClick={() => setOpen(false)}
              >
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  width={52}
                  height={58}
                  unoptimized
                />

                <span className="live-search-item-copy">
                  <strong>{item.name}</strong>
                  <small>
                    ৳ {Number(item.price).toLocaleString("en-BD")}
                    {!item.inStock && " · Out of stock"}
                  </small>
                </span>
              </Link>
            ))
          )}

          <button type="submit" className="live-search-all">
            View all results for “{searchQuery}”
          </button>
        </div>
      )}
    </div>
  );
}