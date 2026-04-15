import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, currentMonthYear } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = await getDb();

  // Delete votes for this suggestion first (FK constraint)
  await db.execute({
    sql: "DELETE FROM votes WHERE suggestion_id = ?",
    args: [Number(id)],
  });

  await db.execute({
    sql: "DELETE FROM suggestions WHERE id = ?",
    args: [Number(id)],
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { month, year } = currentMonthYear();
  const db = await getDb();

  const result = await db.execute({
    sql: `SELECT s.*, u.username as suggester,
              COUNT(v.id) as vote_count,
              GROUP_CONCAT(vu.username) as voters
       FROM suggestions s
       JOIN users u ON u.id = s.suggested_by
       LEFT JOIN votes v ON v.suggestion_id = s.id
       LEFT JOIN users vu ON vu.id = v.user_id
       WHERE s.month = ? AND s.year = ?
       GROUP BY s.id
       ORDER BY vote_count DESC, s.created_at ASC`,
    args: [month, year],
  });

  const winnerResult = await db.execute({
    sql: `SELECT mw.vote_count, s.title, s.author, s.cover_url, s.description, u.username as suggested_by
          FROM monthly_winners mw
          JOIN suggestions s ON s.id = mw.suggestion_id
          JOIN users u ON u.id = s.suggested_by
          WHERE mw.month = ? AND mw.year = ?`,
    args: [month, year],
  });

  const winner = winnerResult.rows[0] ?? null;

  return NextResponse.json({ suggestions: result.rows, month, year, winner });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { ol_key, title, author, description, cover_url } = await req.json();
  if (!ol_key || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { month, year } = currentMonthYear();
  const db = await getDb();

  try {
    const result = await db.execute({
      sql: `INSERT INTO suggestions (ol_key, title, author, description, cover_url, suggested_by, month, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [ol_key, title, author, description ?? null, cover_url ?? null, user.id, month, year],
    });

    const suggestion = await db.execute({
      sql: "SELECT * FROM suggestions WHERE id = ?",
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json({ suggestion: suggestion.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "This book is already suggested this month" },
        { status: 409 }
      );
    }
    throw err;
  }
}
