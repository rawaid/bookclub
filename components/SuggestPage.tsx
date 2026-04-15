"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BookResult {
  ol_key: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
}

export default function SuggestPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function handleSearch(value: string) {
    setQuery(value);
    setError("");
    setSuccess("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/books?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data.books ?? []);
      setSearching(false);
    }, 400);
  }

  async function suggest(book: BookResult) {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setSuccess(`"${book.title}" has been added to this month's suggestions!`);
    setResults([]);
    setQuery("");
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">Suggest a Book</h1>
      <p className="text-stone-500 text-sm mb-6">
        Search for a book below. We'll pull the description and cover automatically.
      </p>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search by title, author, or ISBN..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          autoFocus
        />
        {searching && (
          <div className="absolute right-4 top-3.5 text-stone-400 text-sm">Searching...</div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {results.map((book) => (
          <div
            key={book.ol_key}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 flex gap-4"
          >
            <div className="flex-shrink-0">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  width={60}
                  height={90}
                  className="rounded-lg object-cover shadow"
                />
              ) : (
                <div className="w-14 h-20 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-2xl">
                  📖
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-stone-800 leading-tight">{book.title}</h3>
              <p className="text-stone-500 text-sm mb-1">{book.author}</p>
              {book.description && (
                <p className="text-stone-600 text-xs mb-3">{book.description}</p>
              )}
              <button
                onClick={() => suggest(book)}
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Suggest This Book"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {query && !searching && results.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p>No books found. Try a different search.</p>
        </div>
      )}
    </main>
  );
}
