export const dynamic = "force-dynamic";
import { StorageManager } from "@/components/admin/StorageManager";

export const metadata = { title: "Dung lượng" };

export default function StoragePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="m3-eyebrow">Hệ thống</p>
        <h1 className="headline-lg text-on-surface">Dung lượng</h1>
        <p className="body-md text-on-surface-variant">Cơ sở dữ liệu và kho tệp đang đầy tới đâu, và dọn những gì không còn nơi nào dùng</p>
      </header>
      <StorageManager />
    </div>
  );
}
