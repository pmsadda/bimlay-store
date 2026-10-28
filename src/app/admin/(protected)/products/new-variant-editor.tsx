"use client";

import { useRef, useState } from "react";

type NewVariant = {
  key: number;
  sku: string;
  size: string;
  color: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  isActive: boolean;
};

export default function NewVariantEditor({
  existingCount,
}: {
  existingCount: number;
}) {
  const [variants, setVariants] = useState<NewVariant[]>([]);
  const nextKey = useRef(0);

  function addVariant() {
    if (existingCount + variants.length >= 12) return;

    const key = nextKey.current++;

    setVariants((current) => [
      ...current,
      {
        key,
        sku: "",
        size: "",
        color: "",
        price: "",
        compareAtPrice: "",
        stock: "0",
        isActive: true,
      },
    ]);
  }

  function changeVariant(
    key: number,
    changes: Partial<Omit<NewVariant, "key">>,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.key === key
          ? { ...variant, ...changes }
          : variant,
      ),
    );
  }

  return (
    <section className="category-panel">
      <h2 className="product-section-title">
        Add size or colour variants
      </h2>

      <p className="category-help">
        Existing variants stay above. Add up to 12 variants in
        total. Every SKU and size/colour combination must be unique.
      </p>

      <input
        type="hidden"
        name="newVariants"
        value={JSON.stringify(
          variants.map((variant) => ({
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stock: variant.stock,
            isActive: variant.isActive,
          })),
        )}
      />

      {variants.map((variant, index) => (
        <div className="product-variant" key={variant.key}>
          <div className="product-variant-heading">
            <h3>New variant {index + 1}</h3>

            <button
              type="button"
              className="product-small-button"
              onClick={() =>
                setVariants((current) =>
                  current.filter(
                    (item) => item.key !== variant.key,
                  ),
                )
              }
            >
              Remove
            </button>
          </div>

          <div className="category-form-grid">
            <label>
              <span>Unique SKU</span>
              <input
                value={variant.sku}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    sku: event.target.value,
                  })
                }
                maxLength={64}
                placeholder="BIMLAY-SHIRT-BLK-M"
                required
              />
            </label>

            <label>
              <span>Size - optional</span>
              <input
                value={variant.size}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    size: event.target.value,
                  })
                }
                maxLength={40}
                placeholder="M"
              />
            </label>

            <label>
              <span>Colour - optional</span>
              <input
                value={variant.color}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    color: event.target.value,
                  })
                }
                maxLength={60}
                placeholder="Black"
              />
            </label>

            <label>
              <span>Selling price - BDT</span>
              <input
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={variant.price}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    price: event.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              <span>Regular price - optional</span>
              <input
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={variant.compareAtPrice}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    compareAtPrice: event.target.value,
                  })
                }
              />
            </label>

            <label>
              <span>Stock quantity</span>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={variant.stock}
                onChange={(event) =>
                  changeVariant(variant.key, {
                    stock: event.target.value,
                  })
                }
                required
              />
            </label>
          </div>

          <label className="category-checkbox">
            <input
              type="checkbox"
              checked={variant.isActive}
              onChange={(event) =>
                changeVariant(variant.key, {
                  isActive: event.target.checked,
                })
              }
            />
            <span>Active variant</span>
          </label>
        </div>
      ))}

      <button
        type="button"
        className="product-small-button"
        onClick={addVariant}
        disabled={existingCount + variants.length >= 12}
      >
        + Add variant
      </button>

      {existingCount + variants.length >= 12 && (
        <p className="category-help">
          Maximum of 12 variants reached.
        </p>
      )}
    </section>
  );
}