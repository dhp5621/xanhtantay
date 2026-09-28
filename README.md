# Xanh Tận Tay

**Thùng rau mẹ gửi**: hộp rau theo mùa từ nương đồi Bắc Kạn, Tuyên Quang về các chung cư Hà Nội. Bản MVP chứng minh **mô hình PULL (kéo)**:

> Khách đặt trước → Bộ não gom nhu cầu → 18h00 chốt sổ → Nông dân nhận lệnh thu hoạch → 4h cắt, 6h lên xe lạnh, 16h có tại sảnh.

Cắt đúng lượng đã đặt nên **rau thừa 0%**. Nguyên tắc "Less is More": không livestream, không quảng cáo, không tích điểm, không bán lẻ từng món.

Monorepo pnpm:

| Thư mục | Nội dung |
|---|---|
| `apps/web` | Next.js 15 (App Router), React 19, Drizzle + Neon Postgres, NextAuth. Web khách hàng, giao diện nông dân và trang quản trị. Material 3 Expressive. |
| `apps/mobile` | Expo (React Native), dùng chung API của web |
| `packages/types` | Kiểu dữ liệu dùng chung |
| `docs/API.md` | Hợp đồng API cho app mobile |

## Chạy web

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # điền biến môi trường (xem bảng dưới)
pnpm --filter web db:setup                      # tạo bảng bằng SQL thuần (thêm `-- --drop` để xoá sạch làm lại)
pnpm --filter web db:seed                       # dữ liệu demo, chạy lại thoải mái
pnpm dev                                        # http://localhost:3000
```

`drizzle-kit push` không chạy đúng trên Neon PG18 nên dự án dùng `db:setup` thay thế. `db:seed` xoá dữ liệu giao dịch (đơn, gói, nhóm, chuyến) rồi dựng lại bộ demo.

Kiểm tra kiểu: `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`.

Font tự host trong `apps/web/public/fonts`. Icon là bản rút gọn theo tên đã dùng trong mã, tự tạo lại mỗi lần `dev` / `build` (hoặc `pnpm --filter web icons`).

### Biến môi trường (`apps/web/.env.local`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✔ | Neon Postgres |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | ✔ | Phiên đăng nhập khách / nông dân |
| `DEMO_PASSWORD` | | Mật khẩu chung cho tài khoản demo, mặc định `demo123` |
| `ADMIN_PASSWORD` | ✔ cho `/admin` | Mật khẩu quản trị; `ADMIN_USER` mặc định `admin`; `ADMIN_SESSION_SECRET` tuỳ chọn |
| `CRON_SECRET` | ✔ cho chốt sổ tự động | Bảo vệ `/api/cron/cutoff` (Vercel Cron chạy 11:00 UTC = 18h00 giờ Việt Nam) |
| `CHAT_API_SECRET` | cho AI | Khoá chat API ([gemini-web2api](https://github.com/Sophomoresty/gemini-web2api), OpenAI-compatible). Dùng để tìm công thức mới trên mạng và viết tóm tắt chuyến. `CHAT_API_URL`, `CHAT_API_MODEL` tuỳ chọn; `CHAT_SEARCH_MODEL` (mặc định `gemini-3.6-flash`) là model dùng khi cần tìm kiếm web. Không có khoá thì thực đơn đổi sang các món khác của bếp nhà |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | cho thông báo đẩy | Web Push; app mobile dùng Expo push |
| `BLOB_READ_WRITE_TOKEN` | | Vercel Blob cho ảnh tải lên. Avatar lưu thẳng trong DB, không cần Blob |

### Thông báo

Có hai đường giao thông báo (lệnh thu hoạch cho nông dân, hành trình hộp rau cho khách):

1. **Hỏi máy chủ định kỳ** (luôn chạy, không cần cấu hình): khi app hoặc trang web đang mở, cứ 15 giây hỏi `/api/notifications` rồi hiện thông báo tại chỗ (cả thông báo quản trị gửi từ `/admin`). Không phụ thuộc Google / Apple.
2. **Đẩy thật** (nhận cả khi đã đóng app), cần thêm khoá:
   - **Web**: ba biến `VAPID_*` trên Vercel, khoá công khai và khoá riêng phải cùng một cặp (`npx web-push generate-vapid-keys`). Đổi khoá xong phải deploy lại.
   - **Android**: tạo dự án Firebase cho gói `dhp.vkn.xanhtantay`, đặt `google-services.json` vào `apps/mobile/` (hoặc biến `GOOGLE_SERVICES_JSON` trỏ tới file), rồi tải khoá FCM V1 lên Expo bằng `eas credentials`.
   - **iOS**: hồ sơ ký phải có quyền Push Notifications (`aps-environment`) và khoá APNs của chính tài khoản Apple Developer đó được tải lên Expo. Chứng chỉ ký dùng chung không nhận được thông báo đẩy.

### Tài khoản demo (mật khẩu chung: `demo123`)

| Vai trò | Email | Có sẵn gì |
|---|---|---|
| Khách hàng | `lan@gmail.com` | Ở Times City, có đơn đã giao, đơn đang chờ chốt sổ, gói tuần, nhóm gom đơn |
| Nông dân | `bacba@xanhtantay.vn` | Vườn nhà bác Ba (Ba Bể, Bắc Kạn), có lệnh thu hoạch |

Trang đăng nhập có nút một chạm cho cả hai. Quản trị: `/admin/login` với `ADMIN_USER` / `ADMIN_PASSWORD`.

## Mô hình dữ liệu

| Bảng | Vai trò |
|---|---|
| `clusters` | Cụm chung cư nhận hàng (Times City, Royal City, Smart City, Goldmark, Linh Đàm) |
| `farms`, `produce`, `farm_capacity` | Nông hộ, loại rau, năng suất đăng ký theo ngày (kg) của từng hộ cho từng loại |
| `boxes`, `box_items` | Hộp rau theo mùa: mỗi mùa khoảng 3 **mix**, mỗi mix 3 size S / M / L (4, 7, 10 kg), hộp nào cũng đủ ăn 7 ngày; thành phần theo kg, **thực đơn theo ngày** nằm sẵn trong hộp |
| `orders` | Một đơn = một loại hộp × số lượng, có ngày giao, cụm nhận, lời nhắn từ quê |
| `subscriptions` | Gói định kỳ tuần / hai tuần / tháng |
| `group_orders` | Nhóm gom đơn theo toà nhà, đủ nhóm thì miễn phí giao |
| `harvest_runs`, `harvest_commands` | Chuyến giao theo ngày và lệnh thu hoạch gửi từng nông hộ |

## Tính năng

### Khách hàng
- **Hộp rau** (`/hop-rau`): bán theo hộp, không bán lẻ. Chọn mix (Thùng rau mẹ gửi, Nương rau vùng cao, Củ quả hầm canh) rồi chọn size S / M / L như chọn cỡ áo. Mỗi hộp ghi rõ thành phần, rau từ vườn nào, và thực đơn chia theo ngày (trưa, tối) kèm cách làm.
- **Ba cách nhận**: gói định kỳ (miễn phí giao), gom đơn cùng toà nhà (đủ nhóm miễn ship), mua một lần (phí 15.000₫).
- **Đặt trước 18h00, giao hôm sau**: băng đếm ngược tới giờ chốt sổ; sau 18h00 đơn tính cho chuyến kế tiếp. Huỷ miễn phí trước giờ chốt.
- **Đổi thực đơn bằng AI**: trong mỗi bữa, dưới cách làm có ô "Tôi muốn cách làm khác" để gõ ý muốn (ít dầu mỡ, kiểu Hàn, món đang hot…); AI tìm công thức mới trên mạng, chỉ nấu từ rau củ trong hộp và không lặp món đã có. Nút to **Đổi thực đơn cả tuần** nằm trên các ngày. Thực đơn đã đổi được lưu theo từng đơn.
- **Sau khi đặt**: lời nhắn quan tâm từ quê và thông điệp tác động (tiền về tay nông hộ, số kg, số bữa).
- **Hành trình có cảm xúc** (`/don-hang`): 18h00 đơn vào sổ → 4h00 rau đang được bác nông dân thu hoạch → 6h00 hàng lên xe lạnh về phố → 16h00 rau quê đã có tại sảnh chung cư nhà bạn.
- **Gói định kỳ** (`/dinh-ky`): đổi số hộp, tần suất, tạm dừng / bật lại.
- **Gom đơn chung** (`/gom-don`): tạo nhóm theo cụm chung cư, chọn ngày giao trong 2 tuần tới (giờ giao luôn 16h00), link mời, tham gia / rời nhóm trước giờ chốt.
- **Tra cứu QR** (`/tra-cuu/[đơn]`): trang công khai sau mã QR trên bao bì: giờ thu hoạch, nông hộ, thành phần hộp; không lộ danh tính người mua.
- **Tài khoản**: avatar, họ tên, cụm chung cư và số căn mặc định.

### Nông dân (`/farmer`)
- Một màn hình duy nhất, chữ to: *"Bác Ba ơi, 4h sáng mai bác cắt đúng 15 kg cà rốt và 20 kg bắp cải nhé. Xe tải lạnh sẽ qua lấy lúc 6h."*
- Trả lời bằng **Có** (Đã hiểu & Xác nhận) hoặc **Không** (không cắt được), bấm được ngay trên thông báo (Android, iOS, trình duyệt) mà không cần mở app. Bộ não thấy hộ nào báo không cắt được.
- Bên dưới là các lần thu hoạch trước.
- **Rau củ đăng ký** (`/farmer/nang-suat`): nông dân tự đổi mỗi ngày cắt được bao nhiêu ký mỗi loại, thêm hoặc ngừng cung cấp; áp dụng từ lần chốt sổ kế tiếp.
- **Thông tin vườn** (`/farmer/vuon`): đổi tên, địa chỉ, lời giới thiệu vườn.

### Bộ não trung tâm (`/admin`)
- Gom đơn đặt trước, gói định kỳ tới hạn và nhóm gom đơn của chuyến sắp chốt; so nhu cầu với năng suất từng loại rau.
- Xem trước "nếu chốt sổ bây giờ" và dự báo 7 ngày tới.
- **Chốt sổ & gửi lệnh**: cộng tổng nhu cầu, chia cho từng nông hộ theo tỷ lệ năng suất đăng ký (bước 0,5 kg, không vượt năng suất), ghi lệnh và gửi thông báo. Tự chạy lúc 18h00 qua cron, quản trị có thể bấm tay.
- Theo dõi chuyến: nông hộ nào đã xác nhận, chuyển trạng thái thu hoạch → lên xe lạnh → tới sảnh (khách nhận thông báo).
- Quản lý mọi bảng: đơn, hộp rau, thành phần hộp, loại rau, năng suất, nông hộ, lệnh thu hoạch, gói định kỳ, gom đơn, cụm chung cư, người dùng. Xem được trên điện thoại.
- Gửi thông báo đẩy tới điện thoại và trình duyệt, kèm **mẫu gửi thử** cho từng loại thông báo (lệnh thu hoạch có nút Có / Không, đơn mới, các bước hành trình, nhắc chốt sổ, nhóm đủ nhà, thực đơn).

### Giao diện & nền tảng
- Material 3 Expressive: token màu/hình/chuyển động, sheet/dialog qua portal, thanh điều hướng mờ khi cuộn, loader nhiều hình, hỗ trợ giảm chuyển động.
- Sáng/tối theo hệ thống hoặc tự chọn.

## Phạm vi thí điểm
- Giao tại Hà Nội, nguồn rau từ Bắc Kạn và Tuyên Quang; mỗi hộp mix từ nhiều nông hộ.
- Thanh toán khi nhận hàng tại sảnh.

## Việc còn lại
- Thanh toán trực tuyến.
- Mật khẩu thật (bcrypt) thay cho mật khẩu demo dùng chung.
- Thực đơn hộp thay đổi theo mùa (hiện có bộ Thu 2026).
