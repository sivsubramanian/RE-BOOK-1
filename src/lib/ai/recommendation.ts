/**
 * AI Recommendation Engine – Hybrid Content-Based Recommendation
 * 
 * Algorithm Components:
 * 1. TF-IDF Vectorization – Computes term frequency & inverse document frequency
 * 2. Cosine Similarity – Measures similarity between user query / profile and books
 * 3. Rule-Based Intent Detection – Classifies user queries into intents
 * 4. Top-N Ranking – Returns highest scored books
 * 
 * Enhancements:
 * - Price-sensitive scoring (budget queries boost cheap books)
 * - Semester-priority ranking (user's semester match gets bonus)
 * - Cold-start fallback (new users get popular/trending books)
 * - NLP preprocessing (stopwords removal, stemming)
 */

import type { DbBook, DbUser } from "@/lib/supabase";

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
function stem(word: string): string {
  let w = word.toLowerCase();
  // Basic suffix removal
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
function preprocess(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// ============================================================
// TF-IDF ENGINE
// ============================================================

interface TfIdfVector {
  [term: string]: number;
}

/** Compute term frequency for a document */
function computeTF(tokens: string[]): TfIdfVector {
  const tf: TfIdfVector = {};
  const len = tokens.length || 1;
  tokens.forEach(t => {
    tf[t] = (tf[t] || 0) + 1;
  });
  // Normalize by document length
  Object.keys(tf).forEach(t => {
    tf[t] = tf[t] / len;
  });
  return tf;
}

/** Compute inverse document frequency across all documents */
function computeIDF(documents: string[][]): TfIdfVector {
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

  return idf;
}

/** Compute TF-IDF vector for a document */
function computeTfIdf(tf: TfIdfVector, idf: TfIdfVector): TfIdfVector {
  const tfidf: TfIdfVector = {};
  Object.entries(tf).forEach(([term, tfVal]) => {
    tfidf[term] = tfVal * (idf[term] || 0);
  });
  return tfidf;
}

/** Compute cosine similarity between two TF-IDF vectors */
function cosineSimilarity(vecA: TfIdfVector, vecB: TfIdfVector): number {
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
// INTENT DETECTION (Rule-Based NLP)
// ============================================================

export type Intent =
  | "search_subject"
  | "search_cheap"
  | "search_semester"
  | "search_department"
  | "search_condition"
  | "recommendation"
  | "greeting"
  | "help"
  | "general";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "search_cheap",
    patterns: [/cheap/i, /budget/i, /afford/i, /low\s*price/i, /under\s*\d+/i, /less\s*than/i, /inexpensive/i],
    keywords: ["cheap", "budget", "affordable", "low price", "inexpensive", "economical"],
  },
  {
    intent: "search_semester",
    patterns: [/sem(?:ester)?\s*\d/i, /\d(?:st|nd|rd|th)\s*sem/i, /semester/i],
    keywords: ["semester", "sem"],
  },
  {
    intent: "search_department",
    patterns: [/computer\s*science/i, /electrical/i, /mechanical/i, /business/i, /math/i, /physics/i, /chemistry/i, /literature/i, /cse/i, /ece/i, /eee/i, /mech/i, /bba/i, /mba/i],
    keywords: ["cs", "cse", "ece", "eee", "mech", "bba", "mba", "department", "branch"],
  },
  {
    intent: "search_condition",
    patterns: [/like\s*new/i, /good\s*condition/i, /fair/i, /new\s*book/i],
    keywords: ["new", "condition", "good", "fair"],
  },
  {
    intent: "search_subject",
    patterns: [/\b(ai|ml|data|algorithm|network|database|os|dsa|python|java|web|cloud|iot|math|calculus|physics|chemistry|organic|linear|algebra|statistics)\b/i],
    keywords: ["ai", "ml", "machine learning", "data structure", "algorithm", "network", "database", "operating system"],
  },
  {
    intent: "recommendation",
    patterns: [/recommend/i, /suggest/i, /what\s*should/i, /best\s*book/i, /top\s*book/i, /popular/i],
    keywords: ["recommend", "suggest", "best", "top", "popular", "trending"],
  },
  {
    intent: "greeting",
    patterns: [/^(hi|hello|hey|howdy|greetings)/i],
    keywords: ["hi", "hello", "hey"],
  },
  {
    intent: "help",
    patterns: [/help/i, /how\s*(do|can|to)/i, /what\s*can\s*you/i, /guide/i],
    keywords: ["help", "guide", "how"],
  },
];

/** Detect intent from user query */
export function detectIntent(query: string): { intent: Intent; confidence: number; entities: Record<string, string> } {
  const entities: Record<string, string> = {};
  let bestIntent: Intent = "general";
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;

    // Pattern matching
    for (const pattern of rule.patterns) {
      if (pattern.test(query)) {
        score += 2;
      }
    }

    // Keyword matching
    const qLower = query.toLowerCase();
    for (const kw of rule.keywords) {
      if (qLower.includes(kw)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.intent;
    }
  }

  // Extract entities
  const semMatch = query.match(/sem(?:ester)?\s*(\d)/i) || query.match(/(\d)(?:st|nd|rd|th)\s*sem/i);
  if (semMatch) entities.semester = semMatch[1];

  const priceMatch = query.match(/under\s*(?:₹|rs\.?|inr)?\s*(\d+)/i) || query.match(/less\s*than\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (priceMatch) entities.maxPrice = priceMatch[1];

  const deptMap: Record<string, string> = {
    cs: "Computer Science", cse: "Computer Science", "computer science": "Computer Science",
    ece: "Electrical Eng.", eee: "Electrical Eng.", electrical: "Electrical Eng.",
    mech: "Mechanical Eng.", mechanical: "Mechanical Eng.",
    bba: "Business Admin", mba: "Business Admin", business: "Business Admin",
    math: "Mathematics", mathematics: "Mathematics",
    physics: "Physics", chemistry: "Chemistry", literature: "Literature",
  };
  for (const [key, val] of Object.entries(deptMap)) {
    if (query.toLowerCase().includes(key)) {
      entities.department = val;
      break;
    }
  }

  const condMatch = query.match(/like\s*new/i) ? "Like New" : query.match(/good\s*condition/i) ? "Good" : query.match(/fair/i) ? "Fair" : null;
  if (condMatch) entities.condition = condMatch;

  return {
    intent: bestIntent,
    confidence: Math.min(bestScore / 4, 1), // Normalize to 0-1
    entities,
  };
}

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================

export interface RecommendationResult {
  book: DbBook;
  score: number;
  reason: string;
}

/**
 * Generate recommendations using Hybrid Content-Based approach
 * Combines: TF-IDF + Cosine Similarity + Price/Semester heuristics
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

  // Compute IDF across all documents + query
  const allDocs = [...bookTokens, queryTokens];
  const idf = computeIDF(allDocs);

  // Compute TF-IDF for query
  const queryTfIdf = computeTfIdf(computeTF(queryTokens), idf);

  // Score each book
  const results: RecommendationResult[] = books.map((book, i) => {
    // 1. TF-IDF Cosine Similarity (base score)
    const bookTfIdf = computeTfIdf(computeTF(bookTokens[i]), idf);
    let score = cosineSimilarity(queryTfIdf, bookTfIdf);

    // 2. Entity-based filtering bonuses
    let reason = "";
    if (entities.department && book.department === entities.department) {
      score += 0.3;
      reason = `Matches ${entities.department} department`;
    }
    if (entities.semester && book.semester === Number(entities.semester)) {
      score += 0.25;
      reason = reason || `Semester ${entities.semester} match`;
    }
    if (entities.condition && book.condition === entities.condition) {
      score += 0.15;
    }

    // 3. Price-sensitive scoring
    if (intent === "search_cheap" || entities.maxPrice) {
      const maxPrice = entities.maxPrice ? Number(entities.maxPrice) : 300;
      if (book.price <= maxPrice) {
        score += 0.2 * (1 - book.price / maxPrice); // Lower price = higher boost
        reason = reason || `Budget-friendly at ₹${book.price}`;
      } else {
        score -= 0.1; // Penalize expensive books
      }
    }

    // 4. Semester-priority for user profile
    if (userProfile?.semester && book.semester === userProfile.semester) {
      score += 0.15;
      reason = reason || `Matches your semester`;
    }
    if (userProfile?.department && book.department === userProfile.department) {
      score += 0.1;
      reason = reason || `From your department`;
    }

    // 5. Availability boost
    if (book.status === "available") {
      score += 0.05;
    }

    // 6. Popularity boost (views)
    score += Math.min(book.views_count / 100, 0.1);

    if (!reason) reason = "Content similarity match";

    return { book, score, reason };
  });

  // Sort by score descending and return top N
  return results
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score > 0.01)
    .slice(0, topN);
}

/**
 * Cold-start fallback – When no user profile or empty query
 * Returns popular/trending available books
 */
export function getColdStartRecommendations(
  books: DbBook[],
  topN: number = 6
): RecommendationResult[] {
  const available = books.filter(b => b.status === "available");
  
  return available
    .sort((a, b) => {
      // Sort by views (popularity) then by recency
      const viewsDiff = b.views_count - a.views_count;
      if (viewsDiff !== 0) return viewsDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, topN)
    .map(book => ({
      book,
      score: 0.5 + Math.min(book.views_count / 50, 0.5),
      reason: book.views_count > 10 ? "Trending on campus" : "Recently listed",
    }));
}

/**
 * Generate "Recommended for You" based on user profile
 * Used on home page when user hasn't searched
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

      // Department match
      if (book.department === userProfile.department) {
        score += 0.4;
        reason = `From your ${userProfile.department} department`;
      }

      // Semester match
      if (book.semester === userProfile.semester) {
        score += 0.3;
        reason = reason || `For your semester ${userProfile.semester}`;
      }

      // Adjacent semester (might need soon)
      if (Math.abs(book.semester - userProfile.semester) === 1) {
        score += 0.15;
        reason = reason || `For upcoming semester`;
      }

      // Popularity
      score += Math.min(book.views_count / 100, 0.15);

      // Recency boost
      const daysSinceListed = (Date.now() - new Date(book.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceListed < 7) score += 0.1;

      if (!reason) reason = "You might like this";

      return { book, score, reason };
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
