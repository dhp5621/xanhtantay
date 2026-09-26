export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải">
      <div className="flex items-center gap-4">
        <div className="m3-skeleton" style={{ width: 56, height: 56, borderRadius: "var(--shape-lg)" }} />
        <div className="flex flex-col gap-2">
          <div className="m3-skeleton" style={{ width: 220, height: 28 }} />
          <div className="m3-skeleton" style={{ width: 300, height: 16 }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="m3-skeleton" style={{ height: 240, borderRadius: "var(--shape-xl)", animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}
