# Xanh Tận Tay

Nông sản tươi từ vườn đến tay bạn. Monorepo pnpm: `apps/web` (Next.js 15, Material 3 Expressive), `apps/mobile` (Expo), `packages/types`.

## Chạy web

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # điền DATABASE_URL (Neon) + NEXTAUTH_SECRET
pnpm --filter web db:push                       # cần chạy lại khi schema đổi (vd. cột products.stock_qty)
pnpm --filter web db:seed                       # idempotent, chạy lại thoải mái
pnpm dev
```

## Tài khoản demo (mật khẩu chung: `demo123`, đổi bằng `DEMO_PASSWORD`)

| Vai trò | Email | Có sẵn gì |
|---|---|---|
| Khách hàng | `lan@gmail.com` | 3 đơn ở 3 trạng thái, 1 gói giao tuần, đã ở 1 nhóm gom đơn |
| Nông dân | `bacba@xanhtantay.vn` | Vườn bác Ba, 5 sản phẩm, đơn chờ xử lý |

Trang đăng nhập có nút một chạm cho cả hai tài khoản. Khách demo có thể thêm rau vào giỏ, đặt hàng (COD), tạo gói giao định kỳ từ giỏ, tạo / tham gia nhóm gom đơn.

## Trang quản trị nền tảng (`/admin`)

Đăng nhập riêng, không dùng tài khoản khách/nhà vườn. Đặt trên máy chủ (Vercel → Environment Variables):

| Biến | Ý nghĩa |
|---|---|
| `ADMIN_PASSWORD` | Mật khẩu quản trị (bắt buộc; chưa đặt thì `/admin/login` báo lỗi) |
| `ADMIN_USER` | Tên đăng nhập, mặc định `admin` |
| `ADMIN_SESSION_SECRET` | Tuỳ chọn, ký cookie phiên quản trị; mặc định dùng `NEXTAUTH_SECRET` |

Quản lý toàn bộ: người dùng (đổi vai trò), vườn (đổi chủ, slug), sản phẩm (giá, tồn kho, ẩn/hiện), đơn hàng (đổi trạng thái), gói đăng ký, nhóm gom đơn, nhật ký, công thức. Phiên quản trị hết hạn sau 12 giờ.
