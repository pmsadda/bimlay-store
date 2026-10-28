"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import ImageUpload from "@/components/admin/image-upload";
import { createProduct } from "./actions";

type CategoryOption = {
  id: string;
  name: string;
};

type Variant = {
  key: number;
  sku: string;
  size: string;
  color: string;
  price: string;
  compareAtPrice: string;
  stock: string;
};

type ProductImage = {
  url: string;
};

function emptyVariant(key: number): Variant {
  return {
    key,
    sku: "",
    size: "",
    color: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
  };
}

export default function ProductForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createProduct,
    { error: "" },
  );

  const nextKey = useRef(1);

  const [variants, setVariants] = useState<Variant[]>([
    emptyVariant(0),
  ]);

  const [images, setImages] = useState<ProductImage[]>([]);

  function updateVariant(
    key: number,
    field: keyof Omit<Variant, "key">,
    value: string,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === key
          ? { ...variant, [field]: value }
          : variant,
      ),
    );
  }

  function addVariant() {
    const key = nextKey.current;
    nextKey.current += 1;

    setVariants((current) => [
      ...current,
      emptyVariant(key),
    ]);
  }

  function moveImageUp(index: number) {
    if (index === 0) return;

    setImages((current) => {
      const updated = [...current];
      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];
      return updated;
    });
  }

  return (
    <form action={formAction} className="product-editor">
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(variants)}
      />

      <input
        type="hidden"
        name="images"
        value={JSON.stringify(images)}
      />

      <fieldset disabled={pending}>
        <section className="category-panel">
          <h2 className="product-section-title">
            Product information
          </h2>

          <div className="category-form-grid">
            <label>
              <span>Product name</span>
              <input
                name="name"
                placeholder="Premium Cotton Shirt"
                minLength={2}
                maxLength={180}
                required
              />
            </label>

            <label>
              <span>URL slug</span>
              <input
                name="slug"
                placeholder="premium-cotton-shirt"
                minLength={2}
                maxLength={180}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </label>

            <label>
              <span>Category</span>
              <select name="categoryId" defaultValue="" required>
                <option value="" disabled>
                  Choose a category
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Publication status</span>
              <select name="status" defaultValue="DRAFT">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </label>

            <label className="category-full-width">
              <span>Short description</span>
              <textarea
                name="shortDescription"
                rows={2}
                maxLength={300}
                placeholder="A short introduction to the product"
              />
            </label>

            <label className="category-full-width">
              <span>Full description</span>
              <textarea
                name="description"
                rows={6}
                maxLength={10000}
                placeholder="Material, fit, care instructions and product details"
              />
            </label>
          </div>

          <label className="category-checkbox">
            <input type="checkbox" name="isFeatured" />
            <span>Feature this product on the homepage</span>
          </label>
        </section>

        <section className="category-panel">
          <h2 className="product-section-title">Product images</h2>

          <p className="category-help">
            Add up to 8 images. The first image is the main image.
            Use the up arrow to change their order.
          </p>

          {images.length > 0 && (
            <div className="product-image-selection">
              {images.map((image, index) => (
                <div className="product-selected-image" key={image.url}>
                  <Image
                    src={image.url}
                    alt={`Selected product image ${index + 1}`}
                    width={180}
                    height={180}
                    unoptimized
                  />

                  <span>
                    {index === 0 ? "Main image" : `Image ${index + 1}`}
                  </span>

                  <div className="product-image-controls">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveImageUp(index)}
                      aria-label={`Move image ${index + 1} earlier`}
                    >
                      <ArrowUp size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setImages((current) =>
                          current.filter((item) => item.url !== image.url),
                        )
                      }
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length < 8 && (
            <ImageUpload
              onUploaded={(uploaded) =>
                setImages((current) => {
                  if (
                    current.length >= 8 ||
                    current.some((item) => item.url === uploaded.url)
                  ) {
                    return current;
                  }

                  return [...current, { url: uploaded.url }];
                })
              }
            />
          )}
        </section>

        <section className="category-panel">
          <h2 className="product-section-title">
            Variants, pricing & stock
          </h2>

          <p className="category-help">
            Create one variant for each size and colour combination.
            For a simple product, leave size and colour empty.
          </p>

          {variants.map((variant, index) => (
            <div className="product-variant" key={variant.key}>
              <div className="product-variant-heading">
                <h3>Variant {index + 1}</h3>

                {variants.length > 1 && (
                  <button
                    type="button"
                    className="product-small-button"
                    onClick={() =>
                      setVariants((current) =>
                        current.filter((item) => item.key !== variant.key),
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="category-form-grid">
                <label>
                  <span>SKU — unique stock code</span>
                  <input
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(variant.key, "sku", event.target.value)
                    }
                    placeholder="BIM-SHIRT-WHT-M"
                    maxLength={64}
                    required
                  />
                </label>

                <label>
                  <span>Size — optional</span>
                  <input
                    value={variant.size}
                    onChange={(event) =>
                      updateVariant(variant.key, "size", event.target.value)
                    }
                    placeholder="M"
                    maxLength={40}
                  />
                </label>

                <label>
                  <span>Colour — optional</span>
                  <input
                    value={variant.color}
                    onChange={(event) =>
                      updateVariant(variant.key, "color", event.target.value)
                    }
                    placeholder="White"
                    maxLength={60}
                  />
                </label>

                <label>
                  <span>Stock quantity</span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={variant.stock}
                    onChange={(event) =>
                      updateVariant(variant.key, "stock", event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  <span>Selling price — BDT</span>
                  <input
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(variant.key, "price", event.target.value)
                    }
                    placeholder="1800"
                    required
                  />
                </label>

                <label>
                  <span>Regular price — optional</span>
                  <input
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={variant.compareAtPrice}
                    onChange={(event) =>
                      updateVariant(
                        variant.key,
                        "compareAtPrice",
                        event.target.value,
                      )
                    }
                    placeholder="2200"
                  />
                </label>
              </div>
            </div>
          ))}

          {variants.length < 12 && (
            <button
              type="button"
              className="product-small-button"
              onClick={addVariant}
            >
              <Plus size={15} />
              Add variant
            </button>
          )}
        </section>

        <div aria-live="polite" aria-atomic="true">
          {state.error && (
            <p className="admin-form-error product-save-error">
              {state.error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="primary-button product-save-button"
          disabled={images.length === 0}
        >
          {pending ? "Creating product..." : "Create product"}
        </button>

        {images.length === 0 && (
          <p className="category-help">
            Upload at least one image to create this product.
          </p>
        )}
      </fieldset>
    </form>
  );
}