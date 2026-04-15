import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

function setAuthCookies(res: NextResponse, id: number, username: string) {
  const opts = { httpOnly: true, maxAge: 60 * 60 * 24 * 365, path: "/" } as const;
  res.cookies.set("user_id", String(id), opts);
  res.cookies.set("username", username, opts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "login") {
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT id, username, password_hash FROM users WHERE email = ? COLLATE NOCASE",
      args: [email.trim()],
    });

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "No account found with that email" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, String(row.password_hash));
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const user = { id: Number(row.id), username: String(row.username) };
    const res = NextResponse.json({ ok: true, user });
    setAuthCookies(res, user.id, user.username);
    return res;
  }

  if (action === "register") {
    const { name, email, password, inviteCode } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const expectedCode = process.env.INVITE_CODE;
    if (expectedCode && inviteCode?.trim() !== expectedCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
    }

    const cleanName = name.trim().slice(0, 32);
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanName)) {
      return NextResponse.json(
        { error: "Name can only contain letters, numbers, spaces, _ and -" },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const db = await getDb();

    try {
      const result = await db.execute({
        sql: "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        args: [cleanName, cleanEmail, hash],
      });

      const user = { id: Number(result.lastInsertRowid), username: cleanName };
      const res = NextResponse.json({ ok: true, user }, { status: 201 });
      setAuthCookies(res, user.id, user.username);
      return res;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        if (err.message.includes("email")) {
          return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
        }
        if (err.message.includes("username")) {
          return NextResponse.json({ error: "That name is already taken — try a different one" }, { status: 409 });
        }
      }
      throw err;
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("user_id");
  res.cookies.delete("username");
  return res;
}
