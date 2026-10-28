"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type ExistingImage = {
  id: string;
  url: string;
  alt: string;
};

type EditableImage = {
  id?: string;
  url: string;
  alt: string;
};

export default function ProductImageEditor({
  images: initialImages,
  productName,
}: {
  images: ExistingImage[];
  productName: string;
}) {
  const [images, setImages] = useState<EditableImage[]>(
    initialImages.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt || productName,
    })),
  );

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (images.length >= 8) {
      setError("A product can have up to 8 images.");
      event.target.value = "";
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image up to 8 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setUploading(true);

    try {
      const body = new FormData();
      body.append("image", file);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });

      const result: unknown = await response.json();

      if (!result || typeof result !== "object") {
        throw new Error("Unexpected upload response.");
      }

      if (!response.ok) {
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Image upload failed.";

        throw new Error(message);
      }

      if (
        !("url" in result) ||
        typeof result.url !== "string" ||
        !/^\/media\/[0-9a-f-]+\.webp$/i.test(result.url)
      ) {
        throw new Error("The upload did not return a valid image.");
      }

      setImages((current) => [
        ...current,
        {
          url: result.url as string,
          alt: productName,
        },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Image upload failed.",
      );
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const destination = index + direction;

      if (destination < 0 || destination >= current.length) {
        return current;
      }

      const next = [...current];

      [next[index], next[destination]] = [
        next[destination],
        next[index],
      ];

      return next;
    });
  }

  return (
    <section className="category-panel">
      <h2 className="product-section-title">Product images</h2>

      <p className="category-help">
        The first image is the main product image. Add up to 8
        images, then save the product to keep your changes.
      </p>

      <input
        type="hidden"
        name="images"
        value={JSON.stringify(images)}
      />

      <input
        type="hidden"
        name="imagesOriginal"
        value={JSON.stringify(
          initialImages.map((image) => image.id),
        )}
      />

      <input
        type="hidden"
        name="imagesUploading"
        value={uploading ? "1" : "0"}
      />

      <div className="product-edit-images">
        {images.map((image, index) => (
          <div
            className="product-edit-image"
            key={image.id ?? image.url}
          >
            <div className="product-edit-image-preview">
              <Image
                src={image.url}
                alt={image.alt}
                width={220}
                height={220}
                unoptimized
              />
            </div>

            <p className="category-help">
              {index === 0
                ? "Main image"
                : `Image ${index + 1}`}
            </p>

            <label>
              <span>Image description (alt text)</span>
              <input
                value={image.alt}
                onChange={(event) => {
                  const alt = event.target.value;

                  setImages((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, alt }
                        : item,
                    ),
                  );
                }}
                minLength={2}
                maxLength={180}
                required
              />
            </label>

            <div className="product-edit-image-buttons">
              <button
                type="button"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0 || uploading}
              >
                Move up
              </button>

              <button
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={
                  index === images.length - 1 || uploading
                }
              >
                Move down
              </button>

              <button
                type="button"
                onClick={() =>
                  setImages((current) =>
                    current.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  )
                }
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="product-edit-upload">
        <span>Add product image</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadImage}
          disabled={uploading || images.length >= 8}
        />
      </label>

      <p className="category-help">
        JPG, PNG or WebP; up to 8 MB. An active product needs at
        least one image.
      </p>

      {uploading && (
        <p role="status">Uploading image...</p>
      )}

      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}