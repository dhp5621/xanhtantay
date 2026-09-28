import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const PREFIX = "scrypt";

/** "scrypt$<salt>$<hash>", both base64url. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64);
  return `${PREFIX}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** True when the account has a password of its own (set in /admin) rather than the shared demo one. */
export const hasOwnPassword = (stored: string | null | undefined): stored is string => !!stored && stored.startsWith(`${PREFIX}$`);

export async function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}
