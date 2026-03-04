/**
 * AI Recommendation Engine – Hybrid Content-Based Recommendation
 *
 * Architecture:
 * ┌────────────────────┐
 * │   User Query       │
 * └────────┬───────────┘
 *          ▼
 * ┌────────────────────┐
 * │ Intent Classifier  │── entities, confidence
 * └────────┬───────────┘
 *          ▼
 * ┌────────────────────┐
 * │  TF-IDF Vectorizer │── tokenize → TF → IDF (cached) → TF-IDF
 * └────────┬───────────┘
 *          ▼
 * ┌────────────────────┐
 * │   Scorer Pipeline  │── cosine sim + entity bonus + price + profile
 * └────────┬───────────┘
 *          ▼
 * ┌────────────────────┐
 * │  Top-N Ranker      │── sort → filter → slice
 * └────────────────────┘
 *
 * Features:
 * - IDF caching for repeated queries against the same corpus
 * - Explanation generator for transparent recommendations
 * - Price-sensitive scoring, semester priority, cold-start fallback
 */

import type { DbBook, DbUser } from "@/types";
import { classifyIntent } from "./intentClassifier";
// Re-export Intent type for backward compatibility
export type { Intent, IntentResult } from "./intentClassifier";

// ============================================================
// NLP PREPROCESSING
// ============================================================

/** Common English stopwords to remove from text */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "shall", "can", "may", "might", "must", "need", "ought",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "his", "her", "its", "this", "that", "these", "those",
  "for", "and", "nor", "but", "or", "yet", "so", "in", "on", "at",
  "to", "from", "by", "with", "about", "of", "up", "out", "off",
  "over", "under", "into", "through", "after", "before", "during",
  "between", "above", "below", "all", "each", "every", "both", "few",
  "more", "most", "some", "any", "no", "not", "only", "very", "just",
  "than", "too", "also", "how", "what", "which", "who", "when", "where",
  "why", "if", "then", "else", "while", "as", "until", "because",
  "find", "get", "give", "show", "tell", "want", "suggest", "recommend",
  "book", "books", "please", "help", "looking", "search", "me",
]);

/** Simple Porter-like stemmer for English */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith("ation")) w = w.slice(0, -5);
  else if (w.endsWith("ness")) w = w.slice(0, -4);
  else if (w.endsWith("ment")) w = w.slice(0, -4);
  else if (w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.endsWith("ly")) w = w.slice(0, -2);
  else if (w.endsWith("er")) w = w.slice(0, -2);
  else if (w.endsWith("est")) w = w.slice(0, -3);
  else if (w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

/** Tokenize, remove stopwords, and stem */
export function preprocess(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// ============================================================
// TF-IDF ENGINE (with IDF caching)
// ============================================================

interface TfIdfVector {
  [term: string]: number;
}

export type { TfIdfVector };

/**
 * IDF Cache – avoids recomputing IDF for the same corpus within a session.
 * Keyed by a hash of document count + total token count.
 */
const idfCache = new Map<string, TfIdfVector>();
const IDF_CACHE_MAX = 10;

function getIdfCacheKey(documents: string[][]): string {
  const totalTokens = documents.reduce((s, d) => s + d.length, 0);
  return `${documents.length}:${totalTokens}`;
}

/** Clear the IDF cache (useful for tests or when corpus changes) */
export function clearIdfCache(): void {
  idfCache.clear();
}

/** Compute term frequency for a document */
export function computeTF(tokens: string[]): TfIdfVector {
  const tf: TfIdfVector = {};
  const len = tokens.length || 1;
  tokens.forEach(t => {
    tf[t] = (tf[t] || 0) + 1;
  });
  Object.keys(tf).forEach(t => {
    tf[t] = tf[t] / len;
  });
  return tf;
}

/** Compute inverse document frequency across all documents (cached) */
export function computeIDF(documents: string[][]): TfIdfVector {
  const cacheKey = getIdfCacheKey(documents);
  const cached = idfCache.get(cacheKey);
  if (cached) return cached;

  const idf: TfIdfVector = {};
  const N = documents.length;
  const dfMap: Record<string, number> = {};

  documents.forEach(doc => {
    const seen = new Set(doc);
    seen.forEach(term => {
      dfMap[term] = (dfMap[term] || 0) + 1;
    });
  });

  Object.entries(dfMap).forEach(([term, df]) => {
    idf[term] = Math.log((N + 1) / (df + 1)) + 1; // Smoothed IDF
  });

  // Evict oldest entry if cache is full
  if (idfCache.size >= IDF_CACHE_MAX) {
    const firstKey = idfCache.keys().next().value;
    if (firstKey) idfCache.delete(firstKey);
  }
  idfCache.set(cacheKey, idf);

  return idf;
}

/** Compute TF-IDF vector for a document */
export function computeTfIdf(tf: TfIdfVector, idf: TfIdfVector): TfIdfVector {
  const tfidf: TfIdfVector = {};
  Object.entries(tf).forEach(([term, tfVal]) => {
    tfidf[term] = tfVal * (idf[term] || 0);
  });
  return tfidf;
}

/** Compute cosine similarity between two TF-IDF vectors */
export function cosineSimilarity(vecA: TfIdfVector, vecB: TfIdfVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  allTerms.forEach(term => {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// ============================================================
// INTENT DETECTION (delegated to intentClassifier module)
// ============================================================

/**
 * Detect intent from user query.
 * Backward-compatible wrapper around classifyIntent.
 */
export function detectIntent(query: string) {
  return classifyIntent(query);
}

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================

export interface RecommendationResult {
  book: DbBook;
  score: number;
  /** Percentage score (0–100) for display */
  scorePercent: number;
  reason: string;
  /** Human-readable breakdown of why this book was selected */
  explanation: string;
}

// ============================================================
// SCORER PIPELINE
// ============================================================

interface ScoreContribution {
  label: string;
  value: number;
}

/**
 * Score a single book against query context.
 * Returns raw score + list of scoring contributions for transparency.
 */
function scoreBook(
  book: DbBook,
  bookTfIdf: TfIdfVector,
  queryTfIdf: TfIdfVector,
  intent: string,
  entities: Record<string, string>,
  userProfile?: DbUser | null
): { score: number; reason: string; contributions: ScoreContribution[] } {
  const contributions: ScoreContribution[] = [];

  // 1. TF-IDF Cosine Similarity (base score)
  const sim = cosineSimilarity(queryTfIdf, bookTfIdf);
  contributions.push({ label: "Content similarity", value: sim });

  let score = sim;
  let reason = "";

  // 2. Entity-based bonuses
  if (entities.department && book.department === entities.department) {
    const bonus = 0.3;
    score += bonus;
    contributions.push({ label: `${entities.department} dept match`, value: bonus });
    reason = `Matches ${entities.department} department`;
  }
  if (entities.semester && book.semester === Number(entities.semester)) {
    const bonus = 0.25;
    score += bonus;
    contributions.push({ label: `Semester ${entities.semester} match`, value: bonus });
    reason = reason || `Semester ${entities.semester} match`;
  }
  if (entities.condition && book.condition === entities.condition) {
    const bonus = 0.15;
    score += bonus;
    contributions.push({ label: `Condition: ${entities.condition}`, value: bonus });
  }

  // 3. Price-sensitive scoring
  if (intent === "search_cheap" || entities.maxPrice) {
    const maxPrice = entities.maxPrice ? Number(entities.maxPrice) : 300;
    if (book.price <= maxPrice) {
      const bonus = 0.2 * (1 - book.price / maxPrice);
      score += bonus;
      contributions.push({ label: "Budget match", value: bonus });
      reason = reason || `Budget-friendly at ₹${book.price}`;
    } else {
      score -= 0.1;
      contributions.push({ label: "Over budget penalty", value: -0.1 });
    }
  }

  // 4. User-profile bonuses
  if (userProfile?.semester && book.semester === userProfile.semester) {
    const bonus = 0.15;
    score += bonus;
    contributions.push({ label: "Your semester match", value: bonus });
    reason = reason || "Matches your semester";
  }
  if (userProfile?.department && book.department === userProfile.department) {
    const bonus = 0.1;
    score += bonus;
    contributions.push({ label: "Your department match", value: bonus });
    reason = reason || "From your department";
  }

  // 5. Availability boost
  if (book.status === "available") {
    score += 0.05;
    contributions.push({ label: "Available", value: 0.05 });
  }

  // 6. Popularity boost
  const popBonus = Math.min(book.views_count / 100, 0.1);
  if (popBonus > 0) {
    score += popBonus;
    contributions.push({ label: "Popularity", value: popBonus });
  }

  if (!reason) reason = "Content similarity match";

  return { score, reason, contributions };
}

/** Build a human-readable explanation from score contributions */
function buildExplanation(contributions: ScoreContribution[]): string {
  return contributions
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(c => `${c.label}: +${(c.value * 100).toFixed(0)}%`)
    .join(" · ");
}

/**
 * Generate recommendations using Hybrid Content-Based approach.
 * Combines: TF-IDF + Cosine Similarity + Entity matching + Price/Profile heuristics
 */
export function getRecommendations(
  query: string,
  books: DbBook[],
  userProfile?: DbUser | null,
  topN: number = 6
): RecommendationResult[] {
  if (!books.length) return [];

  const { intent, entities } = detectIntent(query);

  // Build document corpus for TF-IDF
  const bookTexts = books.map(b =>
    `${b.title} ${b.author} ${b.description || ""} ${b.department} semester ${b.semester}`
  );
  const bookTokens = bookTexts.map(preprocess);
  const queryTokens = preprocess(query);

  // Compute IDF across all documents + query (cached)
  const allDocs = [...bookTokens, queryTokens];
  const idf = computeIDF(allDocs);

  // Compute TF-IDF for query
  const queryTfIdf = computeTfIdf(computeTF(queryTokens), idf);

  // Score each book through the scorer pipeline
  const results: RecommendationResult[] = books.map((book, i) => {
    const bookTfIdf = computeTfIdf(computeTF(bookTokens[i]), idf);
    const { score, reason, contributions } = scoreBook(
      book, bookTfIdf, queryTfIdf, intent, entities, userProfile
    );

    return {
      book,
      score,
      scorePercent: Math.round(Math.min(score, 1) * 100),
      reason,
      explanation: buildExplanation(contributions),
    };
  });

  // Sort by score descending and return top N
  return results
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score > 0.01)
    .slice(0, topN);
}

/**
 * Cold-start fallback – When no user profile or empty query.
 * Returns popular/trending available books.
 */
export function getColdStartRecommendations(
  books: DbBook[],
  topN: number = 6
): RecommendationResult[] {
  const available = books.filter(b => b.status === "available");

  return available
    .sort((a, b) => {
      const viewsDiff = b.views_count - a.views_count;
      if (viewsDiff !== 0) return viewsDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, topN)
    .map(book => {
      const score = 0.5 + Math.min(book.views_count / 50, 0.5);
      return {
        book,
        score,
        scorePercent: Math.round(Math.min(score, 1) * 100),
        reason: book.views_count > 10 ? "Trending on campus" : "Recently listed",
        explanation: book.views_count > 10
          ? `Popularity: +${Math.round(Math.min(book.views_count / 50, 0.5) * 100)}%`
          : "Recency boost",
      };
    });
}

/**
 * Generate "Recommended for You" based on user profile.
 * Used on home page when user hasn't searched.
 */
export function getPersonalizedRecommendations(
  books: DbBook[],
  userProfile: DbUser,
  topN: number = 8
): RecommendationResult[] {
  const available = books.filter(b => b.status === "available");

  return available
    .map(book => {
      let score = 0;
      let reason = "";
      const contributions: ScoreContribution[] = [];

      // Department match
      if (book.department === userProfile.department) {
        score += 0.4;
        contributions.push({ label: `${userProfile.department} dept`, value: 0.4 });
        reason = `From your ${userProfile.department} department`;
      }

      // Semester match
      if (book.semester === userProfile.semester) {
        score += 0.3;
        contributions.push({ label: `Semester ${userProfile.semester}`, value: 0.3 });
        reason = reason || `For your semester ${userProfile.semester}`;
      }

      // Adjacent semester
      if (Math.abs(book.semester - userProfile.semester) === 1) {
        score += 0.15;
        contributions.push({ label: "Adjacent semester", value: 0.15 });
        reason = reason || "For upcoming semester";
      }

      // Popularity
      const popBonus = Math.min(book.views_count / 100, 0.15);
      if (popBonus > 0) {
        score += popBonus;
        contributions.push({ label: "Popularity", value: popBonus });
      }

      // Recency boost
      const daysSinceListed = (Date.now() - new Date(book.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceListed < 7) {
        score += 0.1;
        contributions.push({ label: "Recently listed", value: 0.1 });
      }

      if (!reason) reason = "You might like this";

      return {
        book,
        score,
        scorePercent: Math.round(Math.min(score, 1) * 100),
        reason,
        explanation: buildExplanation(contributions),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Generate AI assistant response based on intent and results
 */
export function generateResponse(
  query: string,
  intent: Intent,
  results: RecommendationResult[],
  entities: Record<string, string>
): string {
  if (intent === "greeting") {
    return "Hey! 👋 I'm your ReBook AI assistant. I can help you find textbooks, recommend books for your semester, or find budget-friendly options. Try asking:\n• \"Suggest AI books\"\n• \"Cheap semester 3 books\"\n• \"Best CS department books\"";
  }

  if (intent === "help") {
    return "Here's what I can do:\n📚 **Search books** – \"Find machine learning books\"\n💰 **Budget search** – \"Books under ₹200\"\n🎓 **Semester filter** – \"Semester 5 books\"\n🏫 **Department** – \"Computer Science books\"\n⭐ **Recommendations** – \"Recommend books for me\"\n\nJust type your query and I'll find the best matches!";
  }

  if (results.length === 0) {
    return `I couldn't find books matching "${query}". Try:\n• Broadening your search terms\n• Checking different departments\n• Removing price filters\n\nOr ask "help" to see what I can do!`;
  }

  const count = results.length;
  let header = "";

  switch (intent) {
    case "search_cheap":
      header = `💰 Found ${count} budget-friendly book${count > 1 ? 's' : ''}`;
      break;
    case "search_semester":
      header = `🎓 Found ${count} book${count > 1 ? 's' : ''} for Semester ${entities.semester || ''}`;
      break;
    case "search_department":
      header = `🏫 Found ${count} ${entities.department || ''} book${count > 1 ? 's' : ''}`;
      break;
    case "search_subject":
      header = `📚 Found ${count} matching book${count > 1 ? 's' : ''}`;
      break;
    case "recommendation":
      header = `⭐ Here are my top ${count} recommendation${count > 1 ? 's' : ''}`;
      break;
    default:
      header = `📖 Found ${count} result${count > 1 ? 's' : ''}`;
  }

  const bookList = results
    .slice(0, 4)
    .map((r, i) => `${i + 1}. **${r.book.title}** by ${r.book.author} – ₹${r.book.price} (${r.reason})`)
    .join("\n");

  return `${header}:\n\n${bookList}${count > 4 ? `\n\n...and ${count - 4} more. Check the search page for all results!` : ""}`;
}
