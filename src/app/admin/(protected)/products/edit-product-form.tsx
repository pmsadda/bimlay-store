"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductImageEditor from "./product-image-editor";
import { updateProduct } from "./edit-actions";
import NewVariantEditor from "./new-variant-editor";

type ProductEditData = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  images: {
    id: string;
    url: string;
    alt: string;
  }[];
  variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    price: string;
    compareAtPrice: string;
    stock: number;
    isActive: boolean;
    flashPrice: string;
    flashSaleEnd: string;
  }[];
};

type CategoryOption = {
  id: string;
  name: string;
};

export default function EditProductForm({
  product,
  categories,
}: {
  product: ProductEditData;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(updateProduct, {
    error: "",
    success: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="product-editor">
      <input type="hidden" name="productId" value={product.id} />

      <fieldset disabled={pending}>
        <section className="category-panel">
          <h2 className="product-section-title">Product information</h2>

          <div className="category-form-grid">
            <label>
              <span>Product name</span>
              <input
                name="name"
                defaultValue={product.name}
                minLength={2}
                maxLength={180}
                required
              />
            </label>

            <label>
              <span>URL slug — unchanged</span>
              <input value={product.slug} readOnly aria-readonly="true" />
            </label>

            <label>
              <span>Category</span>
              <select
                name="categoryId"
                defaultValue={product.categoryId}
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Publication status</span>
              <select name="status" defaultValue={product.status}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label className="category-full-width">
              <span>Short description</span>
              <textarea
                name="shortDescription"
                defaultValue={product.shortDescription}
                rows={2}
                maxLength={300}
              />
            </label>

            <label className="category-full-width">
              <span>Full description</span>
              <textarea
                name="description"
                defaultValue={product.description}
                rows={6}
                maxLength={10000}
              />
            </label>
          </div>

          <label className="category-checkbox">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product.isFeatured}
            />
            <span>Feature this product on the homepage</span>
          </label>
        </section>

        <section className="category-panel">
          <h2 className="product-section-title">Pricing & stock</h2>

          <p className="category-help">
            Update each variant separately. An inactive variant will be excluded
            from the storefront when connected.
          </p>

          {product.variants.map((variant) => (
            <div className="product-variant" key={variant.id}>
              <div className="product-variant-heading">
                <div>
                  <h3>{variant.sku}</h3>
                  <p className="category-help">
                    {variant.size || "Standard size"}
                    {" · "}
                    {variant.color || "Standard colour"}
                  </p>
                </div>
              </div>

              <div className="category-form-grid">
                <label>
                  <span>Selling price — BDT</span>
                  <input
                    name={`price-${variant.id}`}
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    defaultValue={variant.price}
                    required
                  />
                </label>

                <label>
                  <span>Regular price — optional</span>
                  <input
                    name={`regular-${variant.id}`}
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    defaultValue={variant.compareAtPrice}
                  />
                </label>
                {/* ⚡ FLASH SALE — নতুন */}
                <label>
                  <span>⚡ Flash sale price (৳) — optional</span>
                  <input
                    name={`flashPrice-${variant.id}`}
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    defaultValue={variant.flashPrice}
                    placeholder="Sale price"
                  />
                </label>

                <label>
                  <span>⚡ Flash sale শেষ সময় — optional</span>
                  <input
                    name={`flashSaleEnd-${variant.id}`}
                    type="datetime-local"
                    defaultValue={variant.flashSaleEnd}
                  />
                </label>

                <label>
                  <span>Stock quantity</span>
                  <input
                    name={`stock-${variant.id}`}
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    defaultValue={variant.stock}
                    required
                  />
                </label>
              </div>

              <label className="category-checkbox">
                <input
                  type="checkbox"
                  name={`active-${variant.id}`}
                  defaultChecked={variant.isActive}
                />
                <span>Active variant</span>
              </label>
            </div>
          ))}
        </section>

        <NewVariantEditor
          key={product.variants.map((variant) => variant.id).join("|")}
          existingCount={product.variants.length}
        />

        <ProductImageEditor
          key={product.images.map((image) => image.id).join("|")}
          images={product.images}
          productName={product.name}
        />

        <div aria-live="polite" aria-atomic="true">
          {state.error && (
            <p className="admin-form-error product-save-error">{state.error}</p>
          )}

          {state.success && (
            <p className="category-success product-save-message">
              {state.success}
            </p>
          )}
        </div>

        <button type="submit" className="primary-button product-save-button">
          {pending ? "Saving changes..." : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}
