import { PageHeader } from "@/components/ui/PageHeader";
import { DiaryComposer } from "@/components/farmer/DiaryComposer";

export const metadata = { title: "Đăng nhật ký" };

export default function NhatKyPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader icon="photo_camera" eyebrow="Kể chuyện vườn" title="Đăng nhật ký vườn" subtitle="Chia sẻ khoảnh khắc từ vườn để khách hàng tin tưởng hơn" />
      <DiaryComposer />
    </div>
  );
}
