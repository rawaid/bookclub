import { cookies } from "next/headers";
import { getDb } from "./db";

export interface SessionUser {
  id: number;
  username: string;
  is_admin: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;

  if (!userId || !username) return null;

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, username, is_admin FROM users WHERE id = ? AND username = ?",
    args: [Number(userId), username],
  });

  const row = result.rows[0];
  if (!row) return null;

  return { id: Number(row.id), username: String(row.username), is_admin: Boolean(row.is_admin) };
}

export function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
