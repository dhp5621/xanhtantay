# Xanh Tận Tay — product pivot (28/9) and API contract

## Product in one paragraph
PULL model. Customers in **Hà Nội apartment clusters** pre-order seasonal **boxes** ("Thùng rau mẹ gửi", sizes S/M/L, mixed from several farms in **Bắc Kạn** and **Tuyên Quang**). Every day at **18:00** the book closes; the brain aggregates demand and sends each farmer exactly one **harvest command** sized to their registered capacity (0 % surplus). Farmers cut at **4:00**, the cold truck loads at **6:00**, boxes reach the building lobby at **16:00**. Order before 18:00 → delivered tomorrow.

Removed for good: buying single vegetables, cart, product catalog, recipes/AI kitchen, meal-plan generator, farm diary, livestream, loyalty points/tree, farmer product/stock/diary management, ads.
Kept: subscription, group buying (per cluster), emotional order tracking, QR traceability, avatars, push notifications, light/dark theme, the Material 3 Expressive design.

Each box carries its own **day-by-day menu** (`meal_plan`: days × Trưa/Tối, each dish with ingredients and steps). Each order carries a **care message** (`care_message`, "lời nhắn quan tâm") shown after purchase and on the order.

## Auth
NextAuth credentials (unchanged). `POST /api/auth/callback/credentials` etc. Demo: `lan@gmail.com` (customer), `bacba@xanhtantay.vn` (farmer), password `demo123`. Session user: `{ id, name, email, role: "customer" | "farmer", image }`.

## Types
See `packages/types/src/index.ts` (`Box`, `BoxItem`, `BoxMealDay`, `Order`, `OrderStatus`, `Subscription`, `GroupOrder`, `Cluster`, `Farm`, `HarvestCommand`, `ORDER_TIMELINE`, `ORDER_STATUS_LABELS`, `getOrderStatusLabel`).
`OrderStatus = "placed" | "harvesting" | "loaded" | "delivered" | "cancelled"`. Dates named `*_date` / `next_delivery` are `"YYYY-MM-DD"` strings; `*_at` are ISO timestamps.

Emotional tracking copy (use `ORDER_TIMELINE`):
1. placed — "Đơn đã vào sổ, 18h00 chốt và gửi lệnh về vườn"
2. harvesting — "4h00: Rau đang được {bác Tư} thu hoạch"
3. loaded — "6h00: Hàng lên xe lạnh về phố"
4. delivered — "16h00: Rau quê đã có tại sảnh chung cư nhà bạn"

## Endpoints (all under `/api`)

### Catalog
- `GET /boxes` → `{ boxes: Box[], delivery_date, cutoff_at, ship_fee }`.
  `Box = { id, slug, name, size: "S"|"M"|"L", weight_kg: number, price, season, servings, days, description, image_url, active, meal_plan: BoxMealDay[], items: BoxItem[] }`
  `BoxItem = { produce_id, name, image_url, category, quantity_kg, farms: { id, name, slug, province, location }[] }`
  `BoxMealDay = { day, meals: { time: "Trưa"|"Tối", title, uses: string[], note?, recipe: { minutes?, ingredients: string[], steps: string[] } }[] }`
- `GET /boxes/{slug-or-id}` → `Box`
- `GET /clusters` → `Cluster[]` = `{ id, name, address, district }`
- `GET /farms` → `Farm[]` with `farmer`, `farmer_avatar`, `grows: { produce_id, name, image_url, daily_kg }[]`; `GET /farms/{id-or-slug}`; `GET /farms/mine` (farmer)
- `GET /feed` → `{ delivery_date, cutoff_at, pilot: { city, provinces }, boxes: Box[], farms, groups: GroupOrder[], my_cluster_id, live_order: Order | null, stats: { farms, clusters, boxes_delivered } }`

### Orders
- `GET /orders` (auth) → `Order[]`, newest delivery first. Each has `box` (brief), `cluster`, `allocated: boolean` (cut-off done), `farmers: { farm, slug, farmer, location, confirmed, items }[]`.
- `POST /orders` `{ box_id, quantity?, cluster_id?, address?, note? }` → 201 `Order & { box, cluster, impact: { toFarmers, weightKg, meals, servings } }`. Ship fee 15,000₫ for one-off orders.
- `GET /orders/{id}` public trace → `{ id, status, type, quantity, delivery_date, created_at, harvested_at, loaded_at, delivered_at, cutoff_at, allocated, cluster: { name, district } | null, box: { id, slug, name, size, weight_kg, image_url, days, servings, meal_plan }, contents: { name, image_url, quantity_kg, farms: { name, slug, location, farmer }[] }[], farms: { name, slug, location, farmer, confirmed }[], mine: boolean }` and, when `mine`, also `{ total, subtotal, ship_fee, note, care_message, address, group_order_id }`.
- `POST /orders/{id}/cancel` — only while `status === "placed"` and not `allocated`.

### Subscriptions ("Gói định kỳ")
- `GET /subscriptions` → `Subscription[]` with `box`, `cluster`.
- `POST /subscriptions` `{ box_id, quantity?, frequency?: "weekly"|"biweekly"|"monthly", cluster_id?, address? }` → 201. Free delivery. 409 if an active one exists for the same box.
- `PATCH /subscriptions` `{ id, active?, quantity?, frequency?, box_id? }`.

### Group buying ("Gom đơn chung", per cluster)
- `GET /groups?cluster_id=` → open `GroupOrder[]` with `box`, `cluster`.
- `POST /groups` `{ box_id, cluster_id?, title, min_members, delivery_date?, quantity?, address? }` → 201 (creator joins).
- `GET /groups/{id}` → group + `{ cutoff_at, closed, joined, members: { id, name, avatar_url, quantity, me }[] }`
- `POST /groups/{id}/join` `{ quantity?, address? }` → 201 Order. `POST /groups/{id}/leave`.
  Enough members at cut-off ⇒ everyone's ship fee becomes 0.

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
