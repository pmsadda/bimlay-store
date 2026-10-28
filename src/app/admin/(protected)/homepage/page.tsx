import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getHomeSections } from "@/lib/home-sections";
import HomeSectionForm from "./section-form";

const sections = [
  { key: "FOR_HIM", name: "For Him" },
  { key: "FOR_HER", name: "For Her" },
  { key: "STORY", name: "Story" },
] as const;

export default async function AdminHomepage({
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
      </section>
    );
  }

  const params = await searchParams;
  const requested = typeof params.section === "string"
    ? params.section
    : "";

  const selected =
    sections.find((section) => section.key === requested) ??
    sections[0];

  const records = await getHomeSections(false);

  const current = records.find(
    (record) => record.key === selected.key,
  );

  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow">Homepage content</p>
        <h1>Homepage sections</h1>
        <p>Update your campaign images, copy and links.</p>
      </section>

      <nav className="homepage-editor-tabs" aria-label="Edit section">
        {sections.map((section) => (
          <Link
            key={section.key}
            href={`/admin/homepage?section=${section.key}`}
            className={
              section.key === selected.key ? "selected" : ""
            }
          >
            {section.name}
          </Link>
        ))}
      </nav>

      <section className="category-panel">
        <h2 className="product-section-title">
          Edit {selected.name}
        </h2>

        <HomeSectionForm
          key={selected.key}
          sectionKey={selected.key}
          section={current}
        />
      </section>
    </>
  );
}