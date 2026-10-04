# Xanh Tận Tay — product pivot (28/9) and API contract

## Product in one paragraph
PULL model. **Students and young workers living away from home in Hà Nội** (dormitories, rented rooms; the buyer may be a parent back home) pre-order seasonal **boxes** (three mixes a season such as "Thùng rau mẹ gửi", each in sizes S/M/L = 3 / 6 / 12 kg for 1 / 2 / 3–4 people, one price per size for every mix: 190,000₫ / 320,000₫ / 520,000₫, lasting 7 days, mixed from several farms in **Bắc Kạn** and **Tuyên Quang**). Boxes are delivered on fixed days, **Wednesday and Sunday**; the book for a delivery day closes at **18:00 the day before**. The brain aggregates demand and sends each farmer exactly one **harvest command** sized to their registered capacity (0 % surplus); the automatic cut-off only opens a batch that reaches the minimum (`MIN_BATCH_BOXES`, default 240). Farmers cut at **4:00**, the cold truck loads at **6:00**, boxes reach the pickup point (a "cluster": a dormitory or an area of rented rooms) at **16:00**. See "Proposal alignment" at the end for the rules added with this change.

Removed for good: buying single vegetables, cart, product catalog, recipes/AI kitchen, meal-plan generator, farm diary, livestream, loyalty points/tree, farmer product/stock/diary management, ads.
Kept: subscription, group buying (per cluster), emotional order tracking, QR traceability, avatars, push notifications, light/dark theme, the Material 3 Expressive design.

Each box carries its own **day-by-day menu** (`meal_plan`: days × Trưa/Tối, each dish with ingredients and steps). Each order carries a **care message** (`care_message`, "lời nhắn quan tâm") shown after purchase and on the order. The buyer may write their own (`care_message`, up to 300 characters) on `POST /orders`, `POST /subscriptions`, `POST /groups` and `POST /groups/{id}/join`; left out or blank, one is picked from the built-in list.

## Auth
NextAuth credentials (unchanged). `POST /api/auth/callback/credentials` etc. Demo: `lan@gmail.com` (customer), `bacba@xanhtantay.vn` (farmer), password `demo123`. Session user: `{ id, name, email, role: "customer" | "farmer", image }`.

## Types
See `packages/types/src/index.ts` (`Box`, `BoxItem`, `BoxMealDay`, `Order`, `OrderStatus`, `Subscription`, `GroupOrder`, `Cluster`, `Farm`, `HarvestCommand`, `ORDER_TIMELINE`, `ORDER_STATUS_LABELS`, `getOrderStatusLabel`).
`OrderStatus = "placed" | "harvesting" | "loaded" | "delivered" | "cancelled"`. Dates named `*_date` / `next_delivery` are `"YYYY-MM-DD"` strings; `*_at` are ISO timestamps.

Emotional tracking copy (use `ORDER_TIMELINE`):
1. placed — "Đơn đã vào sổ, 18h00 hôm trước ngày giao chốt và gửi lệnh về vườn"
2. harvesting — "4h00: Rau đang được {bác Tư} thu hoạch"
3. loaded — "6h00: Hàng lên xe lạnh về phố"
4. delivered — "16h00: Rau quê đã có tại điểm nhận của bạn"

## Endpoints (all under `/api`)

### Catalog
- `GET /boxes` → `{ boxes: Box[], delivery_date, cutoff_at, ship_fee, ship_fees: { S, M, L } }`. `delivery_date` is the earliest delivery day still open (a Wednesday or a Sunday), `cutoff_at` its cut-off (18:00 Vietnam time the day before). `ship_fees` is the delivery fee per box by size (15,000 / 20,000 / 30,000₫); `ship_fee` is the size S fee, kept for older clients.
  `Box = { id, slug, name, mix, mix_name, size: "S"|"M"|"L", weight_kg: number, price, season, servings, days, description, image_url, active, meal_plan: BoxMealDay[], items: BoxItem[] }`
  `BoxItem = { produce_id, name, image_url, category, quantity_kg, farms: { id, name, slug, province, location }[] }`
  `BoxMealDay = { day, meals: { time: "Trưa"|"Tối", title, uses: string[], note?, recipe: { minutes?, ingredients: string[], steps: string[] } }[] }`
  A season has about three **mixes** (`mix` is the key, `mix_name` the title, e.g. "Nương rau vùng cao"); each mix comes in sizes S, M, L like clothing, and every box lasts 7 days. `name` is `"{mix_name} · Nhỏ|Vừa|Lớn"`. `boxes` is ordered by mix, then price. Clients show one card per mix with its sizes, and a size switcher on the box screen (sizes of a mix = boxes with the same `mix`).
- `GET /boxes/{slug-or-id}` → `Box`
- `GET /clusters` → `Cluster[]` = `{ id, name, address, district }`
- `GET /farms` → `Farm[]` with `farmer`, `farmer_avatar`, `grows: { produce_id, name, image_url, daily_kg }[]`; `GET /farms/{id-or-slug}`; `GET /farms/mine` (farmer)
- `GET /feed` → `{ delivery_date, cutoff_at, pilot: { city, provinces }, boxes: Box[], farms, groups: GroupOrder[], my_cluster_id, live_order: Order | null, stats: { farms, clusters, boxes_delivered } }`

### Orders
- `GET /orders` (auth) → `Order[]`, newest delivery first. Each has `box` (brief), `cluster`, `allocated: boolean` (cut-off done), `farmers: { farm, slug, farmer, location, confirmed, items }[]`.
- `POST /orders` `{ box_id, quantity?, cluster_id?, address?, note?, care_message?, recipient_name?, recipient_phone?, payment_method?: "transfer"|"cod" }` → 201 `Order & { box, cluster, impact: { toFarmers, toVillage, weightKg, meals, servings } }`. Delivered on the earliest open delivery day. Ship fee = fee of the box size × quantity. `impact.toFarmers` is the amount paid to the farms at the garden (S 65,000 / M 112,000 / L 185,000₫ per box × quantity); `toVillage` the village team allowance (7,000 / 12,000 / 20,000₫ per box).
- `GET /orders/{id}` public trace → `{ id, status, type, quantity, delivery_date, created_at, harvested_at, loaded_at, delivered_at, cutoff_at, allocated, cluster: { name, district } | null, box: { id, slug, name, size, weight_kg, image_url, days, servings, meal_plan }, contents: { name, image_url, quantity_kg, farms: { name, slug, location, farmer }[] }[], farms: { name, slug, location, farmer, confirmed }[], mine: boolean }` and, when `mine`, also `{ total, subtotal, ship_fee, note, care_message, address, group_order_id, recipient_name, recipient_phone, payment_method, payment_status }`. Each `contents` line also has `category` (`"rau_la" | "cu_qua"`). The public response never contains the buyer or the recipient.
- `POST /orders/{id}/cancel` — only while `status === "placed"` and not `allocated`.

### Subscriptions ("Gói định kỳ")
- `GET /subscriptions` → `Subscription[]` with `box`, `cluster`.
- `POST /subscriptions` `{ box_id, quantity?, frequency?: "weekly"|"biweekly"|"monthly", cluster_id?, address?, care_message?, recipient_name?, recipient_phone? }` → 201. The first box is for the earliest open delivery day. Each box pays the delivery fee of its size and is prepaid by transfer. `care_message` goes with every box; left out, each box gets one from the list. 409 if an active one exists for the same box.
- `PATCH /subscriptions` `{ id, active?, quantity?, frequency?, box_id?, next_delivery? }`. `next_delivery` (`YYYY-MM-DD`) moves the next box to another delivery day: a Wednesday or Sunday from the earliest open day up to 28 days later, and only until 24 hours before the cut-off of the box being moved (400 `{ error }` otherwise). Later boxes follow from the new date.

### Group buying ("Gom đơn chung", per cluster)
- `GET /groups?cluster_id=` → open `GroupOrder[]` with `box`, `cluster`.
- `POST /groups` `{ box_id, cluster_id?, title, min_members, delivery_date?, quantity?, address?, care_message?, recipient_name?, recipient_phone?, payment_method? }` → 201 (creator joins).
- `GET /groups/{id}` → group + `{ cutoff_at, closed, joined, members: { id, name, avatar_url, quantity, me }[] }`
- `POST /groups/{id}/join` `{ quantity?, address?, care_message?, recipient_name?, recipient_phone?, payment_method? }` → 201 Order. `POST /groups/{id}/leave`.
  Member orders carry the fee of the box size × quantity. Enough members at cut-off ⇒ everyone's ship fee becomes 0.

### Farmer (extremely minimal)
- `GET /farmer/commands` → `{ farm: { id, name, location } | null, current: HarvestCommand | null, commands: HarvestCommand[] }`
  `HarvestCommand = { id, run_id, farm_id, items: { produce_id, name, kg }[], total_kg, message, status: "sent"|"confirmed", confirmed_at, created_at, delivery_date, run_status }`.
  `message` is the full sentence, e.g. "Bác Ba ơi, 4h sáng 29/9 bác cắt đúng 15 kg cà rốt và 20 kg bắp cải nhé. Xe tải lạnh sẽ qua lấy lúc 6h."
- `POST /farmer/commands/{id}/confirm` → the one button "Đã hiểu & Xác nhận".

### Account, misc
- `GET /users/me`, `PATCH /users/me` `{ name?, phone?, avatar_url? (data URL ≤24KB) | null, cluster_id?, address? }`
- `GET /version` → `{ v }` change signal (poll, refetch on change)
- `POST /push/register`, `DELETE /push/register` (unchanged)
- `GET /qr/{orderId}` SVG QR → opens `/tra-cuu/{orderId}`
- Removed: `/products`, `/recipes/*`, `/diary/*`, `/farms/{id}/diary`, `/users/points`, `/orders/{id}/status`, old `/feed` shape.

## Farmer answers: Có / Không

- `POST /farmer/commands/{id}/confirm` → the command, `status: "confirmed"`. Allowed from `sent` or `declined`.
- `POST /farmer/commands/{id}/decline` → the command, `status: "declined"`, `declined_at` set. `409` with `{ error }` if it was already confirmed.
- `HarvestCommand.status` is `"sent" | "confirmed" | "declined"`; `declined_at: string | null`.
- Push and polled notifications for a new command carry `category: "harvest_command"` (Expo: `categoryId`) and `data: { url: "/farmer", commandId }`. The notification body is the command's full message. Clients attach two buttons to that category, "Có, xác nhận" and "Không", and answer without opening the app.
- `GET /notifications?platform=mobile` items: `{ id, title, body, url, category?, data? }`.

## Menu: another recipe, or a whole new week

`POST /menu` (signed in). The AI searches the web for new recipes cooked from the produce in the box; without AI it falls back to other house dishes. Can take up to a minute.

- Body: `{ action, order_id? , box?, plan?, seen?, day?, meal?, wish? }`
  - `order_id`: the change is saved on that order (owner only). Otherwise send `box` (slug or id) and the `plan` currently on screen; nothing is stored.
  - `action: "meal"` with `day` (the day number) and `meal` (index in that day's `meals`), optional `wish` (free text, max 200 chars).
  - `action: "week"`: a whole new plan, optional `wish`.
  - `action: "reset"`: back to the box's own menu.
  - `seen`: titles already shown to this customer, so they are not suggested again.
- Response: `{ plan: BoxMealDay[], meal?: BoxMeal, customised: boolean, ai: boolean }`. Errors: `{ error }` with 400 / 401 / 404 / 503.
- `BoxMeal.source?: string` names where an AI-found recipe came from; house dishes have none.
- `GET /orders/{id}` → `box.meal_plan` is the order's own menu when customised, and `box.customised: boolean` says so.

## Farmer: registered supply

- `GET /farmer/capacity` → `{ farm: { id, name, location, slug }, items: [{ produce_id, name, category, image_url, daily_kg }], total_kg }`. `items` lists every produce on the platform; `daily_kg: 0` means the farm does not supply it.
- `PUT /farmer/capacity` with `{ items: [{ produce_id, daily_kg }] }` (whole kilograms, 0 to 500; 0 removes it) → same shape as GET. Only the listed produce change. Applies from the next cut-off; commands already sent are not changed.

## Groups: delivery day

`POST /groups` accepts `delivery_date` (`YYYY-MM-DD`) from the earliest open day (`delivery_date` of `GET /boxes`) up to 14 days later, and it must be a delivery day (Wednesday or Sunday; 400 otherwise). Only the day is chosen; delivery is always 16:00, cut-off 18:00 the day before.

## Farmer: farm profile

- `PATCH /farms/mine` with any of `{ name, location, province, description }` → the farm (same shape as `GET /farms/mine`). `name` max 80, `location` max 120 (e.g. "Ba Bể, Bắc Kạn"), `province` max 40, each at least 2 characters; `description` max 1200, empty clears it. The slug never changes. Errors: `{ error }` with 400 / 401 / 403 / 404.

## Farmer changes need the operator's approval

Changes to the farm profile and to the registered supply are **requests**. Nothing changes until the operator approves it in `/admin`.

- `PATCH /farms/mine` and `PUT /farmer/capacity` now answer **202** and file a request. A new request replaces the farm's open one of the same kind. `400 { error }` when nothing differs from what is in force.
- `DELETE /farms/mine` and `DELETE /farmer/capacity` withdraw the open request (200, same shape as GET).
- `GET /farms/mine` adds `pending: { id, payload: { name?, location?, province?, description? }, created_at } | null` and `rejected: { note: string | null, reviewed_at } | null` (the last request was turned down within 7 days and nothing is pending). The farm's own fields are always the values in force.
- `GET /farmer/capacity` adds the same `pending` / `rejected` (payload: `[{ produce_id, name, from_kg, to_kg }]`), and each item has `pending_kg: number | null` = the value asked for. `daily_kg` and `total_kg` are always what is in force.
- The farmer is notified of the decision: push, and `GET /notifications` items with id `req-{id}-{approved|rejected}` and url `/farmer/vuon` or `/farmer/nang-suat`.

## Forms of address and polite notifications

- `users.salutation` ("bác", "cô", "u", "anh", "chị"…) and `users.short_name` ("Ba", "Lan") say how a person is addressed. Every notification is worded by the server with them ("Bác Ba ơi, … ạ", "Chị Lan ơi, …"). Clients display server text as is and never compose their own wording for notifications.
- `GET /users/me` includes `salutation` and `short_name`.
- `POST /farmer/commands/{id}/confirm|decline` responses include `notice: { title, body }`: the text to show the farmer after they answer (also from a notification button). Button labels are **"Đồng ý"** and **"Không đồng ý"**.
- Notification `url`s are specific: `/don-hang/{orderId}` for order updates, `/farmer` for harvest commands, `/farmer/vuon` and `/farmer/nang-suat` for approval decisions. Tapping a notification must open exactly that screen.

## Farmer: propose a produce that is not on the list

- `POST /farmer/produce` `{ name, category: "rau_la" | "cu_qua", daily_kg (1..500), image_url?, note? }` → **202** `{ proposals }`. `image_url` is a data URL (`data:image/jpeg|webp|png;base64,…`) of a photo resized on the device to 320 px on the long side, at most 160,000 characters. Errors: 400, 409 (already on the list or already waiting), 429 (5 waiting).
- `DELETE /farmer/produce/{id}` withdraws a waiting proposal → `{ proposals }`.
- `GET /farmer/capacity` adds `proposals: [{ id, name, category, daily_kg, image_url, note, status: "pending" | "approved" | "rejected", reason, created_at }]` (waiting ones, and those decided in the last 7 days). Once approved, the produce appears in `items` with its `daily_kg`.

## Return / refund after delivery

Shown on an order once it is `delivered`, for 3 days after `delivered_at`. One request per order. The operator verifies it in `/admin` and the customer is notified of the outcome.

- `GET /orders/{id}/refund` (owner) → `{ request: Refund | null, can_request: boolean, until: string | null, reason: string | null }` (`reason` says why a request cannot be filed).
- `POST /orders/{id}/refund` `{ reason, description, photos, video_url, method }` → 201 `{ request }`. Errors `{ error }`: 400 / 401 / 404 / 409 (already filed).
  - `reason`: `"not_received"` Chưa nhận được hàng · `"missing"` Thiếu hàng · `"spoiled"` Hàng bị hư hỏng · `"wrong"` Giao sai hàng · `"broken"` Giao hàng bị vỡ, hỏng hàng
  - `description`: the customer's own account, 3 to **200 words**.
  - `photos`: **exactly 4** URLs (all sides of the box) and `video_url`: **1** video of at most **60 seconds**. Required for every reason except `not_received`, where both are optional. Only URLs returned by `POST /upload` are accepted.
  - `method`: what the customer asks for: `"refund"` Hoàn tiền · `"replace"` Giao bù hộp khác. The operator decides and may grant the other one.
- `DELETE /orders/{id}/refund` withdraws it while `status` is `pending`.
- `Refund = { id, order_id, reason, description, photos: string[], video_url, method, status: "pending" | "approved" | "rejected", resolution: "refund" | "replace" | null, refund_amount: number | null, note: string | null, created_at, reviewed_at }`
- Upload evidence first: `POST /upload` as multipart with `file` and `purpose=refund` → `{ url }`. Images up to 3 MB, evidence video up to 30 MB. **Compress on the device before uploading**: images to at most 1280 px on the long side (JPEG/WebP), video to at most 720p, 30 fps and 60 s.
- The verdict arrives as a push and in `GET /notifications` with id `refund-{id}-{approved|rejected}` and url `/don-hang/{orderId}`.

## Form of address follows gender (supersedes the earlier note)

- `users.gender`: `"male" | "female" | null`. When no form of address was chosen by hand, it follows from gender and role: **farmers "bác" (male, or gender not given) / "cô" (female); customers "anh" (male) / "chị" (female) / "bạn" (gender not given).** A hand-chosen `salutation` overrides it (offered: bác / cô / chú for farmers, anh / chị / bạn for customers, or any typed word).
- `GET /users/me` returns `gender`, `salutation`, `short_name`, and the resolved **`call_name`** (e.g. "Cô Tư") and **`pronoun`** (e.g. "cô"). Clients must use `pronoun` wherever the app addresses the signed-in person in its own text (never a hardcoded "bác"), capitalised at the start of a sentence, and `call_name` in greetings.
- `PATCH /users/me` accepts `gender` (`"male" | "female" | null`), `salutation` (letters only, max 12, empty string = follow gender) and `short_name` (max 24, empty = given name), and returns the same fields including the new `call_name` and `pronoun`.
- Accounts may have their own password (set by the admin); sign-in is unchanged for clients.

## Proposal alignment: delivery days, fees, gift orders, payment, storage

- **Delivery days.** Boxes are delivered on **Wednesdays and Sundays** only. Every `delivery_date` / `next_delivery` the API hands out or accepts from customers is one of those days; its cut-off is 18:00 Vietnam time the day before. Clients offer only those days (single orders take the earliest open one; groups and moved subscriptions pick among the next ones).
- **Minimum batch.** `GET /cron/cutoff` runs daily at 18:00 but only closes a book on the evening before a delivery day, and only when the batch has at least `MIN_BATCH_BOXES` boxes (env, default 240). Otherwise it answers `{ skipped: true, reason: "not_delivery_day" | "below_minimum", delivery_date, boxes?, min_batch_boxes? }` and sends no harvest command. `POST /admin/brain` (the operator's button) closes the book regardless of the minimum; `GET /admin/brain` adds `min_batch_boxes` to the preview.
- **Delivery fee.** Per box by size: S 15,000₫, M 20,000₫, L 30,000₫ (`ship_fees` of `GET /boxes`). One-off orders and subscription orders pay it × quantity. Group members pay it too unless the group reaches `min_members` at cut-off, in which case every member's `ship_fee` becomes 0.
- **Farmer share.** No percentage. The farms are paid at the garden S 65,000₫, M 112,000₫, L 185,000₫ per box (`impact.toFarmers` = that × quantity), plus a village team allowance of S 7,000₫, M 12,000₫, L 20,000₫ per box (`impact.toVillage`).
- **Gift orders ("Đặt cho người thân").** `recipient_name` (2 to 80 characters) and `recipient_phone` (Vietnamese number, `0…` or `+84…`) on `POST /orders`, `POST /subscriptions`, `POST /groups`, `POST /groups/{id}/join`: both or neither, 400 `{ error }` when only one is usable. The order's `cluster_id` and `address` are then the recipient's, and the buyer's saved pickup point is left alone. `care_message` is the sender's own note ("lời nhắn của người gửi"). `Order` and `Subscription` return `recipient_name`, `recipient_phone` (null on ordinary orders); a subscription copies them onto every order it creates. They are owner-only on `GET /orders/{id}`.
- **Payment.** `Order.payment_method`: `"transfer"` (chuyển khoản trước) | `"cod"` (trả khi nhận); `Order.payment_status`: `"pending"` | `"paid"`. Subscription orders and gift orders are always `transfer`. Otherwise `payment_method` on `POST /orders`, `POST /groups`, `POST /groups/{id}/join` chooses; left out it is `cod`. There is no online payment: the operator marks an order `paid` in `/admin` (orders table).
- **Farmer payout rule** (text shown with the harvest command, no accounting): 50% when the batch is confirmed, 50% within 48 hours after delivery completes.
- **Storage guidance.** Derived on the client from the `category` of the produce (`BoxItem.category` on `GET /boxes`, `contents[].category` on `GET /orders/{id}`): `rau_la` → dry, wrapped, in the fridge at 3–5°C; `cu_qua` → a dry, airy place; plus a short tip. Web: `storageTips` in `apps/web/src/lib/commerce.ts`; mobile: `storageTips` in `apps/mobile/constants/commerce.ts`.
