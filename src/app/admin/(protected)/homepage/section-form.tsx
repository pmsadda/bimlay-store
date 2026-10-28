"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import ImageUpload from "@/components/admin/image-upload";
import type { HomeSectionData } from "@/lib/home-sections";
import { saveHomeSection } from "./actions";

type SectionKey = "FOR_HIM" | "FOR_HER" | "STORY";

const defaults: Record<
  SectionKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    buttonText: string;
    buttonHref: string;
  }
> = {
  FOR_HIM: {
    eyebrow: "Discover",
    title: "For Him",
    description: "Timeless essentials for modern living.",
    buttonText: "Shop Men",
    buttonHref: "/shop?category=men",
  },
  FOR_HER: {
    eyebrow: "Explore",
    title: "For Her",
    description: "Elegant pieces for every version of you.",
    buttonText: "Shop Women",
    buttonHref: "/shop?category=women",
  },
  STORY: {
    eyebrow: "Our story",
    title: "A more considered way of living.",
    description:
      "Discover fashion and lifestyle essentials for your everyday.",
    buttonText: "Explore the collection",
    buttonHref: "/shop",
  },
};

export default function HomeSectionForm({
  sectionKey,
  section,
}: {
  sectionKey: SectionKey;
  section?: HomeSectionData;
}) {
  const initial = defaults[sectionKey];

  const [state, formAction, pending] = useActionState(
    saveHomeSection,
    { error: "", success: "" },
  );

  const [imageUrl, setImageUrl] = useState(
    section?.imageUrl ?? "",
  );

  const [mobileImageUrl, setMobileImageUrl] = useState(
    section?.mobileImageUrl ?? "",
  );

  return (
    <form action={formAction} className="category-form">
      <input type="hidden" name="sectionKey" value={sectionKey} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input
        type="hidden"
        name="mobileImageUrl"
        value={mobileImageUrl}
      />

      <fieldset disabled={pending}>
        <div className="category-form-grid">
          <label>
            <span>Small heading</span>
            <input
              name="eyebrow"
              defaultValue={section?.eyebrow ?? initial.eyebrow}
              maxLength={50}
            />
          </label>

          <label>
            <span>Main title</span>
            <input
              name="title"
              defaultValue={section?.title ?? initial.title}
              minLength={2}
              maxLength={120}
              required
            />
          </label>

          <label className="category-full-width">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={
                section?.description ?? initial.description
              }
              rows={3}
              maxLength={500}
            />
          </label>

          <label>
            <span>Button text</span>
            <input
              name="buttonText"
              defaultValue={
                section?.buttonText ?? initial.buttonText
              }
              minLength={2}
              maxLength={40}
              required
            />
          </label>

          <label>
            <span>Button link</span>
            <input
              name="buttonHref"
              defaultValue={
                section?.buttonHref ?? initial.buttonHref
              }
              maxLength={300}
              required
            />
          </label>

          <label className="category-full-width">
            <span>Image description — alt text</span>
            <input
              name="altText"
              defaultValue={section?.altText ?? ""}
              maxLength={180}
              placeholder="Describe what appears in the image"
            />
          </label>
        </div>

        <div className="hero-image-editors">
          <section>
            <h3>Main image</h3>

            {imageUrl && (
              <Image
                src={imageUrl}
                alt="Selected section image"
                width={600}
                height={400}
                className="hero-admin-preview"
                unoptimized
              />
            )}

            <ImageUpload
              onUploaded={(image) => setImageUrl(image.url)}
            />
          </section>

          <section>
            <h3>Mobile image — optional</h3>

            {mobileImageUrl && (
              <>
                <Image
                  src={mobileImageUrl}
                  alt="Selected mobile section image"
                  width={400}
                  height={300}
                  className="hero-admin-preview"
                  unoptimized
                />

                <button
                  type="button"
                  className="product-small-button"
                  onClick={() => setMobileImageUrl("")}
                >
                  Use main image on mobile
                </button>
              </>
            )}

            <ImageUpload
              onUploaded={(image) =>
                setMobileImageUrl(image.url)
              }
            />
          </section>
        </div>

        <label className="category-checkbox">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={section?.isActive ?? false}
          />
          <span>Show this section on the homepage</span>
        </label>

        <p className="category-help">
          You can save a hidden section before uploading its images.
        </p>

        <button type="submit" className="primary-button">
          {pending ? "Saving..." : "Save section"}
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