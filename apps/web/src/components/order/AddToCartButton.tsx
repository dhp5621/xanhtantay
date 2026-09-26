"use client";

import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price_per_unit: number;
  unit: string;
}

export function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(0);

  const add = () => setQty((q) => q + 1);
  const remove = () => setQty((q) => Math.max(0, q - 1));

  if (qty === 0) {
    return (
      <button
        onClick={add}
        className="m3-tonal-button"
        style={{ padding: "6px 14px", fontSize: 13, whiteSpace: "nowrap" }}
      >
        + Thêm
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--md-primary-container)",
        borderRadius: "var(--radius-full)",
        padding: "2px 4px",
      }}
    >
      <button
        onClick={remove}
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          border: "none",
          background: "var(--md-surface-container)",
          color: "var(--md-on-surface)",
          cursor: "pointer",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        −
      </button>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--md-on-primary-container)",
          minWidth: 20,
          textAlign: "center",
        }}
      >
        {qty}
      </span>
      <button
        onClick={add}
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          border: "none",
          background: "var(--md-primary)",
          color: "var(--md-on-primary)",
          cursor: "pointer",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>
    </div>
  );
}
