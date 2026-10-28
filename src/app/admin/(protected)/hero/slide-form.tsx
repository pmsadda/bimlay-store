"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import ImageUpload from "@/components/admin/image-upload";
import type { HeroSlideData } from "@/lib/hero-slides";
import { saveHeroSlide } from "./actions";

export default function SlideForm({
  slide,
}: {
  slide?: HeroSlideData;
}) {
  const [state, formAction, pending] = useActionState(
    saveHeroSlide,
    { error: "", success: "" },
  );

  const [desktopImage, setDesktopImage] = useState(
    slide?.desktopImage ?? "",
  );

  const [mobileImage, setMobileImage] = useState(
    slide?.mobileImage ?? "",
  );

  return (
    <form action={formAction} className="category-form">
      <input type="hidden" name="id" value={slide?.id ?? ""} />
      <input
        type="hidden"
        name="desktopImage"
        value={desktopImage}
      />
      <input
        type="hidden"
        name="mobileImage"
        value={mobileImage}
      />

      <fieldset disabled={pending}>
        <div className="category-form-grid">
          <label>
            <span>Small heading — optional</span>
            <input
              name="eyebrow"
              defaultValue={slide?.eyebrow ?? ""}
              placeholder="The new collection"
              maxLength={50}
            />
          </label>

          <label>
            <span>Main title</span>
            <input
              name="title"
              defaultValue={slide?.title ?? ""}
              placeholder="Objects of everyday desire."
              minLength={2}
              maxLength={90}
              required
            />
          </label>

          <label className="category-full-width">
            <span>Short description — optional</span>
            <textarea
              name="subtitle"
              defaultValue={slide?.subtitle ?? ""}
              rows={2}
              maxLength={240}
            />
          </label>

          <label>
            <span>Button text</span>
            <input
              name="buttonText"
              defaultValue={slide?.buttonText ?? "Shop Collection"}
              minLength={2}
              maxLength={40}
              required
            />
          </label>

          <label>
            <span>Button link</span>
            <input
              name="buttonHref"
              defaultValue={slide?.buttonHref ?? "/shop"}
              placeholder="/shop?category=women"
              maxLength={300}
              required
            />
          </label>

          <label>
            <span>Image description — alt text</span>
            <input
              name="altText"
              defaultValue={slide?.altText ?? ""}
              placeholder="Describe what appears in this banner"
              minLength={2}
              maxLength={180}
              required
            />
          </label>

          <label>
            <span>Display order</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              step={1}
              defaultValue={slide?.sortOrder ?? 10}
              required
            />
          </label>
        </div>

        <div className="hero-image-editors">
          <section>
            <h3>Desktop image</h3>
            <p className="category-help">
              Recommended size: 1600 × 650 pixels.
            </p>

            {desktopImage && (
              <Image
                src={desktopImage}
                alt="Selected desktop banner"
                width={640}
                height={260}
                className="hero-admin-preview"
                unoptimized
              />
            )}

            <ImageUpload
              onUploaded={(image) => setDesktopImage(image.url)}
            />
          </section>

          <section>
            <h3>Mobile image — optional</h3>
            <p className="category-help">
              Recommended size: 800 × 900 pixels.
              Without this image, desktop artwork is used.
            </p>

            {mobileImage && (
              <>
                <Image
                  src={mobileImage}
                  alt="Selected mobile banner"
                  width={300}
                  height={338}
                  className="hero-admin-preview hero-admin-mobile"
                  unoptimized
                />

                <button
                  type="button"
                  className="product-small-button"
                  onClick={() => setMobileImage("")}
                >
                  Use desktop image on mobile
                </button>
              </>
            )}

            <ImageUpload
              onUploaded={(image) => setMobileImage(image.url)}
            />
          </section>
        </div>

        <label className="category-checkbox">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={slide?.isActive ?? true}
          />
          <span>Show this slide on the homepage</span>
        </label>

        <p className="category-help">
          Lower display order appears first. Keep headings short.
        </p>

        <button
          type="submit"
          className="primary-button"
          disabled={!desktopImage}
        >
          {pending
            ? "Saving..."
            : slide
              ? "Save slide"
              : "Create slide"}
        </button>
      </fieldset>

      <div aria-live="polite">
        {state.error && (
          <p className="admin-form-error">{state.error}</p>
        )}

        {state.success && (
          <p className="category-success">{state.success}</p>
        )}
      </div>
    </form>
  );
}