import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, currentMonthYear } from "@/lib/auth";

export async function POST() {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { month, year } = currentMonthYear();
  const db = await getDb();

  const existing = await db.execute({
    sql: "SELECT id FROM monthly_winners WHERE month = ? AND year = ?",
    args: [month, year],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Voting already closed for this month" }, { status: 409 });
  }

  const winner = await db.execute({
    sql: `SELECT s.id, COUNT(v.id) as cnt
          FROM suggestions s
          LEFT JOIN votes v ON v.suggestion_id = s.id
          WHERE s.month = ? AND s.year = ?
          GROUP BY s.id
          ORDER BY cnt DESC, s.created_at ASC
          LIMIT 1`,
    args: [month, year],
  });

  if (!winner.rows[0]) {
    return NextResponse.json({ error: "No suggestions this month" }, { status: 400 });
  }

  const w = winner.rows[0];
  await db.execute({
    sql: "INSERT INTO monthly_winners (suggestion_id, month, year, vote_count) VALUES (?, ?, ?, ?)",
    args: [w.id, month, year, Number(w.cnt)],
  });

  return NextResponse.json({ ok: true });
}
