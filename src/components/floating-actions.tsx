"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ShoppingBag } from "lucide-react";
import { useCartCount } from "@/lib/cart-store";

type Position = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
};

function keepInsideScreen(
  position: Position,
  width: number,
  height: number,
): Position {
  const padding = 12;
  const bottomSpace = window.matchMedia("(max-width: 767px)").matches
    ? 90
    : 16;

  return {
    x: Math.max(
      padding,
      Math.min(position.x, window.innerWidth - width - padding),
    ),
    y: Math.max(
      padding,
      Math.min(position.y, window.innerHeight - height - bottomSpace),
    ),
  };
}

function DraggableAction({
  href,
  label,
  variant,
  external = false,
  children,
}: {
  href: string;
  label: string;
  variant: "cart" | "whatsapp";
  external?: boolean;
  children: ReactNode;
}) {
  const elementRef = useRef<HTMLAnchorElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const blockClickRef = useRef(false);

  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function handleResize() {
      const element = elementRef.current;
      if (!element) return;

      const { width, height } = element.getBoundingClientRect();

      setPosition((current) =>
        current ? keepInsideScreen(current, width, height) : current,
      );
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function startDrag(event: PointerEvent<HTMLAnchorElement>) {
    if (!event.isPrimary || event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();

    blockClickRef.current = false;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLAnchorElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    // Small finger movements still count as a normal tap.
    if (!blockClickRef.current && Math.hypot(dx, dy) < 8) return;

    blockClickRef.current = true;
    setDragging(true);

    const { width, height } = event.currentTarget.getBoundingClientRect();

    setPosition(
      keepInsideScreen(
        {
          x: drag.left + dx,
          y: drag.top + dy,
        },
        width,
        height,
      ),
    );
  }

  function finishDrag(event: PointerEvent<HTMLAnchorElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Link
      ref={elementRef}
      href={href}
      prefetch={false}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={`${label} — ধরে সরাতে পারবে`}
      draggable={false}
      className={[
        "bimlay-floating-action",
        `bimlay-floating-${variant}`,
        dragging ? "is-dragging" : "",
      ].join(" ")}
      style={
        position
          ? {
              left: position.x,
              top: position.y,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={() => {
        dragRef.current = null;
        setDragging(false);
      }}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => {
        if (blockClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          blockClickRef.current = false;
          return;
        }

        // Home restores the original position.
        if (event.key === "Home") {
          event.preventDefault();
          setPosition(null);
          return;
        }

        const directions: Record<string, Position> = {
          ArrowLeft: { x: -16, y: 0 },
          ArrowRight: { x: 16, y: 0 },
          ArrowUp: { x: 0, y: -16 },
          ArrowDown: { x: 0, y: 16 },
        };

        const direction = directions[event.key];
        if (!direction) return;

        event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();

        setPosition(
          keepInsideScreen(
            {
              x: rect.left + direction.x,
              y: rect.top + direction.y,
            },
            rect.width,
            rect.height,
          ),
        );
      }}
    >
      {children}
    </Link>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="30"
      height="30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M27.5 15.5a11.5 11.5 0 0 1-17.1 10L4 27l1.6-6.1A11.5 11.5 0 1 1 27.5 15.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m11.5 9.5 2 4-1.5 1.5c1.1 2.2 2.8 3.9 5 5l1.5-1.5 4 2c-.5 2-1.8 3-3.5 2.5-5.8-1.5-9.5-5.2-11-11-.5-1.7.5-3 2.5-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function FloatingActions({
  whatsappNumber,
}: {
  whatsappNumber: string;
}) {
  const cartCount = useCartCount();
  const digits = whatsappNumber.replace(/\D/g, "");

  const whatsappEnabled = /^8801[3-9]\d{8}$/.test(digits);

  const whatsappHref = whatsappEnabled
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        "Hello BIMLAY! আপনাদের পণ্য সম্পর্কে জানতে চাই।",
      )}`
    : "";

  return (
    <>
      {whatsappEnabled && (
        <DraggableAction
          href={whatsappHref}
          label="WhatsApp-এ BIMLAY-এর সঙ্গে কথা বলুন"
          variant="whatsapp"
          external
        >
          <WhatsAppIcon />
        </DraggableAction>
      )}

      <DraggableAction
        href="/cart"
        label={`Shopping bag, ${cartCount} items`}
        variant="cart"
      >
        <ShoppingBag size={25} strokeWidth={1.6} />

        {cartCount > 0 && (
          <span className="bimlay-floating-count" aria-hidden="true">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </DraggableAction>
    </>
  );
}