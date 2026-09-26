# Xanh Tận Tay

Nông sản tươi gom thẳng từ vườn, có tên người trồng. Hệ sinh thái hai đầu: **app khách hàng** (mua rau biết gốc) và **app nông dân** (bán thẳng cho người ăn), cộng thêm **trang quản trị nền tảng**.

Monorepo pnpm:

| Thư mục | Nội dung |
|---|---|
| `apps/web` | Next.js 15 (App Router), React 19, Drizzle + Neon Postgres, NextAuth, Vercel Blob. Giao diện theo Material 3 Expressive. |
| `apps/mobile` | Expo (React Native) |
| `packages/types` | Kiểu dữ liệu dùng chung |

## Chạy web

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # điền biến môi trường (xem bảng dưới)
pnpm --filter web db:push                       # hoặc chạy SQL thủ công nếu drizzle-kit báo lỗi primary key
pnpm --filter web db:seed                       # idempotent, chạy lại thoải mái
pnpm dev                                        # http://localhost:3000
```

Kiểm tra kiểu: `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`.

Font tự host trong `apps/web/public/fonts`. Icon là bản rút gọn theo tên đã dùng trong mã; khi thêm icon mới chạy `node apps/web/scripts/icon-subset.mjs` (trong `apps/web`) để tạo lại file.

### Biến môi trường (`apps/web/.env.local`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✔ | Neon Postgres |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | ✔ | Phiên đăng nhập khách / nhà vườn |
| `DEMO_PASSWORD` | | Mật khẩu chung cho tài khoản demo, mặc định `demo123` |
| `ADMIN_PASSWORD` | ✔ cho `/admin` | Mật khẩu quản trị; `ADMIN_USER` mặc định `admin`; `ADMIN_SESSION_SECRET` tuỳ chọn |
| `BLOB_READ_WRITE_TOKEN` | cho ảnh/video | Vercel Blob (nhật ký vườn). Avatar lưu thẳng trong DB, không cần Blob |
| `CHAT_API_SECRET` | cho AI | Khoá chat API (OpenAI-compatible). `CHAT_API_URL`, `CHAT_API_MODEL` tuỳ chọn. Không có khoá thì dùng công thức mẫu |
| `CRON_SECRET` | cho cron | Bảo vệ `/api/cron/subscriptions` (Vercel Cron chạy 01:00 hàng ngày) |

### Tài khoản demo (mật khẩu chung: `demo123`)

| Vai trò | Email | Có sẵn gì |
|---|---|---|
| Khách hàng | `lan@gmail.com` | Đơn ở cả 3 trạng thái, gói giao tuần, đã ở nhóm gom đơn, có điểm tích luỹ |
| Nhà vườn | `bacba@xanhtantay.vn` | Vườn bác Ba, 5 sản phẩm, đơn chờ hái |

Trang đăng nhập có nút một chạm cho cả hai. Quản trị: `/admin/login` với `ADMIN_USER` / `ADMIN_PASSWORD`.

## Tính năng

### Khách hàng
- **Trang chủ** cho khách chưa đăng nhập: giới thiệu hai app, bốn trụ cột (minh bạch nguồn gốc, đặt hàng thông minh, theo dõi có cảm xúc, tiện ích bếp núc), mô hình phí minh bạch, một ngày của nhà vườn.
- **Rau củ** (`/rau-cu`): tìm không dấu, lọc theo loại, dải mặt hàng, cùng một loại rau từ nhiều vườn gom lại và đánh dấu rẻ nhất.
- **Vườn rau**: trang vườn với sản phẩm theo loại, tồn kho còn lại, nhật ký vườn; mỗi bài nhật ký mở thành bài đăng đầy đủ ảnh/video (`/nhat-ky/[id]`).
- **Giỏ hàng nhiều vườn**: mỗi vườn một đơn khi thanh toán; số lượng gõ tay được; đơn dưới 100.000₫/vườn được **ghép chuyến** với hàng xóm.
- **Sau khi đặt**: thông điệp tác động (tiền về thẳng vườn ở vùng nào, bao nhiêu kg, mấy phần ăn) và điểm sắp nhận.
- **Đơn hàng**: trạng thái cảm xúc ba bước, ghi chú, nhãn ghép chuyến, mã QR gói rau, kế hoạch ăn và gợi ý nấu cho đơn đã giao.
- **Gói định kỳ**: tạo từ giỏ (chọn tuần/tháng, xem đúng danh sách món), tạm dừng / bật lại; cron tự lên đơn và trừ tồn kho.
- **Gom đơn chung**: tạo nhóm, link mời, thanh tiến độ, freeship khi đủ người; không vào trùng nhóm.
- **Bếp (AI)** (`/cong-thuc`): gợi ý món **chỉ từ rau đã giao đến tay**, mỗi lần một thực đơn mới, "đổi món khác", lịch sử lưu theo khách. Tuỳ chọn: mục tiêu (bình thường / ăn kiêng / tập gym), thẻ chế độ ăn, chế độ ăn tuỳ chỉnh, khẩu phần, dị ứng; mỗi món có ước tính kcal và đạm.
- **Kế hoạch ăn** (`/ke-hoach/[đơn]`): từ số lượng trong đơn, AI tính ăn được mấy ngày và lịch nấu từng ngày, rau lá trước củ quả sau.
- **Vườn của tôi** (`/vuon-cua-toi`): 1 điểm / 1.000₫ khi đơn giao xong, 6 hạng, cây SVG lớn theo hạng, số cây đã trồng, tiền đã về tay nhà vườn.
- **Tra cứu QR** (`/tra-cuu/[đơn]`): trang công khai sau mã QR trên gói rau: vườn, hành trình, món trong gói, nhật ký gần đây; không lộ danh tính người mua.
- **Tài khoản**: đổi avatar (chụp trong app hoặc chọn ảnh, nén còn 96×96 lưu trong DB), thống kê nhanh.

### Nhà vườn
- Chỉ dùng app nông dân (middleware chặn vào phần khách), nhưng xem được trang vườn của mình như khách nhìn thấy.
- **Tổng quan**: đơn chờ, tổng đơn, sản phẩm, khách đăng ký, doanh thu đã giao, đơn gần đây.
- **Đơn hàng**: một chạm đổi trạng thái (thu hoạch → lên xe → đã giao), **in tem QR** cho từng gói, nhãn ghép chuyến.
- **Sản phẩm & tồn kho**: thêm/sửa, giá, phân loại, tồn kho gõ tay hoặc +/−; tự trừ khi khách đặt, về 0 là tự ẩn.
- **Nhật ký vườn**: chụp ảnh / quay video bằng camera trong app hoặc chọn từ máy; ảnh nén ≤1280px WebP, video ≤720p/25fps/30s trước khi tải; xem trước bằng lightbox; chỉ tải lên khi bấm Đăng.
- **Khách đăng ký**: ai nhận rau kỳ tới, món gì, bao nhiêu.

### Quản trị nền tảng (`/admin`)
- Đăng nhập riêng bằng biến môi trường, cookie ký HMAC, hết hạn 12 giờ, chống dò mật khẩu.
- Bảng điều khiển: GMV, hoa hồng ước tính, đơn chờ, đơn chờ ghép chuyến, sắp hết hàng, món AI, kế hoạch ăn.
- Quản lý mọi bảng: người dùng (vai trò, điểm/hạng), vườn (đổi chủ), sản phẩm, đơn (trạng thái, kiểu giao, lô), gói đăng ký, gom đơn, nhật ký, món AI của khách, kế hoạch ăn, công thức mẫu. Sửa nhanh ngay trong bảng, sửa đầy đủ trong hộp thoại, xoá có xác nhận và dọn dữ liệu phụ thuộc. Xem được trên điện thoại (bảng thành thẻ).

### Giao diện & nền tảng
- Material 3 Expressive: token màu/hình/chuyển động, nút biến dạng khi bấm, tooltip rộng, sheet/dialog qua portal, thanh điều hướng mờ khi cuộn, loader 7 hình theo đúng spec, loader giữa trang khi tải, vạch tiến độ khi chuyển trang, hỗ trợ giảm chuyển động.
- Sáng/tối theo hệ thống hoặc tự chọn, không nháy khi tải.
- Phiên đăng nhập nạp sẵn từ máy chủ nên thanh điều hướng không nhảy.

## Mô hình kinh doanh thể hiện trong app
- Nhà vườn tự đặt giá, nền tảng thu **5–10%** trên đơn giao thành công (hiển thị ước tính 7,5%).
- Người mua trả phí đóng gói/vận chuyển gom; gom đơn đủ nhóm thì miễn phí ship.
- Hộp rau gia đình giá cố định theo tuần / tháng.

## Việc còn lại / hướng phát triển
- Livestream tại vườn và chốt đơn trong phiên live.
- Thanh toán trực tuyến (hiện COD) và tính phí vận chuyển thật theo khu vực.
- Đăng nhật ký bằng giọng nói cho nhà vườn.
- Mật khẩu thật (bcrypt) thay cho mật khẩu demo dùng chung.
- Thông báo đẩy khi đơn đổi trạng thái / vườn lên sóng.
- Đồng bộ các tính năng web sang app mobile (`apps/mobile`).
