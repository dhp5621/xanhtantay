/* Xanh Tận Tay service worker: shows notifications and handles their Có / Không buttons. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const ICON = "/icon.png";
/** Harvest commands can be answered from the notification itself. */
const COMMAND_ACTIONS = [{ action: "confirm", title: "Có, xác nhận" }, { action: "decline", title: "Không" }];

self.addEventListener("push", (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { body: event.data && event.data.text() }; }
  const commandId = msg.data && msg.data.commandId;
  const isCommand = msg.category === "harvest-command" && commandId;
  event.waitUntil(
    self.registration.showNotification(msg.title || "Xanh Tận Tay", {
      body: msg.body || "",
      icon: ICON,
      badge: ICON,
      tag: isCommand ? "cmd-" + commandId : undefined,
      requireInteraction: !!isCommand,
      actions: isCommand ? COMMAND_ACTIONS : [],
      data: { url: msg.url || "/", commandId: isCommand ? commandId : null },
    })
  );
});

function openPage(path) {
  const url = new URL(path || "/", self.location.origin).href;
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url === url && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  });
}

/** Sends the farmer's answer with their session cookie, then says what happened. */
function answer(commandId, action) {
  return fetch("/api/farmer/commands/" + encodeURIComponent(commandId) + "/" + action, { method: "POST", credentials: "include" })
    .then((res) => res.json().catch(() => ({})).then((body) => ({ ok: res.ok, body })))
    .catch(() => ({ ok: false, body: {} }))
    .then(({ ok, body }) =>
      self.registration.showNotification(ok ? (action === "confirm" ? "Đã xác nhận" : "Đã báo không cắt được") : "Chưa gửi được câu trả lời", {
        body: ok ? (action === "confirm" ? "Hẹn bác 4h sáng. Xe tải lạnh qua lấy lúc 6h." : "Điều phối sẽ liên hệ lại với bác.") : body.error || "Bác mở trang để trả lời lại nhé.",
        icon: ICON,
        badge: ICON,
        tag: "cmd-" + commandId,
        data: { url: "/farmer" },
      })
    );
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  if (data.commandId && (event.action === "confirm" || event.action === "decline")) event.waitUntil(answer(data.commandId, event.action));
  else event.waitUntil(openPage(data.url));
});
