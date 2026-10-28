"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

type UploadedImage = {
  url: string;
  width: number;
  height: number;
  bytes: number;
};

type Props = {
  onUploaded?: (image: UploadedImage) => void;
};

export default function ImageUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);

  async function uploadImage() {
    const file = inputRef.current?.files?.[0];

    setError("");

    if (!file) {
      setError("Choose an image first.");
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size === 0 || file.size > 8 * 1024 * 1024) {
      setError("Choose a non-empty image smaller than 8 MB.");
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();
      formData.set("image", file);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Upload failed.",
        );
      }

      if (
        typeof result.url !== "string" ||
        typeof result.width !== "number" ||
        typeof result.height !== "number" ||
        typeof result.bytes !== "number"
      ) {
        throw new Error("Unexpected upload response.");
      }

      const uploaded: UploadedImage = {
        url: result.url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };

      setImage(uploaded);
      onUploaded?.(uploaded);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="image-upload">
      <label className="image-upload-label">
        <span>Choose an image</span>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
      </label>

      <p className="category-help">
        JPG, PNG or WebP · Maximum 8 MB · Automatically optimised
      </p>

      <button
        type="button"
        className="primary-button"
        onClick={uploadImage}
        disabled={pending}
      >
        <Upload size={16} />
        {pending ? "Uploading..." : "Upload image"}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {error && <p className="admin-form-error">{error}</p>}

        {image && (
          <div className="image-upload-result">
            <p className="category-success">
              Image uploaded successfully.
            </p>

            <div className="image-upload-preview">
              <Image
                src={image.url}
                alt="Uploaded image preview"
                width={image.width}
                height={image.height}
                unoptimized
              />
            </div>

            <p className="category-help">
              {image.width} × {image.height} px ·{" "}
              {Math.ceil(image.bytes / 1024)} KB · WebP
            </p>

            <label className="image-upload-label">
              <span>Saved image URL</span>
              <input
                type="text"
                value={image.url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}