"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type ProductImage = {
  id: string;
  url: string;
  alt: string;
};

export default function ProductGallery({
  images,
}: {
  images: ProductImage[];
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images[index] ?? images[0];

  if (!image) return null;

  function thumbnails() {
    if (images.length < 2) return null;

    return (
      <div className="detail-thumbnails">
        {images.map((item, position) => (
          <button
            key={item.id}
            type="button"
            className={position === index ? "selected" : ""}
            onClick={() => setIndex(position)}
            aria-label={`View product image ${position + 1}`}
            aria-pressed={position === index}
          >
            <Image
              src={item.url}
              alt={item.alt}
              width={90}
              height={110}
              unoptimized
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Product gallery">
      <button
        type="button"
        className="detail-main-image bimlay-gallery-open"
        aria-label="Open larger product image"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Image
          src={image.url}
          alt={image.alt}
          fill
          unoptimized
          priority
          sizes="(max-width: 760px) 100vw, 50vw"
        />
        <span className="bimlay-gallery-hint">
          Tap to enlarge
        </span>
      </button>

      {thumbnails()}

      <dialog
        ref={dialog}
        className="bimlay-image-dialog"
        aria-label="Enlarged product images"
      >
        <div className="bimlay-image-toolbar">
          <span aria-live="polite">
            Image {index + 1} of {images.length}
          </span>

          <button
            type="button"
            onClick={() => dialog.current?.close()}
          >
            Close ×
          </button>
        </div>

        <div className="bimlay-image-preview">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            unoptimized
            sizes="95vw"
          />
        </div>

        {thumbnails()}
      </dialog>
    </section>
  );
}