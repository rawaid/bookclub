"use client";

import { useEffect, useState, useCallback } from "react";
import BookCard from "./BookCard";
import Link from "next/link";
import Image from "next/image";

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

interface Winner {
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  suggested_by: string;
  vote_count: number;
}

interface ProgressEntry {
  id: number;
  username: string;
  message: string;
  created_at: string;
}

interface CurrentUser {
  id: number;
  username: string;
  is_admin: boolean;
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
  const [winner, setWinner] = useState<Winner | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [progressMsg, setProgressMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closingVoting, setClosingVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const res = await fetch("/api/progress");
    const data = await res.json();
    setProgress(data.progress);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/suggestions");
    const data = await res.json();
    setSuggestions(data.suggestions);
    setMonth(data.month);
    setYear(data.year);
    setWinner(data.winner ?? null);

    const voted = data.suggestions.find((s: Suggestion) =>
      s.voters?.split(",").includes(currentUser.username)
    );
    setMyVote(voted?.id ?? null);
    setLoading(false);

    if (data.winner) {
      loadProgress();
    }
  }, [currentUser.username, loadProgress]);

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

  async function removeSuggestion(id: number, title: string) {
    if (!confirm(`Remove "${title}" from this month's suggestions?`)) return;
    await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" });
    load();
  }

  async function closeVoting() {
    if (!confirm("Close voting and declare a winner for this month?")) return;
    setClosingVoting(true);
    const res = await fetch("/api/close-voting", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Something went wrong");
    }
    setClosingVoting(false);
    load();
  }

  async function submitProgress(e: React.FormEvent) {
    e.preventDefault();
    if (!progressMsg.trim()) return;
    setSubmitting(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: progressMsg.trim() }),
    });
    setProgressMsg("");
    setSubmitting(false);
    loadProgress();
  }

  const totalVoters = suggestions.reduce((acc, s) => acc + s.vote_count, 0);
  const monthLabel = month && year ? `${MONTH_NAMES[month - 1]} ${year}` : "This Month";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        Loading...
      </div>
    );
  }

  if (winner) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex gap-6 items-start">
          {winner.cover_url ? (
            <Image
              src={winner.cover_url}
              alt={winner.title}
              width={96}
              height={144}
              className="rounded-xl object-cover shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-36 bg-amber-100 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
              📖
            </div>
          )}
          <div>
            <p className="text-amber-700 font-semibold text-sm uppercase tracking-wide mb-1">
              {monthLabel} — We&apos;re reading
            </p>
            <h1 className="text-3xl font-bold text-stone-800 leading-tight">{winner.title}</h1>
            <p className="text-stone-500 text-base mt-1">by {winner.author}</p>
            {winner.description && (
              <p className="text-stone-600 text-sm mt-3">{winner.description}</p>
            )}
            <p className="text-stone-400 text-xs mt-3">
              {winner.vote_count} vote{winner.vote_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Progress sharing */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-stone-800 mb-3">Share your progress</h2>
          <form onSubmit={submitProgress} className="flex gap-2">
            <input
              type="text"
              value={progressMsg}
              onChange={(e) => setProgressMsg(e.target.value)}
              placeholder="How's the reading going?"
              maxLength={280}
              className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={submitting || !progressMsg.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
            >
              Post
            </button>
          </form>
        </div>

        {/* Progress feed */}
        {progress.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">
            No updates yet — be the first to share your progress!
          </p>
        ) : (
          <div className="space-y-3">
            {progress.map((p) => (
              <div key={p.id} className="bg-white border border-stone-100 rounded-xl px-4 py-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-stone-700 text-sm">{p.username}</span>
                  <span className="text-stone-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-stone-600 text-sm">{p.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{monthLabel}</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {suggestions.length === 0
              ? "No suggestions yet — be the first!"
              : `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} · ${totalVoters} vote${totalVoters !== 1 ? "s" : ""} cast`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.is_admin && suggestions.length > 0 && (
            <button
              onClick={closeVoting}
              disabled={closingVoting}
              className="bg-stone-700 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition"
            >
              {closingVoting ? "Closing…" : "Close Voting"}
            </button>
          )}
          <Link
            href="/suggest"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            + Suggest a Book
          </Link>
        </div>
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
              {currentUser.is_admin && (
                <button
                  onClick={() => removeSuggestion(s.id, s.title)}
                  className="absolute top-2 right-2 text-stone-300 hover:text-red-500 text-xs transition"
                  title="Remove suggestion"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
