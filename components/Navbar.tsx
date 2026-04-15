"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface NavbarProps {
  username: string;
}

export default function Navbar({ username }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  const linkClass = (href: string) =>
    `text-sm font-medium transition ${
      pathname === href
        ? "text-amber-600 underline underline-offset-4"
        : "text-stone-600 hover:text-amber-600"
    }`;

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start sm:gap-6">
          <Link href="/" className="text-lg font-bold text-stone-800 flex items-center gap-2">
            📚 <span>Book Club</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className={linkClass("/")}>
              This Month
            </Link>
            <Link href="/suggest" className={linkClass("/suggest")}>
              Suggest
            </Link>
            <Link href="/history" className={linkClass("/history")}>
              History
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-stone-500 text-sm">
            Hi, <span className="font-semibold text-stone-700">{username}</span>
          </span>
          <button
            onClick={logout}
            className="text-xs text-stone-400 hover:text-red-500 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
