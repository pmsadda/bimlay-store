"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      className="product-small-button"
      onClick={() => window.print()}
    >
      Print invoice
    </button>
  );
}