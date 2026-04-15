import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, currentMonthYear } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { suggestion_id } = await req.json();
  if (!suggestion_id) {
    return NextResponse.json({ error: "suggestion_id required" }, { status: 400 });
  }

  const { month, year } = currentMonthYear();
  const db = await getDb();

  const check = await db.execute({
    sql: "SELECT id FROM suggestions WHERE id = ? AND month = ? AND year = ?",
    args: [suggestion_id, month, year],
  });

  if (check.rows.length === 0) {
    return NextResponse.json({ error: "Suggestion not found for this month" }, { status: 404 });
  }

  await db.execute({
    sql: `INSERT INTO votes (user_id, suggestion_id, month, year)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, month, year) DO UPDATE SET suggestion_id = excluded.suggestion_id, created_at = datetime('now')`,
    args: [user.id, suggestion_id, month, year],
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { month, year } = currentMonthYear();
  const db = await getDb();

  await db.execute({
    sql: "DELETE FROM votes WHERE user_id = ? AND month = ? AND year = ?",
    args: [user.id, month, year],
  });

  return NextResponse.json({ ok: true });
}
