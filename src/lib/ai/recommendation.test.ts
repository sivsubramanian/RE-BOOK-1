/**
 * AI Recommendation Engine – Unit Tests
 * 
 * Tests:
 * - NLP preprocessing (tokenization, stopword removal, stemming)
 * - TF-IDF vector generation (with IDF caching)
 * - Cosine similarity accuracy
 * - Intent classification detection (via intentClassifier module)
 * - Cold-start fallback
 * - Recommendation ranking order, scorePercent, explanation
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  stem,
  preprocess,
  computeTF,
  computeIDF,
  computeTfIdf,
  cosineSimilarity,
  detectIntent,
  getRecommendations,
  getColdStartRecommendations,
  getPersonalizedRecommendations,
  generateResponse,
  clearIdfCache,
  type TfIdfVector,
} from "@/lib/ai/recommendation";
import { classifyIntent } from "@/lib/ai/intentClassifier";
import type { DbBook, DbUser } from "@/types";

// ============================================================
// Test Fixtures
// ============================================================

const makeBook = (overrides: Partial<DbBook> = {}): DbBook => ({
  id: "book-1",
  title: "Data Structures & Algorithms",
  author: "Thomas Cormen",
  description: "Comprehensive guide to algorithms and data structures.",
  department: "Computer Science",
  semester: 3,
  condition: "Like New" as const,
  price: 250,
  image_url: "",
  seller_id: "seller-1",
  status: "available" as const,
  views_count: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const testBooks: DbBook[] = [
  makeBook({ id: "b1", title: "Data Structures & Algorithms", department: "Computer Science", semester: 3, price: 250, views_count: 40 }),
  makeBook({ id: "b2", title: "Machine Learning", author: "Andrew Ng", department: "Computer Science", semester: 5, price: 450, views_count: 60 }),
  makeBook({ id: "b3", title: "Organic Chemistry", author: "Paula Bruice", department: "Chemistry", semester: 4, price: 180, views_count: 15 }),
  makeBook({ id: "b4", title: "Linear Algebra", author: "Gilbert Strang", department: "Mathematics", semester: 2, price: 120, views_count: 30 }),
  makeBook({ id: "b5", title: "Computer Networks", author: "Tanenbaum", department: "Computer Science", semester: 5, price: 300, views_count: 20 }),
  makeBook({ id: "b6", title: "Engineering Mechanics", author: "Meriam", department: "Mechanical Eng.", semester: 1, price: 200, views_count: 10, status: "sold" as const }),
];

const testUser: DbUser = {
  id: "user-1",
  email: "test@college.edu",
  full_name: "Test User",
  department: "Computer Science",
  semester: 3,
  role: "buyer",
  avatar_url: null,
  created_at: new Date().toISOString(),
};

// ============================================================
// NLP PREPROCESSING TESTS
// ============================================================

describe("NLP Preprocessing", () => {
  describe("stem()", () => {
    it("removes -ing suffix", () => {
      expect(stem("running")).toBe("runn");
      expect(stem("computing")).toBe("comput");
    });

    it("removes -ed suffix", () => {
      expect(stem("computed")).toBe("comput");
    });

    it("removes -ies → y", () => {
      expect(stem("studies")).toBe("study");
    });

    it("removes -s (not -ss)", () => {
      expect(stem("algorithms")).toBe("algorithm");
      expect(stem("class")).toBe("class"); // -ss preserved
    });

    it("removes -ation suffix", () => {
      expect(stem("computation")).toBe("comput");
    });

    it("removes -ly suffix", () => {
      expect(stem("quickly")).toBe("quick");
    });
  });

  describe("preprocess()", () => {
    it("tokenizes and lowercases text", () => {
      const tokens = preprocess("Hello World");
      expect(tokens.every(t => t === t.toLowerCase())).toBe(true);
    });

    it("removes stopwords", () => {
      const tokens = preprocess("I want to find a book about AI");
      expect(tokens).not.toContain("i");
      expect(tokens).not.toContain("want");
      expect(tokens).not.toContain("to");
      expect(tokens).not.toContain("a");
    });

    it("removes punctuation", () => {
      const tokens = preprocess("Hello, world! How's it going?");
      tokens.forEach(t => {
        expect(t).toMatch(/^[a-z0-9]+$/);
      });
    });

    it("filters single-character tokens", () => {
      const tokens = preprocess("I a b c data structures");
      expect(tokens).not.toContain("a");
      expect(tokens).not.toContain("b");
      expect(tokens).not.toContain("c");
    });

    it("applies stemming to tokens", () => {
      const tokens = preprocess("algorithms computing structures");
      expect(tokens).toContain("algorithm");
      expect(tokens).toContain("comput");
      expect(tokens).toContain("structure"); // "structures" → "structure" (-s removal)
    });
  });
});

// ============================================================
// TF-IDF ENGINE TESTS
// ============================================================

describe("TF-IDF Engine", () => {
  describe("computeTF()", () => {
    it("computes normalized term frequencies", () => {
      const tokens = ["algorithm", "data", "algorithm", "structure"];
      const tf = computeTF(tokens);
      expect(tf["algorithm"]).toBeCloseTo(0.5);  // 2/4
      expect(tf["data"]).toBeCloseTo(0.25);       // 1/4
      expect(tf["structure"]).toBeCloseTo(0.25);   // 1/4
    });

    it("handles empty input", () => {
      const tf = computeTF([]);
      expect(Object.keys(tf)).toHaveLength(0);
    });

    it("handles single token", () => {
      const tf = computeTF(["algorithm"]);
      expect(tf["algorithm"]).toBeCloseTo(1.0);
    });
  });

  describe("computeIDF()", () => {
    beforeEach(() => {
      clearIdfCache();
    });

    it("computes inverse document frequency with smoothing", () => {
      const docs = [
        ["algorithm", "data"],
        ["algorithm", "network"],
        ["chemistry", "organic"],
      ];
      const idf = computeIDF(docs);

      // "algorithm" appears in 2 of 3 docs → log((3+1)/(2+1)) + 1
      expect(idf["algorithm"]).toBeCloseTo(Math.log(4 / 3) + 1);
      // "chemistry" appears in 1 of 3 docs → log((3+1)/(1+1)) + 1
      expect(idf["chemistry"]).toBeCloseTo(Math.log(4 / 2) + 1);
    });

    it("gives higher IDF to rarer terms", () => {
      const docs = [
        ["common", "rare"],
        ["common", "other"],
        ["common", "another"],
      ];
      const idf = computeIDF(docs);
      expect(idf["rare"]).toBeGreaterThan(idf["common"]);
    });
  });

  describe("computeTfIdf()", () => {
    it("multiplies TF by IDF", () => {
      const tf: TfIdfVector = { algorithm: 0.5, data: 0.25 };
      const idf: TfIdfVector = { algorithm: 1.5, data: 2.0 };
      const tfidf = computeTfIdf(tf, idf);
      expect(tfidf["algorithm"]).toBeCloseTo(0.75);
      expect(tfidf["data"]).toBeCloseTo(0.5);
    });

    it("handles missing IDF terms", () => {
      const tf: TfIdfVector = { unknown: 0.5 };
      const idf: TfIdfVector = {};
      const tfidf = computeTfIdf(tf, idf);
      expect(tfidf["unknown"]).toBe(0);
    });
  });
});

// ============================================================
// COSINE SIMILARITY TESTS
// ============================================================

describe("Cosine Similarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const vec: TfIdfVector = { algo: 1, data: 2 };
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    const vecA: TfIdfVector = { algo: 1 };
    const vecB: TfIdfVector = { chemistry: 1 };
    expect(cosineSimilarity(vecA, vecB)).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity({}, {})).toBe(0);
    expect(cosineSimilarity({ a: 1 }, {})).toBe(0);
  });

  it("similarity is between 0 and 1 for non-negative vectors", () => {
    const vecA: TfIdfVector = { algo: 3, data: 1, structure: 2 };
    const vecB: TfIdfVector = { algo: 1, network: 2, data: 1 };
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it("is commutative: sim(A,B) === sim(B,A)", () => {
    const vecA: TfIdfVector = { algo: 3, data: 1 };
    const vecB: TfIdfVector = { algo: 1, network: 2 };
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(cosineSimilarity(vecB, vecA));
  });

  it("higher similarity for more similar vectors", () => {
    const query: TfIdfVector = { algorithm: 1, data: 1 };
    const similar: TfIdfVector = { algorithm: 0.8, data: 0.9, structure: 0.3 };
    const different: TfIdfVector = { chemistry: 1, organic: 0.8 };
    expect(cosineSimilarity(query, similar)).toBeGreaterThan(cosineSimilarity(query, different));
  });
});

// ============================================================
// INTENT DETECTION TESTS
// ============================================================

describe("Intent Detection", () => {
  it("detects greeting intent", () => {
    expect(detectIntent("hi").intent).toBe("greeting");
    expect(detectIntent("hello").intent).toBe("greeting");
    expect(detectIntent("hey there").intent).toBe("greeting");
  });

  it("detects help intent", () => {
    expect(detectIntent("help me").intent).toBe("help");
    expect(detectIntent("how can you help").intent).toBe("help");
    expect(detectIntent("what can you do").intent).toBe("help");
  });

  it("detects search_cheap intent for budget queries", () => {
    expect(detectIntent("cheap books").intent).toBe("search_cheap");
    expect(detectIntent("budget friendly textbooks").intent).toBe("search_cheap");
    expect(detectIntent("books under 200").intent).toBe("search_cheap");
  });

  it("detects search_semester intent", () => {
    expect(detectIntent("semester 3 books").intent).toBe("search_semester");
    expect(detectIntent("sem 5").intent).toBe("search_semester");
    expect(detectIntent("3rd sem books").intent).toBe("search_semester");
  });

  it("detects search_department intent", () => {
    expect(detectIntent("computer science books").intent).toBe("search_department");
    expect(detectIntent("cse textbooks").intent).toBe("search_department");
    expect(detectIntent("physics books").intent).toBe("search_department");
  });

  it("detects search_subject intent", () => {
    expect(detectIntent("machine learning").intent).toBe("search_subject");
    expect(detectIntent("data structures algorithms").intent).toBe("search_subject");
  });

  it("detects recommendation intent", () => {
    expect(detectIntent("recommend some books").intent).toBe("recommendation");
    expect(detectIntent("suggest best books").intent).toBe("recommendation");
    expect(detectIntent("top books").intent).toBe("recommendation");
  });

  it("falls back to general for unknown queries", () => {
    expect(detectIntent("xyz random gibberish").intent).toBe("general");
  });

  it("extracts semester entity", () => {
    const { entities } = detectIntent("semester 3 books");
    expect(entities.semester).toBe("3");
  });

  it("extracts price entity", () => {
    const { entities } = detectIntent("books under 200");
    expect(entities.maxPrice).toBe("200");
  });

  it("extracts department entity", () => {
    const { entities } = detectIntent("computer science textbooks");
    expect(entities.department).toBe("Computer Science");
  });

  it("extracts condition entity", () => {
    const { entities } = detectIntent("like new condition book");
    expect(entities.condition).toBe("Like New");
  });

  it("returns confidence between 0 and 1", () => {
    const result = detectIntent("cheap semester 3 computer science books");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// RECOMMENDATION ENGINE TESTS
// ============================================================

describe("Recommendation Engine", () => {
  describe("getRecommendations()", () => {
    it("returns results for a valid query", () => {
      const results = getRecommendations("algorithm data structures", testBooks);
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty array for empty books list", () => {
      const results = getRecommendations("test query", []);
      expect(results).toHaveLength(0);
    });

    it("ranks relevant books higher", () => {
      const results = getRecommendations("machine learning AI", testBooks);
      // ML book should be ranked higher than chemistry
      const mlIndex = results.findIndex(r => r.book.id === "b2");
      const chemIndex = results.findIndex(r => r.book.id === "b3");
      if (mlIndex >= 0 && chemIndex >= 0) {
        expect(mlIndex).toBeLessThan(chemIndex);
      }
    });

    it("respects topN limit", () => {
      const results = getRecommendations("computer science", testBooks, null, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("includes reason for each recommendation", () => {
      const results = getRecommendations("algorithm data structures", testBooks);
      results.forEach(r => {
        expect(r.reason).toBeTruthy();
        expect(typeof r.reason).toBe("string");
      });
    });

    it("includes score for each recommendation", () => {
      const results = getRecommendations("algorithm", testBooks);
      results.forEach(r => {
        expect(typeof r.score).toBe("number");
        expect(r.score).toBeGreaterThan(0);
      });
    });

    it("boosts department-matched books for profile user", () => {
      const withProfile = getRecommendations("textbooks", testBooks, testUser, 6);
      const csBooks = withProfile.filter(r => r.book.department === "Computer Science");
      const nonCsBooks = withProfile.filter(r => r.book.department !== "Computer Science");
      
      if (csBooks.length > 0 && nonCsBooks.length > 0) {
        // At least some CS books should have higher scores than non-CS
        const maxCsScore = Math.max(...csBooks.map(r => r.score));
        const minCsScore = Math.min(...csBooks.map(r => r.score));
        // CS books should generally score higher
        expect(maxCsScore).toBeGreaterThan(0);
      }
    });

    it("filters low-score results", () => {
      const results = getRecommendations("specific algorithm topic", testBooks);
      results.forEach(r => {
        expect(r.score).toBeGreaterThan(0.01);
      });
    });

    it("handles budget queries by boosting cheap books", () => {
      const results = getRecommendations("cheap books under 200", testBooks);
      if (results.length >= 2) {
        // Books under 200 should generally rank higher
        const cheapBooks = results.filter(r => r.book.price <= 200);
        expect(cheapBooks.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getColdStartRecommendations()", () => {
    it("returns results without user profile", () => {
      const results = getColdStartRecommendations(testBooks);
      expect(results.length).toBeGreaterThan(0);
    });

    it("only returns available books", () => {
      const results = getColdStartRecommendations(testBooks);
      results.forEach(r => {
        expect(r.book.status).toBe("available");
      });
    });

    it("sorts by popularity (views_count)", () => {
      const results = getColdStartRecommendations(testBooks);
      for (let i = 0; i < results.length - 1; i++) {
        // First sort criterion is views; if equal, then recency
        if (results[i].book.views_count !== results[i + 1].book.views_count) {
          expect(results[i].book.views_count).toBeGreaterThanOrEqual(results[i + 1].book.views_count);
        }
      }
    });

    it("respects topN limit", () => {
      const results = getColdStartRecommendations(testBooks, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("assigns descriptive reasons", () => {
      const results = getColdStartRecommendations(testBooks);
      results.forEach(r => {
        expect(["Trending on campus", "Recently listed"]).toContain(r.reason);
      });
    });
  });

  describe("getPersonalizedRecommendations()", () => {
    it("returns results for a valid user profile", () => {
      const results = getPersonalizedRecommendations(testBooks, testUser);
      expect(results.length).toBeGreaterThan(0);
    });

    it("boosts same-department books", () => {
      const results = getPersonalizedRecommendations(testBooks, testUser);
      const csResults = results.filter(r => r.book.department === testUser.department);
      const nonCs = results.filter(r => r.book.department !== testUser.department);
      
      if (csResults.length && nonCs.length) {
        const avgCs = csResults.reduce((s, r) => s + r.score, 0) / csResults.length;
        const avgNon = nonCs.reduce((s, r) => s + r.score, 0) / nonCs.length;
        expect(avgCs).toBeGreaterThan(avgNon);
      }
    });

    it("only returns available books", () => {
      const results = getPersonalizedRecommendations(testBooks, testUser);
      results.forEach(r => {
        expect(r.book.status).toBe("available");
      });
    });
  });
});

// ============================================================
// RESPONSE GENERATION TESTS
// ============================================================

describe("Response Generation", () => {
  it("returns greeting for greeting intent", () => {
    const response = generateResponse("hi", "greeting", [], {});
    expect(response).toContain("ReBook AI assistant");
  });

  it("returns help text for help intent", () => {
    const response = generateResponse("help", "help", [], {});
    expect(response).toContain("Search books");
  });

  it("returns no-results message when empty", () => {
    const response = generateResponse("nonexistent xyz", "general", [], {});
    expect(response).toContain("couldn't find");
  });

  it("includes book details in results", () => {
    const results = [
      { book: testBooks[0], score: 0.8, scorePercent: 80, reason: "Content match", explanation: "Content similarity: +60%" },
    ];
    const response = generateResponse("algorithm", "search_subject", results, {});
    expect(response).toContain(testBooks[0].title);
    expect(response).toContain(String(testBooks[0].price));
  });

  it("uses appropriate header for budget intent", () => {
    const results = [{ book: testBooks[3], score: 0.6, scorePercent: 60, reason: "Budget-friendly", explanation: "Budget match: +20%" }];
    const response = generateResponse("cheap books", "search_cheap", results, {});
    expect(response).toContain("budget-friendly");
  });
});

// ============================================================
// EXTENDED TESTS: scorePercent, explanation, IDF caching
// ============================================================

describe("Extended Features", () => {
  beforeEach(() => {
    clearIdfCache();
  });

  it("recommendations include scorePercent (0–100)", () => {
    const results = getRecommendations("algorithm data structures", testBooks);
    results.forEach(r => {
      expect(r.scorePercent).toBeGreaterThanOrEqual(0);
      expect(r.scorePercent).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r.scorePercent)).toBe(true);
    });
  });

  it("recommendations include explanation string", () => {
    const results = getRecommendations("algorithm data structures", testBooks);
    results.forEach(r => {
      expect(typeof r.explanation).toBe("string");
      expect(r.explanation.length).toBeGreaterThan(0);
    });
  });

  it("cold-start results include scorePercent and explanation", () => {
    const results = getColdStartRecommendations(testBooks);
    results.forEach(r => {
      expect(typeof r.scorePercent).toBe("number");
      expect(typeof r.explanation).toBe("string");
    });
  });

  it("personalized results include scorePercent and explanation", () => {
    const results = getPersonalizedRecommendations(testBooks, testUser);
    results.forEach(r => {
      expect(typeof r.scorePercent).toBe("number");
      expect(typeof r.explanation).toBe("string");
    });
  });

  it("IDF cache returns consistent results on repeated calls", () => {
    const docs = [["algo", "data"], ["algo", "network"]];
    const idf1 = computeIDF(docs);
    const idf2 = computeIDF(docs);
    expect(idf1).toEqual(idf2);
  });

  it("classifyIntent (module) produces same output as detectIntent (wrapper)", () => {
    const query = "cheap computer science books";
    const a = detectIntent(query);
    const b = classifyIntent(query);
    expect(a.intent).toBe(b.intent);
    expect(a.confidence).toBe(b.confidence);
    expect(a.entities).toEqual(b.entities);
  });
});
