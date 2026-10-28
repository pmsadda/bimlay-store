"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Mail, MessageCircle } from "lucide-react";
import FloatingActions from "@/components/floating-actions";

type ContactData = {
  whatsappNumber: string;
  facebookPageUrl: string;
  supportEmail: string;
};

function subscribeToMount() {
  return () => {};
}

function clientSnapshot() {
  return true;
}

function serverSnapshot() {
  return false;
}

export default function StoreContact() {
  const mounted = useSyncExternalStore(
    subscribeToMount,
    clientSnapshot,
    serverSnapshot,
  );

  const [contact, setContact] = useState<ContactData | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;

    async function loadContact() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/store/contact", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: unknown = await response.json();

        if (
          !active ||
          !data ||
          typeof data !== "object" ||
          !("whatsappNumber" in data) ||
          !("facebookPageUrl" in data) ||
          !("supportEmail" in data) ||
          typeof data.whatsappNumber !== "string" ||
          typeof data.facebookPageUrl !== "string" ||
          typeof data.supportEmail !== "string"
        ) {
          return;
        }

        setContact({
          whatsappNumber: data.whatsappNumber,
          facebookPageUrl: data.facebookPageUrl,
          supportEmail: data.supportEmail,
        });
      } catch {
        // Keep the cart available even if contacts cannot load.
      }
    }

    void loadContact();

    function refreshContact() {
      void loadContact();
    }

    window.addEventListener("focus", refreshContact);

    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", refreshContact);
    };
  }, []);

  const whatsappNumber = contact?.whatsappNumber ?? "";
  const whatsappAvailable = /^8801[3-9]\d{8}$/.test(whatsappNumber);

  const hasContacts = Boolean(
    whatsappAvailable || contact?.facebookPageUrl || contact?.supportEmail,
  );

  return (
    <>
      {hasContacts && (
        <div className="bimlay-footer-contact">
          <p className="bimlay-footer-contact-title">Connect with BIMLAY</p>

          <div className="bimlay-footer-contact-links">
            {whatsappAvailable && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            )}

            {contact?.facebookPageUrl && (
              <a
                href={contact.facebookPageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M15.5 8H13V6.5c0-.7.3-1 1-1h1.5V3H13c-2.1 0-3.5 1.4-3.5 3.5V8H7v3h2.5v10H13V11h2.2l.3-3Z" />
                </svg>
                <span>Facebook</span>
              </a>
            )}

            {contact?.supportEmail && (
              <a href={`mailto:${contact.supportEmail}`}>
                <Mail size={18} aria-hidden="true" />
                <span>{contact.supportEmail}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {mounted &&
        createPortal(
          <FloatingActions whatsappNumber={whatsappNumber} />,
          document.body,
        )}
    </>
  );
}
