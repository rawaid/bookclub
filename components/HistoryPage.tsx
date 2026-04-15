"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Winner {
  month: number;
  year: number;
  vote_count: number;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  suggested_by: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HistoryPage() {
  const [history, setHistory] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        Loading...
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Reading History</h1>
      <p className="text-stone-500 text-sm mb-8">All the books we've read together.</p>

      {history.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🗓️</div>
          <p className="text-lg font-medium">No history yet.</p>
          <p className="text-sm mt-1">Past monthly winners will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {history.map((w) => (
            <div
              key={`${w.year}-${w.month}`}
              className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 flex gap-4"
            >
              <div className="flex-shrink-0">
                {w.cover_url ? (
                  <Image
                    src={w.cover_url}
                    alt={w.title}
                    width={70}
                    height={105}
                    className="rounded-lg object-cover shadow"
                  />
                ) : (
                  <div className="w-16 h-24 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-3xl">
                    📖
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {MONTH_NAMES[w.month - 1]} {w.year}
                  </span>
                  <span className="text-xs text-stone-400">
                    · {w.vote_count} vote{w.vote_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <h2 className="font-bold text-stone-800 text-lg leading-tight">{w.title}</h2>
                <p className="text-stone-500 text-sm mb-1">{w.author}</p>
                {w.description && (
                  <p className="text-stone-600 text-sm">{w.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
