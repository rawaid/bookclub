import { NextRequest, NextResponse } from "next/server";

interface BookResult {
  ol_key: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
}

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_sentence?: { value: string } | string;
  description?: { value: string } | string;
  cover_i?: number;
  cover_edition_key?: string;
  isbn?: string[];
  oclc?: string[];
  lccn?: string[];
}

interface GBVolume {
  volumeInfo?: {
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

function extractOlDescription(doc: OLDoc): string | null {
  const raw = doc.description ?? doc.first_sentence;
  if (!raw) return null;
  if (typeof raw === "object" && "value" in raw) return raw.value;
  if (typeof raw === "string") return raw;
  return null;
}

async function fetchGoogleBooksData(
  title: string,
  author: string
): Promise<{ description: string | null; cover_url: string | null }> {
  try {
    const q = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo(description,imageLinks))`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { description: null, cover_url: null };

    const data: { items?: GBVolume[] } = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    if (!info) return { description: null, cover_url: null };

    const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
    // Google returns http — force https and request a larger zoom
    const cover_url = rawCover
      ? rawCover.replace("http://", "https://").replace("zoom=1", "zoom=2")
      : null;

    return { description: info.description ?? null, cover_url };
  } catch {
    return { description: null, cover_url: null };
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ books: [] });

  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&fields=key,title,author_name,first_sentence,description,cover_i,cover_edition_key,isbn,oclc,lccn&limit=10&sort=editions`;

  const olRes = await fetch(url, { next: { revalidate: 3600 } });
  if (!olRes.ok) {
    return NextResponse.json({ error: "Book search failed" }, { status: 502 });
  }

  const data: { docs: OLDoc[] } = await olRes.json();

  const books: BookResult[] = data.docs.map((doc) => {
    // Try multiple OL cover sources: cover_i (work cover), edition key, or first ISBN
    let cover_url: string | null = null;
    if (doc.cover_i) {
      cover_url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc.cover_edition_key) {
      cover_url = `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
    } else if (doc.isbn?.[0]) {
      cover_url = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
    } else if (doc.oclc?.[0]) {
      cover_url = `https://covers.openlibrary.org/b/oclc/${doc.oclc[0]}-M.jpg`;
    }

    return {
      ol_key: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] ?? "Unknown",
      description: extractOlDescription(doc),
      cover_url,
    };
  });

  // Enrich books missing a cover via Google Books (in parallel, capped at 5)
  await Promise.all(
    books.slice(0, 5).map(async (book) => {
      if (book.cover_url) return;
      const gb = await fetchGoogleBooksData(book.title, book.author);
      if (!book.cover_url) book.cover_url = gb.cover_url;
      if (!book.description) book.description = gb.description;
    })
  );

  return NextResponse.json({ books });
}
