import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, currentMonthYear } from "@/lib/auth";

export async function GET() {
  const { month, year } = currentMonthYear();
  const db = await getDb();

  const result = await db.execute({
    sql: `SELECT rp.id, rp.message, rp.created_at, u.username
          FROM reading_progress rp
          JOIN users u ON u.id = rp.user_id
          WHERE rp.month = ? AND rp.year = ?
          ORDER BY rp.created_at DESC`,
    args: [month, year],
  });

  return NextResponse.json({ progress: result.rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const { month, year } = currentMonthYear();
  const db = await getDb();

  await db.execute({
    sql: "INSERT INTO reading_progress (user_id, month, year, message) VALUES (?, ?, ?, ?)",
    args: [user.id, month, year, message.trim()],
  });

  return NextResponse.json({ ok: true });
}
