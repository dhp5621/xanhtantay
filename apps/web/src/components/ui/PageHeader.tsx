import { Icon } from "./Icon";

export function PageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  action,
}: {
  icon?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="anim-in" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {icon && (
          <span className="m3-list-leading" style={{ width: 56, height: 56, borderRadius: "var(--shape-lg)" }}>
            <Icon name={icon} size={30} filled />
          </span>
        )}
        <div>
          {eyebrow && <p className="m3-eyebrow" style={{ marginBottom: 2 }}>{eyebrow}</p>}
          <h1 className="headline-md text-on-surface">{title}</h1>
          {subtitle && <p className="body-md text-on-surface-variant" style={{ marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
