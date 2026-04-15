"use client";

import { useEffect, useState, useCallback } from "react";
import BookCard from "./BookCard";
import Link from "next/link";

interface Suggestion {
  id: number;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  suggester: string;
  vote_count: number;
  voters: string | null;
}

interface CurrentUser {
  id: number;
  username: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HomePage({ currentUser }: { currentUser: CurrentUser }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/suggestions");
    const data = await res.json();
    setSuggestions(data.suggestions);
    setMonth(data.month);
    setYear(data.year);

    // Find if current user has voted
    const voted = data.suggestions.find((s: Suggestion) =>
      s.voters?.split(",").includes(currentUser.username)
    );
    setMyVote(voted?.id ?? null);
    setLoading(false);
  }, [currentUser.username]);

  useEffect(() => {
    load();
  }, [load]);

  async function vote(suggestion_id: number) {
    await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion_id }),
    });
    load();
  }

  async function unvote() {
    await fetch("/api/votes", { method: "DELETE" });
    load();
  }

  const totalVoters = suggestions.reduce((acc, s) => acc + s.vote_count, 0);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        Loading...
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            {month && year ? `${MONTH_NAMES[month - 1]} ${year}` : "This Month"}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {suggestions.length === 0
              ? "No suggestions yet — be the first!"
              : `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} · ${totalVoters} vote${totalVoters !== 1 ? "s" : ""} cast`}
          </p>
        </div>
        <Link
          href="/suggest"
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
        >
          + Suggest a Book
        </Link>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">📖</div>
          <p className="text-lg font-medium">No books suggested yet this month.</p>
          <p className="text-sm mt-1">Go ahead and suggest one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s, i) => (
            <div key={s.id} className="relative">
              {i === 0 && s.vote_count > 0 && (
                <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                  Leading
                </div>
              )}
              <BookCard
                suggestion={s}
                myVote={myVote}
                onVote={vote}
                onUnvote={unvote}
                totalVoters={totalVoters}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
