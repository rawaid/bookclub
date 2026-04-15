"use client";

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

interface BookCardProps {
  suggestion: Suggestion;
  myVote: number | null;
  onVote: (id: number) => void;
  onUnvote: () => void;
  totalVoters: number;
}

export default function BookCard({ suggestion, myVote, onVote, onUnvote, totalVoters }: BookCardProps) {
  const isMyVote = myVote === suggestion.id;
  const pct = totalVoters > 0 ? Math.round((suggestion.vote_count / totalVoters) * 100) : 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 transition ${
        isMyVote ? "border-amber-400" : "border-transparent"
      } p-5 flex gap-4`}
    >
      {/* Cover */}
      <div className="flex-shrink-0">
        {suggestion.cover_url ? (
          <Image
            src={suggestion.cover_url}
            alt={suggestion.title}
            width={80}
            height={120}
            className="rounded-lg object-cover shadow"
          />
        ) : (
          <div className="w-20 h-28 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-3xl">
            📖
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-stone-800 text-lg leading-tight">{suggestion.title}</h2>
        <p className="text-stone-500 text-sm mb-1">{suggestion.author}</p>
        {suggestion.description && (
          <p className="text-stone-600 text-sm mb-3">{suggestion.description}</p>
        )}

        {/* Vote bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>
              {suggestion.vote_count} vote{suggestion.vote_count !== 1 ? "s" : ""}
              {totalVoters > 0 && ` · ${pct}%`}
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5">
            <div
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Vote button */}
        {isMyVote ? (
          <button
            onClick={onUnvote}
            className="text-sm bg-amber-100 text-amber-700 px-4 py-1.5 rounded-lg font-medium hover:bg-amber-200 transition"
          >
            ✓ My vote · remove
          </button>
        ) : (
          <button
            onClick={() => onVote(suggestion.id)}
            className="text-sm bg-stone-100 text-stone-700 px-4 py-1.5 rounded-lg font-medium hover:bg-amber-100 hover:text-amber-700 transition"
          >
            Vote for this
          </button>
        )}
      </div>
    </div>
  );
}
