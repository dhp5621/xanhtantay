import { Icon } from "./Icon";

/** Centered Material 3 Expressive loading indicator, used by route loading states and navigation. */
export function PageLoader({ label = "Đang tải…", fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return (
    <div className={`m3-page-loader ${fullscreen ? "fullscreen" : ""}`} role="status" aria-live="polite" aria-label={label}>
      <div className="m3-page-loader-card">
        <span className="m3-loader" />
        <p className="label-lg text-on-surface-variant" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="eco" size={16} filled className="text-primary" /> {label}</p>
      </div>
    </div>
  );
}
