# Xanh Tận Tay

**Thùng rau mẹ gửi**: hộp rau theo mùa từ nương đồi Bắc Kạn, Tuyên Quang về cho sinh viên và người đi làm xa nhà ở Hà Nội (ký túc xá, khu trọ, nhà thuê chung). Người đặt có thể là chính người ăn, hoặc bố mẹ ở quê đặt cho con. Bản MVP chứng minh **mô hình PULL (kéo)**:

> Khách đặt trước → Bộ não gom nhu cầu → 18h00 hôm trước ngày giao chốt sổ → Nông dân nhận lệnh thu hoạch → 4h cắt, 6h lên xe lạnh, 16h có tại điểm nhận.

Giao cố định **thứ Tư và Chủ nhật**, mỗi chuyến khoảng 250 hộp, và chỉ mở chuyến thu hoạch khi đủ số hộp tối thiểu. Cắt đúng lượng đã đặt nên **rau thừa 0%**. Nguyên tắc "Less is More": không livestream, không quảng cáo, không tích điểm, không bán lẻ từng món.

Monorepo pnpm:

| Thư mục | Nội dung |
|---|---|
| `apps/web` | Next.js 15 (App Router), React 19, Drizzle + Neon Postgres, NextAuth. Web khách hàng, giao diện nông dân, trang quản trị và toàn bộ API. Material 3 Expressive. |
| `apps/mobile` | Expo SDK 54 (React Native 0.81), dùng chung API của web |
| `packages/types` | Kiểu dữ liệu dùng chung |
| `docs/API.md` | Hợp đồng API cho app mobile |
| `patches/` | Bản vá thư viện (giới hạn 30 khung hình/giây cho bộ nén video) |

## Chạy web

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # điền biến môi trường (xem bảng dưới)
pnpm --filter web db:setup                      # tạo bảng, và nâng cấp cơ sở dữ liệu cũ tại chỗ
pnpm --filter web db:seed                       # dữ liệu demo
pnpm dev                                        # http://localhost:3000
```

- `drizzle-kit push` không chạy đúng trên Neon PG18 nên dự án dùng `db:setup` (SQL thuần, chạy lại thoải mái). Thêm `-- --drop` để xoá sạch làm lại.
- `db:seed` **xoá dữ liệu giao dịch** (đơn, gói định kỳ, nhóm, chuyến, lệnh) rồi dựng lại bộ demo; mọi ngày giao trong bộ demo đều rơi vào thứ Tư hoặc Chủ nhật. Tài khoản, mật khẩu đã đặt, yêu cầu duyệt và thiết bị nhận thông báo không bị xoá; riêng cách xưng hô tự chọn của tài khoản demo quay về mặc định của bộ demo (khách hàng: "bạn", nông dân: theo giới tính). Năm cụm chung cư của bộ demo cũ bị xoá và thay bằng các điểm nhận mới.
- Kiểm tra kiểu: `apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`.
- Font tự host trong `apps/web/public/fonts`. Icon là bản rút gọn theo tên đã dùng trong mã, tự tạo lại mỗi lần `dev` / `build` (hoặc `pnpm --filter web icons`).

### Biến môi trường (`apps/web/.env.local`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✔ | Neon Postgres |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | ✔ | Phiên đăng nhập khách / nông dân |
| `DEMO_PASSWORD` | | Mật khẩu chung cho tài khoản chưa có mật khẩu riêng, mặc định `demo123` |
| `ADMIN_PASSWORD` | ✔ cho `/admin` | Mật khẩu quản trị; `ADMIN_USER` mặc định `admin`; `ADMIN_SESSION_SECRET` tuỳ chọn |
| `CRON_SECRET` | ✔ cho chốt sổ tự động | Bảo vệ `/api/cron/cutoff` (Vercel Cron chạy 11:00 UTC = 18h00 giờ Việt Nam mỗi ngày; chỉ chốt sổ vào tối trước ngày giao, tức thứ Ba và thứ Bảy) |
| `MIN_BATCH_BOXES` | | Số hộp tối thiểu để chốt sổ tự động mở một chuyến thu hoạch, mặc định 240. Dưới mức này cron không gửi lệnh; quản trị vẫn bấm tay được |
| `BLOB_READ_WRITE_TOKEN` | ✔ cho trả hàng / hoàn tiền | Vercel Blob lưu ảnh và video bằng chứng |
| `CHAT_API_SECRET` | cho AI | Khoá chat API ([gemini-web2api](https://github.com/Sophomoresty/gemini-web2api), OpenAI-compatible). `CHAT_API_URL`, `CHAT_API_MODEL` tuỳ chọn; `CHAT_SEARCH_MODEL` (mặc định `gemini-3.6-flash`) dùng khi cần tìm kiếm web |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | cho thông báo đẩy trên web | Phải là cùng một cặp khoá (`npx web-push generate-vapid-keys`). Đổi xong phải deploy lại |
| `EXPO_ACCESS_TOKEN` | | Chỉ cần khi dự án Expo bật "Enhanced push security" |
| `DB_LIMIT_MB` | | Giới hạn cơ sở dữ liệu để tính phần trăm ở tab Dung lượng, mặc định 512 |

### Tài khoản demo

| Vai trò | Email | Xưng hô | Có sẵn gì |
|---|---|---|---|
| Khách hàng | `lan@gmail.com` | bạn Lan | Sinh viên xa nhà, ở Ký túc xá Bách Khoa; có đơn đã giao, đơn đặt cho người thân, đơn đang chờ chốt sổ, gói tuần, nhóm gom đơn |
| Nông dân | `bacba@xanhtantay.vn` | bác Ba | Vườn nhà bác Ba (Ba Bể, Bắc Kạn), có lệnh thu hoạch |
| Nông dân | `cotu@xanhtantay.vn` | cô Tư | Nương rau cô Tư (Chợ Đồn, Bắc Kạn) |

Mật khẩu chung là `demo123`. Trang đăng nhập có nút một chạm cho hai tài khoản đầu. Khi quản trị đặt mật khẩu riêng cho một tài khoản, tài khoản đó chỉ đăng nhập được bằng mật khẩu mới, kể cả nút một chạm. Quản trị: `/admin/login` với `ADMIN_USER` / `ADMIN_PASSWORD`.

## Chạy app mobile

```bash
pnpm install
cd apps/mobile
npx expo run:android      # hoặc: npx expo run:ios
```

- Địa chỉ máy chủ lấy từ `EXPO_PUBLIC_API_URL`, mặc định `https://xanhtantay.vercel.app`.
- App có module native (thông báo, tác vụ nền, nén video), nên **không chạy đủ tính năng trong Expo Go**; cần bản build riêng.
- GitHub Actions tự build APK và IPA mỗi lần đẩy thay đổi trong `apps/mobile` (`.github/workflows/`).
- Kiểm tra kiểu: `cd apps/mobile && npx tsc --noEmit`.
- Điểm vào của app là `apps/mobile/index.ts`: tác vụ nền xử lý nút trên thông báo phải được khai báo trước khi router chạy.
- Icon là font rút gọn; thêm icon mới thì chạy `pnpm --filter mobile icons`.

## Mô hình dữ liệu

| Bảng | Vai trò |
|---|---|
| `users` | Khách và nông dân. Có `gender`, `salutation`, `short_name` (cách xưng hô), ảnh đại diện, mật khẩu riêng (tuỳ chọn), điểm nhận và nhà / phòng |
| `clusters` | Điểm nhận hàng: ký túc xá và khu trọ ở Hà Nội (Ký túc xá Bách Khoa, Ký túc xá Mễ Trì, khu trọ Cầu Giấy, Đống Đa, Thanh Xuân) |
| `farms`, `produce`, `farm_capacity` | Nông hộ, loại rau củ, năng suất đăng ký theo ngày (kg) của từng hộ cho từng loại |
| `boxes`, `box_items` | Hộp rau theo mùa: mỗi mùa khoảng 3 **mix**, mỗi mix 3 size S / M / L (3, 6, 12 kg cho 1, 2, 3–4 người), giá đồng nhất theo size (190.000₫, 320.000₫, 520.000₫), hộp nào cũng đủ ăn 7 ngày; thành phần theo kg, thực đơn theo ngày nằm sẵn trong hộp |
| `orders` | Một đơn = một loại hộp × số lượng, có ngày giao (thứ Tư hoặc Chủ nhật), điểm nhận, lời nhắn từ quê, và thực đơn riêng nếu khách đã đổi. `recipient_name`, `recipient_phone`: người nhận khi đặt cho người thân. `payment_method` (`transfer` chuyển khoản trước, `cod` trả khi nhận) và `payment_status` (`pending`, `paid`) |
| `subscriptions` | Gói định kỳ tuần / hai tuần / tháng, có lời nhắn riêng và người nhận (`recipient_name`, `recipient_phone`) khi đặt cho người thân |
| `group_orders` | Nhóm gom đơn theo điểm nhận, đủ nhóm thì miễn phí giao |
| `harvest_runs`, `harvest_commands` | Chuyến giao theo ngày giao và lệnh thu hoạch gửi từng nông hộ (chờ, đồng ý, không đồng ý) |
| `change_requests` | Yêu cầu của nông hộ chờ quản trị duyệt: thông tin vườn, rau củ đăng ký, rau củ mới |
| `refund_requests` | Yêu cầu trả hàng / hoàn tiền kèm bằng chứng và kết quả xử lý |
| `push_devices`, `broadcasts` | Thiết bị nhận thông báo đẩy; thông báo quản trị đã gửi |

## Tính năng

### Khách hàng
- **Hộp rau** (`/hop-rau`): bán theo hộp, không bán lẻ. Chọn mix (Thùng rau mẹ gửi, Nương rau vùng cao, Củ quả hầm canh) rồi chọn size S / M / L như chọn cỡ áo: S 3 kg cho 1 người (190.000₫), M 6 kg cho 2 người (320.000₫), L 12 kg cho 3–4 người (520.000₫); mix nào cũng cùng giá theo size. Mỗi hộp ghi rõ thành phần, rau từ vườn nào, và thực đơn 7 ngày (trưa, tối) kèm cách làm.
- **Ba cách nhận**: gói định kỳ, gom đơn cùng điểm nhận (đủ nhóm miễn phí giao), mua một lần.
- **Phí giao theo size, khách trả**: S 15.000₫, M 20.000₫, L 30.000₫ mỗi hộp, áp dụng cho cả đơn mua một lần và gói định kỳ. Riêng nhóm gom đơn đủ người lúc chốt sổ thì cả nhóm miễn phí giao.
- **Giao cố định thứ Tư và Chủ nhật, chốt sổ 18h00 hôm trước**: băng đếm ngược tới giờ chốt sổ của ngày giao gần nhất; quá giờ chốt thì đơn tính cho ngày giao kế tiếp. Huỷ miễn phí trước giờ chốt.
- **Đặt cho người thân**: bố mẹ đặt cho con ở xa. Ở form đặt hộp và form gói định kỳ, bật "Đặt cho người thân" rồi nhập tên, số điện thoại người nhận; lời nhắn trở thành "lời nhắn của người gửi". Đơn đặt cho người thân luôn trả trước.
- **Thanh toán**: chuyển khoản trước hoặc trả khi nhận. Gói định kỳ và đơn đặt cho người thân mặc định chuyển khoản trước; đơn mua một lần và gom đơn cho khách chọn. Chi tiết đơn hiện cách thanh toán và trạng thái (chưa / đã thanh toán). Chưa có cổng thanh toán: quản trị đánh dấu "Đã thanh toán" khi nhận được tiền.
- **Sau khi đặt**: lời nhắn quan tâm từ quê và thông điệp tác động (tiền về tay nông hộ, số kg, số bữa). Tiền về tay nông hộ là tiền mua rau tại vườn theo size: S 65.000₫, M 112.000₫, L 185.000₫ mỗi hộp (chưa kể phụ cấp tổ sơ chế tại bản S 7.000₫, M 12.000₫, L 20.000₫).
- **Hướng dẫn bảo quản**: trang hộp rau và chi tiết đơn đều có cách giữ rau tươi, suy ra từ loại rau củ trong hộp: rau lá để ráo, bọc kín, cất ngăn mát 3–5°C; củ quả để nơi khô ráo, thoáng mát; kèm mẹo ngắn.
- **Hành trình có cảm xúc** (`/don-hang`): 18h00 hôm trước đơn vào sổ → 4h00 rau đang được nông hộ thu hoạch → 6h00 hàng lên xe lạnh về phố → 16h00 rau quê đã có tại điểm nhận.
- **Đổi thực đơn bằng AI**: dưới cách làm của mỗi bữa có ô "Tôi muốn cách làm khác" để gõ ý muốn (ít dầu mỡ, kiểu Hàn, món đang hot…). AI tìm công thức mới trên mạng, chỉ nấu từ rau củ trong hộp, không lặp món đã có, và ghi nguồn. Nút to **Đổi thực đơn cả tuần** nằm trên các ngày, kèm "Về thực đơn gốc". Thực đơn đã đổi được lưu theo từng đơn. Không có khoá AI thì đổi sang món khác của bếp nhà.
- **Trả hàng / Hoàn tiền**: trong 3 ngày sau khi hộp tới điểm nhận, khách gửi yêu cầu với lý do (chưa nhận được hàng, thiếu hàng, hư hỏng, giao sai, vỡ hỏng), mô tả tối đa 200 từ, **4 ảnh đủ các góc và 1 video tối đa 60 giây**, và chọn hoàn tiền hoặc giao bù. Riêng "chưa nhận được hàng" không bắt buộc ảnh và video. Khách theo dõi trạng thái ngay trong đơn và rút lại được khi đang xác minh.
- **Gói định kỳ** (`/dinh-ky`): đổi số hộp, tần suất, tạm dừng / bật lại, và **dời hộp tiếp theo** sang một ngày giao khác (thứ Tư hoặc Chủ nhật), được phép tới trước giờ chốt sổ của hộp đó 24 giờ. Mỗi kỳ trả trước bằng chuyển khoản, gồm phí giao theo size.
- **Gom đơn chung** (`/gom-don`): tạo nhóm theo điểm nhận (ký túc xá, khu trọ), chọn ngày giao thứ Tư hoặc Chủ nhật trong 2 tuần tới (giờ giao luôn 16h00), link mời, tham gia / rời nhóm trước giờ chốt.
- **Tra cứu QR** (`/tra-cuu/[đơn]`): trang công khai sau mã QR trên bao bì: giờ thu hoạch, nông hộ, thành phần hộp; không lộ danh tính người mua lẫn người nhận.
- **Tài khoản**: ảnh đại diện, họ tên, điện thoại, điểm nhận và nhà / phòng, giới tính, cách xưng hô và tên gọi.

### Nông dân (`/farmer`)
- Một thông điệp chữ to, lịch sự: *"Bác Ba ơi, 4h sáng 30/9 nhờ bác cắt giúp đúng 15 kg cà rốt và 20 kg bắp cải ạ. Xe tải lạnh sẽ qua lấy lúc 6h. Cảm ơn bác nhiều ạ!"*
- Trả lời **Có** hoặc **Không** ngay trên màn hình, hoặc **Đồng ý** / **Không đồng ý** ngay trên thông báo mà không cần mở app. Đã báo không cắt được vẫn đổi lại thành đồng ý được. Bộ não thấy hộ nào chưa trả lời, hộ nào không cắt được.
- Dưới lệnh ghi rõ cách thanh toán cho nông hộ: **50% khi chuyến hàng được xác nhận, 50% còn lại trong 48 giờ sau khi giao xong** (chỉ là thông tin; việc chi trả làm ngoài hệ thống).
- Lệnh chỉ về vào tối trước ngày giao (thứ Ba, thứ Bảy), khi chuyến đủ số hộp tối thiểu.
- Bên dưới là các lần thu hoạch trước.
- **Rau củ đăng ký** (`/farmer/nang-suat`): đổi sản lượng mỗi ngày, thêm hoặc ngừng cung cấp. Loại chưa có trong danh sách thì **đăng ký mới kèm ảnh** (chụp hoặc chọn ảnh).
- **Thông tin vườn** (`/farmer/vuon`): tên, địa chỉ, tỉnh, lời giới thiệu.
- **Mọi thay đổi của nông hộ phải được quản trị duyệt** mới có hiệu lực. Nông dân thấy yêu cầu đang chờ (cũ → mới), rút lại được, và được báo kết quả kèm lý do nếu bị từ chối.

### Quản trị (`/admin`)

| Tab | Việc làm được |
|---|---|
| **Bộ não** | So nhu cầu với năng suất, xem trước "nếu chốt sổ bây giờ", dự báo 7 ngày, và **số hộp đã đặt so với mức tối thiểu** (`MIN_BATCH_BOXES`) của chuyến sắp tới. **Chốt sổ & gửi lệnh**: chia nhu cầu cho từng nông hộ theo tỷ lệ năng suất đăng ký (bước 0,5 kg, không vượt năng suất). Tự chạy lúc 18h00 tối trước ngày giao qua cron, **chỉ khi chuyến đủ số hộp tối thiểu**; nút bấm tay vẫn mở được chuyến dưới mức tối thiểu. Theo dõi chuyến và chuyển trạng thái thu hoạch → lên xe lạnh → tới điểm nhận |
| **Yêu cầu chờ duyệt** (trong Bộ não) | Mỗi thay đổi nông hộ xin hiện dạng cũ → mới, rau củ mới hiện kèm ảnh; duyệt hoặc từ chối kèm lý do |
| **Thông báo đẩy** (trong Bộ não) | Gửi tới điện thoại, trình duyệt hoặc tất cả. Có **mẫu gửi thử** cho từng loại: lệnh thu hoạch có nút Đồng ý / Không đồng ý, đơn mới, các bước hành trình, nhắc chốt sổ, nhóm đủ nhà, thực đơn |
| **Hoàn tiền** (`/admin/hoan-tien`) | Xem ảnh, video bằng chứng; chọn hoàn tiền (kèm số tiền) hoặc giao bù; chấp nhận hoặc từ chối kèm lời nhắn |
| **Các bảng dữ liệu** | Đơn, hộp rau, thành phần hộp, rau củ, năng suất, nông hộ, lệnh thu hoạch, gói định kỳ, gom đơn, điểm nhận, người dùng. Sửa nhanh trong bảng, xem được trên điện thoại. Bảng Đơn hàng có cột thanh toán và người nhận; đánh dấu **Đã thanh toán** ngay trong bảng |
| **Người dùng** | Ngoài bảng: xem và đổi ảnh đại diện, đặt mật khẩu riêng cho từng tài khoản hoặc cho dùng lại mật khẩu demo, sửa giới tính và cách xưng hô |
| **Dung lượng** (`/admin/dung-luong`) | Cơ sở dữ liệu và kho tệp đang đầy tới đâu, dung lượng và số dòng từng bảng, và dọn dữ liệu không còn cần |

**Về việc dọn dung lượng:** hệ thống **không tự xoá gì**. Quản trị chọn mục, đọc danh sách sẽ bị xoá, rồi xác nhận vì không khôi phục được. Các mục có thể dọn: tệp không còn nơi nào dùng (kể cả tệp của yêu cầu hoàn tiền đã rút, hiện ra sau 24 giờ), bằng chứng hoàn tiền đã xử lý quá 60 ngày, yêu cầu của nông hộ đã xử lý quá 30 ngày, thông báo quản trị quá 7 ngày. Đơn hàng, chuyến giao, lệnh thu hoạch, kết quả hoàn tiền, gói định kỳ, nhóm và tài khoản **luôn được giữ**.

## Cách xưng hô

Mọi lời chào, thông báo và câu chữ gửi tới một người đều dùng cách xưng hô lưu trong cơ sở dữ liệu.

| | Nam | Nữ | Không nêu giới tính |
|---|---|---|---|
| Nông dân | bác | cô | bác |
| Khách hàng | anh | chị | bạn |

- Mặc định theo giới tính (`users.gender`). Người dùng tự chọn khác trong trang Tài khoản: ba lựa chọn nhanh (nông dân: bác, cô, chú; khách: anh, chị, bạn) hoặc tự nhập (ví dụ "u", "dì"), cùng với tên gọi (`users.short_name`).
- Máy chủ trả sẵn `call_name` ("Cô Tư") và `pronoun` ("cô") trong `GET /api/users/me`; app và web không tự đoán.
- Thông báo quản trị gửi cho mọi người thì dùng "bạn".

## Thông báo

Lời lẽ thông báo do máy chủ soạn. Bấm vào thông báo sẽ mở đúng màn hình liên quan: đúng đơn hàng, lệnh thu hoạch, trang duyệt.

Có hai đường giao:

1. **Hỏi máy chủ định kỳ** (luôn chạy, không cần cấu hình): khi app hoặc trang web đang mở, cứ 15 giây hỏi `/api/notifications` rồi hiện thông báo tại chỗ, kể cả thông báo quản trị. Không phụ thuộc Google / Apple.
2. **Đẩy thật** (nhận cả khi đã đóng app), cần thêm khoá:
   - **Web**: ba biến `VAPID_*` trên Vercel. Brave mặc định tắt dịch vụ đẩy: bật "Use Google services for push messaging" trong `brave://settings/privacy`.
   - **Android**: `apps/mobile/google-services.json` (đã có trong repo), và khoá FCM V1 tải lên Expo bằng `eas credentials`.
   - **iOS**: hồ sơ ký phải có quyền Push Notifications (`aps-environment`) và khoá APNs của chính tài khoản Apple Developer đó được tải lên Expo. Chứng chỉ ký dùng chung không nhận được thông báo đẩy.

Trả lời từ nút trên thông báo khi app đã đóng hẳn: Android dùng tác vụ nền; iOS tuỳ hệ điều hành có mở app ở nền hay không, nếu không thì câu trả lời được gửi khi mở app lần tới.

## Ảnh và video

Mọi ảnh và video đều được nén **trên máy người dùng** trước khi gửi.

| Loại | Nén còn | Lưu ở |
|---|---|---|
| Ảnh đại diện | 256 × 256 | Cơ sở dữ liệu |
| Ảnh rau củ mới | 320 px cạnh dài | Cơ sở dữ liệu |
| Ảnh bằng chứng hoàn tiền | 1280 px cạnh dài | Kho tệp (Vercel Blob) |
| Video bằng chứng hoàn tiền | 720p, 30 khung hình/giây, khoảng 1,2 Mbps, tối đa 60 giây | Kho tệp (Vercel Blob) |

- Video được nén lại trên web, Android và iOS. Trên mobile dùng `react-native-compressor`, được vá để giới hạn 30 khung hình/giây (`patches/`).
- Ảnh đại diện được tải qua địa chỉ `/api/avatar/{id}?v=…`, không nằm trong cookie phiên đăng nhập.
- Máy chủ chỉ nhận bằng chứng là tệp do chính nó lưu, không nhận đường link ngoài.

## Giao diện & nền tảng
- Material 3 Expressive: token màu/hình/chuyển động, sheet/dialog qua portal, thanh điều hướng mờ khi cuộn, loader nhiều hình, hỗ trợ giảm chuyển động.
- Sáng/tối theo hệ thống hoặc tự chọn.
- App mobile: bàn phím không che ô nhập. Màn hình tự đo phần bị bàn phím che rồi cuộn ô đang nhập vào tầm nhìn (`apps/mobile/components/keyboard.tsx`), kể cả trên Android chế độ tràn viền.

## Phạm vi thí điểm
- Giao tại Hà Nội cho sinh viên và người đi làm xa nhà, nhận tại ký túc xá và khu trọ; nguồn rau từ Bắc Kạn và Tuyên Quang; mỗi hộp mix từ nhiều nông hộ.
- Giao hai chuyến mỗi tuần, thứ Tư và Chủ nhật, mỗi chuyến khoảng 250 hộp; chuyến chỉ tự mở khi đủ `MIN_BATCH_BOXES` hộp (mặc định 240).
- Khách trả trước bằng chuyển khoản (hoặc trả khi nhận với đơn mua một lần, gom đơn); phí giao theo size do khách trả. Việc đối soát tiền làm ngoài hệ thống, quản trị đánh dấu đơn đã thanh toán.
- Nông hộ được trả theo giá mua tại vườn mỗi hộp (S 65.000₫, M 112.000₫, L 185.000₫): 50% khi chuyến được xác nhận, 50% trong 48 giờ sau khi giao xong.

## Việc còn lại
- Thanh toán trực tuyến và tự đối soát chuyển khoản (hiện quản trị đánh dấu đã thanh toán), và hoàn tiền tự động (hiện quản trị ghi nhận kết quả, việc chuyển tiền làm ngoài hệ thống).
- Sổ chi trả cho nông hộ (50% khi xác nhận chuyến, 50% sau giao) và phụ cấp tổ sơ chế: hiện chỉ hiển thị quy tắc, chưa hạch toán.
- Xử lý chuyến không đủ số hộp tối thiểu mà quản trị cũng không mở tay (hiện đơn nằm lại trong sổ chờ quản trị; chưa tự dời sang ngày giao sau hay báo cho khách).
- Thực đơn kèm hộp chưa chia lại khẩu phần theo cỡ hộp mới (3, 6, 12 kg); hộp size S có 6 loại rau củ nên một vài món trong thực đơn chung dùng loại chỉ có từ size M.
- Người dùng tự đăng ký tài khoản và tự đổi mật khẩu (hiện quản trị đặt mật khẩu).
- Thực đơn hộp thay đổi theo mùa (hiện có bộ Thu 2026).
- Chuyển ảnh rau củ mới sang kho tệp nếu số nông hộ tăng nhiều.
