import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { farms, harvest_commands } from "@/db/schema";
import { pushToUsers } from "./push";

/** Notification category the clients attach "Có" / "Không" buttons to. */
export const COMMAND_CATEGORY = "harvest_command";

export type AnswerResult = { ok: true; command: typeof harvest_commands.$inferSelect } | { ok: false; status: number; error: string };

/** A farmer answers their harvest command: "Có" (confirm) or "Không" (decline). They may still change a "Không" into a "Có". */
export async function answerCommand(id: string, userId: string, answer: "confirm" | "decline"): Promise<AnswerResult> {
  const [row] = await db.select({ c: harvest_commands, owner: farms.owner_id }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).where(eq(harvest_commands.id, id));
  if (!row || row.owner !== userId) return { ok: false, status: 404, error: "Không tìm thấy lệnh thu hoạch" };
  if (answer === "confirm") {
    if (row.c.status === "confirmed") return { ok: true, command: row.c };
    const [updated] = await db.update(harvest_commands).set({ status: "confirmed", confirmed_at: new Date(), declined_at: null }).where(and(eq(harvest_commands.id, id), inArray(harvest_commands.status, ["sent", "declined"]))).returning();
    return { ok: true, command: updated ?? row.c };
  }
  if (row.c.status === "confirmed") return { ok: false, status: 409, error: "Bác đã xác nhận lệnh này rồi. Cần đổi, bác gọi cho điều phối nhé." };
  if (row.c.status === "declined") return { ok: true, command: row.c };
  const [updated] = await db.update(harvest_commands).set({ status: "declined", declined_at: new Date() }).where(and(eq(harvest_commands.id, id), eq(harvest_commands.status, "sent"))).returning();
  return { ok: true, command: updated ?? row.c };
}

/** After a cut-off: each farmer gets their own command as the notification text, with Có / Không buttons. */
export async function notifyCommands(runId: string) {
  const rows = await db.select({ c: harvest_commands, owner: farms.owner_id }).from(harvest_commands).innerJoin(farms, eq(harvest_commands.farm_id, farms.id)).where(and(eq(harvest_commands.run_id, runId), eq(harvest_commands.status, "sent")));
  await Promise.all(rows.map((r) => pushToUsers([r.owner], { title: "Lệnh thu hoạch mới", body: r.c.message, url: "/farmer", category: COMMAND_CATEGORY, data: { commandId: r.c.id } })));
}
