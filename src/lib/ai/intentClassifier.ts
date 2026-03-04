/**
 * Intent Classifier Module – Rule-Based NLP for Book Queries
 *
 * Classifies user queries into actionable intents with entity extraction.
 * Uses a weighted pattern + keyword matching approach.
 */

// ============================================================
// TYPES
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

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
}

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
  keywords: string[];
}

// ============================================================
// INTENT RULES
// ============================================================

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

// Department alias map for entity extraction
const DEPARTMENT_ALIASES: Record<string, string> = {
  cs: "Computer Science", cse: "Computer Science", "computer science": "Computer Science",
  ece: "Electrical Eng.", eee: "Electrical Eng.", electrical: "Electrical Eng.",
  mech: "Mechanical Eng.", mechanical: "Mechanical Eng.",
  bba: "Business Admin", mba: "Business Admin", business: "Business Admin",
  math: "Mathematics", mathematics: "Mathematics",
  physics: "Physics", chemistry: "Chemistry", literature: "Literature",
};

// ============================================================
// ENTITY EXTRACTION
// ============================================================

/** Extract structured entities from a natural language query */
function extractEntities(query: string): Record<string, string> {
  const entities: Record<string, string> = {};

  // Semester: "sem 3", "semester 5", "3rd sem"
  const semMatch = query.match(/sem(?:ester)?\s*(\d)/i) || query.match(/(\d)(?:st|nd|rd|th)\s*sem/i);
  if (semMatch) entities.semester = semMatch[1];

  // Price: "under ₹200", "less than 300"
  const priceMatch = query.match(/under\s*(?:₹|rs\.?|inr)?\s*(\d+)/i) || query.match(/less\s*than\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (priceMatch) entities.maxPrice = priceMatch[1];

  // Department: "cse", "computer science", etc.
  for (const [key, val] of Object.entries(DEPARTMENT_ALIASES)) {
    if (query.toLowerCase().includes(key)) {
      entities.department = val;
      break;
    }
  }

  // Condition: "like new", "good condition", "fair"
  const condMatch = query.match(/like\s*new/i) ? "Like New" : query.match(/good\s*condition/i) ? "Good" : query.match(/fair/i) ? "Fair" : null;
  if (condMatch) entities.condition = condMatch;

  return entities;
}

// ============================================================
// CLASSIFIER
// ============================================================

/**
 * Classify a user query into an intent with confidence score & entities.
 *
 * Scoring: each matching regex pattern adds 2 points, each keyword adds 1.
 * Confidence is normalized to [0, 1].
 */
export function classifyIntent(query: string): IntentResult {
  let bestIntent: Intent = "general";
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;

    for (const pattern of rule.patterns) {
      if (pattern.test(query)) score += 2;
    }

    const qLower = query.toLowerCase();
    for (const kw of rule.keywords) {
      if (qLower.includes(kw)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.intent;
    }
  }

  return {
    intent: bestIntent,
    confidence: Math.min(bestScore / 4, 1),
    entities: extractEntities(query),
  };
}
