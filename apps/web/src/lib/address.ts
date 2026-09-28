import { eq } from "drizzle-orm";
import { db } from "@/db";
import { callName, users } from "@/db/schema";
import { addressPerson } from "./commerce";

/** How to address this user, from the form of address stored for them: { call: "Cô Tư", pronoun: "cô" }. */
export async function addressOf(userId: string, role?: "farmer" | "customer" | null) {
  const [row] = await db.select({ name: callName }).from(users).where(eq(users.id, userId));
  return addressPerson(row?.name ?? "", role === "farmer" ? "bác" : "bạn");
}
