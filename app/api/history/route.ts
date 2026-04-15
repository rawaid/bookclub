import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentMonthYear } from "@/lib/auth";

export async function GET() {
  const { month, year } = currentMonthYear();
  const db = await getDb();

  // Find past months that don't have a recorded winner yet
  const pastMonths = await db.execute({
    sql: `SELECT DISTINCT month, year FROM suggestions
          WHERE (year < ? OR (year = ? AND month < ?))
          AND NOT EXISTS (
            SELECT 1 FROM monthly_winners w
            WHERE w.month = suggestions.month AND w.year = suggestions.year
          )
          ORDER BY year DESC, month DESC`,
    args: [year, year, month],
  });

  // Compute and save winners for those months
  for (const row of pastMonths.rows) {
    const m = Number(row.month);
    const y = Number(row.year);

    const winner = await db.execute({
      sql: `SELECT s.id, COUNT(v.id) as cnt
            FROM suggestions s
            LEFT JOIN votes v ON v.suggestion_id = s.id
            WHERE s.month = ? AND s.year = ?
            GROUP BY s.id
            ORDER BY cnt DESC, s.created_at ASC
            LIMIT 1`,
      args: [m, y],
    });

    if (winner.rows[0]) {
      const w = winner.rows[0];
      await db.execute({
        sql: `INSERT OR IGNORE INTO monthly_winners (suggestion_id, month, year, vote_count)
              VALUES (?, ?, ?, ?)`,
        args: [w.id, m, y, Number(w.cnt)],
      });
    }
  }

  const history = await db.execute({
    sql: `SELECT mw.month, mw.year, mw.vote_count,
               s.title, s.author, s.description, s.cover_url,
               u.username as suggested_by
          FROM monthly_winners mw
          JOIN suggestions s ON s.id = mw.suggestion_id
          JOIN users u ON u.id = s.suggested_by
          ORDER BY mw.year DESC, mw.month DESC`,
    args: [],
  });

  return NextResponse.json({ history: history.rows });
}
