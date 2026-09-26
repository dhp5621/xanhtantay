import { Icon } from "./Icon";

export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="m3-empty anim-in-scale">
      <span className="m3-empty-icon"><Icon name={icon} size={40} /></span>
      <p className="title-lg text-on-surface">{title}</p>
      {description && <p className="body-md text-on-surface-variant" style={{ maxWidth: 380 }}>{description}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
