import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getHeroSlides } from "@/lib/hero-slides";
import SlideForm from "./slide-form";

export default async function AdminHeroPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  await connection();

  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return (
      <section className="admin-next-step">
        <h1>Owner access required</h1>
        <p>Only the owner can manage homepage slides.</p>
      </section>
    );
  }

  const params = await searchParams;
  const editId = typeof params.edit === "string"
    ? params.edit
    : "";

  const slides = await getHeroSlides(false);

  const selected = editId
    ? slides.find((slide) => slide.id === editId)
    : undefined;

  if (editId && !selected) {
    notFound();
  }

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Homepage campaigns</p>
        <h1>Hero slider</h1>
        <p>Create, arrange and update homepage banners.</p>
      </section>

      {selected && (
        <Link
          href="/admin/hero"
          className="product-small-button product-new-link"
        >
          Add another slide
        </Link>
      )}

      <section className="category-panel">
        <h2 className="product-section-title">
          {selected ? "Edit slide" : "Create slide"}
        </h2>

        <SlideForm
          key={selected?.id ?? "new"}
          slide={selected}
        />
      </section>

      <section className="category-list">
        <div className="category-list-heading">
          <h2>Your slides</h2>
          <span>{slides.length} total</span>
        </div>

        {slides.length === 0 && (
          <div className="category-empty">
            No slides yet. Create your first banner above.
          </div>
        )}

        {slides.map((slide) => (
          <article className="hero-admin-row" key={slide.id}>
            <Image
              src={slide.desktopImage}
              alt={slide.altText}
              width={180}
              height={90}
              unoptimized
            />

            <div>
              <h3>{slide.title}</h3>
              <p className="category-help">
                Order: {slide.sortOrder}
                {" · "}
                {slide.isActive ? "Active" : "Hidden"}
              </p>
            </div>

            <Link
              href={`/admin/hero?edit=${slide.id}`}
              className="product-small-button"
            >
              Edit slide
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}