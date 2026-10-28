"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";

import type { HeroSlideData } from "@/lib/hero-slides";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function HeroSlider({
  slides,
  categories,
}: {
  slides: HeroSlideData[];
  categories: Category[];
}) {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);

  const touchStart = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const activeIndex = slides.length
    ? index % slides.length
    : 0;

  const slide = slides[activeIndex];

  useEffect(() => {
    if (!autoPlay || hovered || slides.length < 2) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const timer = window.setInterval(() => {
      if (
        document.visibilityState !== "visible" ||
        motionPreference.matches
      ) {
        return;
      }

      setIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [autoPlay, hovered, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;

    const next = slides[(activeIndex + 1) % slides.length];
    const mobile = window.matchMedia(
      "(max-width: 640px)",
    ).matches;

    const preload = new window.Image();

    preload.src =
      mobile && next.mobileImage
        ? next.mobileImage
        : next.desktopImage;
  }, [activeIndex, slides]);

  function goTo(target: number) {
    if (slides.length === 0) return;

    setAutoPlay(false);
    setIndex(
      (target + slides.length) % slides.length,
    );
  }

  if (!slide) {
    return (
      <section className="hero hero-slider">
        <p className="eyebrow">BIMLAY</p>
        <h1>Objects of everyday desire.</h1>

        <div className="hero-controls shell">
          <Link href="/shop" className="primary-button">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="hero hero-slider"
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;

        if (!target.closest("[data-carousel-rotation]")) {
          setAutoPlay(false);
        }
      }}
    >
      <div
        className="hero-slide-content"
        aria-live={autoPlay ? "off" : "polite"}
        aria-atomic="true"
      >
        {slide.eyebrow && (
          <p className="eyebrow">{slide.eyebrow}</p>
        )}

        <h1 className="hero-slider-title">{slide.title}</h1>

        <div
          className="hero-art hero-slider-art"
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${slides.length}`}
          onTouchStart={(event) => {
            const touch = event.touches[0];

            touchStart.current = {
              x: touch.clientX,
              y: touch.clientY,
            };
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0];
            touchStart.current = null;

            if (!start || !end) return;

            const dx = end.clientX - start.x;
            const dy = end.clientY - start.y;

            if (
              Math.abs(dx) > 50 &&
              Math.abs(dx) > Math.abs(dy) * 1.4
            ) {
              goTo(activeIndex + (dx < 0 ? 1 : -1));
            }
          }}
        >
          <picture key={slide.id}>
            {slide.mobileImage && (
              <source
                media="(max-width: 640px)"
                srcSet={slide.mobileImage}
              />
            )}

            <Image
              src={slide.desktopImage}
              alt={slide.altText}
              width={1600}
              height={650}
              className="hero-slider-image"
              unoptimized
              loading="eager"
              fetchPriority={activeIndex === 0 ? "high" : "auto"}
            />
          </picture>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="hero-arrow hero-arrow-previous"
                aria-label="Previous banner"
                onClick={() => goTo(activeIndex - 1)}
              >
                <ArrowLeft size={20} />
              </button>

              <button
                type="button"
                className="hero-arrow hero-arrow-next"
                aria-label="Next banner"
                onClick={() => goTo(activeIndex + 1)}
              >
                <ArrowRight size={20} />
              </button>
            </>
          )}
        </div>

        {slide.subtitle && (
          <p className="hero-slider-description shell">
            {slide.subtitle}
          </p>
        )}
      </div>

      {slides.length > 1 && (
        <div className="hero-slider-controls">
          <div className="hero-slider-dots" aria-label="Choose banner">
            {slides.map((item, position) => (
              <button
                key={item.id}
                type="button"
                className={
                  position === activeIndex ? "selected" : ""
                }
                aria-label={`Show banner ${position + 1}: ${item.title}`}
                aria-current={
                  position === activeIndex ? "true" : undefined
                }
                onClick={() => goTo(position)}
              >
                <span />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="hero-rotation-button"
            data-carousel-rotation
            aria-label={
              autoPlay
                ? "Pause automatic banners"
                : "Start automatic banners"
            }
            onClick={() => setAutoPlay((current) => !current)}
          >
            {autoPlay ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      )}

      <div className="hero-controls shell">
        <nav className="category-links" aria-label="Collections">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${encodeURIComponent(category.slug)}`}
            >
              {category.name.toUpperCase()}
              <ArrowRight size={14} />
            </Link>
          ))}
        </nav>

        <Link href={slide.buttonHref} className="primary-button">
          {slide.buttonText}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}