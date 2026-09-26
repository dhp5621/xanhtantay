import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16 m3-page">
      <div className="m3-empty anim-in-scale">
        <span className="m3-empty-icon"><Icon name="grass" size={40} /></span>
        <p className="headline-sm text-on-surface">Không tìm thấy trang này</p>
        <p className="body-md text-on-surface-variant">Có thể vườn đã dọn luống hoặc đường dẫn không đúng.</p>
        <Link href="/" className="m3-btn m3-btn-filled" style={{ marginTop: 12 }}><Icon name="home" /><span>Về trang chủ</span></Link>
      </div>
    </main>
  );
}
