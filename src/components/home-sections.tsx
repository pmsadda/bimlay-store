import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomeSectionData } from "@/lib/home-sections";

function SectionImage({
  section,
  sizes,
}: {
  section: HomeSectionData;
  sizes: string;
}) {
  if (!section.imageUrl) return null;

  return (
    <picture className="home-section-picture">
      {section.mobileImageUrl && (
        <source
          media="(max-width: 640px)"
          srcSet={section.mobileImageUrl}
        />
      )}

      <Image
        src={section.imageUrl}
        alt={section.altText || section.title}
        fill
        unoptimized
        sizes={sizes}
      />
    </picture>
  );
}

export function HomeCampaigns({
  sections,
}: {
  sections: HomeSectionData[];
}) {
  const campaigns = ["FOR_HIM", "FOR_HER"]
    .map((key) =>
      sections.find(
        (section) =>
          section.key === key &&
          section.isActive &&
          section.imageUrl,
      ),
    )
    .filter(
      (section): section is HomeSectionData =>
        section !== undefined,
    );

  if (campaigns.length === 0) return null;

  return (
    <section
      className={`campaigns shell ${
        campaigns.length === 1 ? "single-campaign" : ""
      }`}
      aria-label="Featured collections"
    >
      {campaigns.map((section) => (
        <article className="campaign" key={section.key}>
          <SectionImage
            section={section}
            sizes="(max-width: 640px) 100vw, 50vw"
          />

          <div className="campaign-copy">
            {section.eyebrow && (
              <p className="eyebrow">{section.eyebrow}</p>
            )}

            <h2>{section.title}</h2>

            {section.description && (
              <p>{section.description}</p>
            )}

            <Link
              href={section.buttonHref}
              className="text-link"
            >
              {section.buttonText}
              <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

export function HomeStory({
  sections,
}: {
  sections: HomeSectionData[];
}) {
  const section = sections.find(
    (item) =>
      item.key === "STORY" &&
      item.isActive &&
      item.imageUrl,
  );

  if (!section) return null;

  return (
    <section id="story" className="story">
      <div className="story-image">
        <SectionImage
          section={section}
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </div>

      <div className="story-copy">
        {section.eyebrow && (
          <p className="eyebrow">{section.eyebrow}</p>
        )}

        <h2>{section.title}</h2>

        {section.description && (
          <p className="home-story-description">
            {section.description}
          </p>
        )}

        <Link href={section.buttonHref} className="text-link">
          {section.buttonText}
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}