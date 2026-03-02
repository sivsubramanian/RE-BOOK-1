# RE-BOOK-1 – Smart Campus Book Exchange Platform

> A production-ready peer-to-peer textbook exchange platform for college campuses, powered by a custom AI recommendation engine using **TF-IDF + Cosine Similarity + Rule-Based NLP Intent Detection**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth+DB-3FCF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [AI Recommendation Engine](#ai-recommendation-engine)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [Getting Started](#getting-started)
7. [Project Structure](#project-structure)
8. [Security](#security)
9. [API Reference](#api-reference)

---

## Features

### Core
- **Smart Book Search** – Full-text search with department, semester, condition, and price range filters
- **AI-Powered Recommendations** – TF-IDF + Cosine Similarity chatbot assistant
- **P2P Transaction System** – Request → Accept/Reject → Complete workflow
- **Image OCR** – Extract text from book covers/notes using Tesseract.js
- **Analytics Dashboard** – Recharts-powered platform insights

### Authentication
- **Supabase Auth** – Email/password with session persistence & auto-refresh
- **College Email Restriction** – Only `.edu`, `.ac.in`, `.edu.in` domains allowed
- **Password Strength Meter** – Real-time strength indicator on signup
- **Role-Based Access** – Buyer / Seller roles with RLS enforcement

### Book Module
- **CRUD Operations** – Create, read, update, delete book listings via Supabase
- **Image Upload** – File validation (JPEG/PNG/WebP, max 5MB) with Supabase Storage
- **Status Tracking** – Available → Requested → Sold lifecycle
- **View Count** – Atomic view increment via PostgreSQL RPC

### Seller Studio
- **Add Book Modal** – Full form with image upload, department, semester, condition, price
- **Incoming Requests** – Accept/reject/complete transaction requests
- **Live Stats** – Books listed, pending requests, accepted, completed
- **Listing Management** – View counts, delete books

### AI Module
- **TF-IDF Vectorization** – Term frequency × inverse document frequency scoring
- **Cosine Similarity** – Vector space model for document-query matching
- **Intent Detection** – 8 intents: search_subject, search_cheap, search_semester, search_department, search_condition, recommendation, greeting, help
- **Entity Extraction** – Semester numbers, price limits, department names, conditions
- **Cold-Start Fallback** – Trending/popular books for new users
- **Personalized Ranking** – Department + semester + popularity scoring

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  Pages   │  │Components│  │    AI Engine         │ │
│  │ (Index,  │  │ (Navbar, │  │ (TF-IDF, Cosine    │ │
│  │ Search,  │  │  BookCard,│  │  Similarity, NLP)  │ │
│  │ Profile) │  │  AI Chat)│  │                     │ │
│  └────┬─────┘  └────┬─────┘  └──────────┬──────────┘ │
│       │              │                   │            │
│  ┌────▼──────────────▼───────────────────▼──────────┐│
│  │              React Hooks Layer                    ││
│  │  useBooks()  useTransactions()  useAuth()         ││
│  └──────────────────┬───────────────────────────────┘│
│                     │                                 │
│  ┌──────────────────▼───────────────────────────────┐│
│  │              API Services Layer                   ││
│  │  books.ts    transactions.ts    supabase.ts       ││
│  └──────────────────┬───────────────────────────────┘│
└─────────────────────┼────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼────────────────────────────────┐
│                  Supabase Backend                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │   Auth   │  │ PostgreSQL│  │  Storage          │  │
│  │ (JWT +   │  │ (RLS +    │  │  (Book images)   │  │
│  │  Session)│  │  Triggers)│  │                   │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## AI Recommendation Engine

### Algorithm Pipeline

```
User Query
    │
    ▼
┌─────────────────┐
│ NLP Preprocessing│  → Tokenize, remove stopwords, stem
└────────┬────────┘
         │
    ▼────▼────▼
┌───────────────────┐    ┌──────────────────────┐
│ Intent Detection  │    │  Entity Extraction   │
│ (8 rule-based     │    │  - semester: "5"     │
│  patterns)        │    │  - maxPrice: "200"   │
└────────┬──────────┘    │  - department: "CSE" │
         │               └──────────┬───────────┘
         │                          │
    ▼────▼──────────────────────────▼
┌────────────────────────────────────┐
│      TF-IDF Vectorization          │
│  tf(t,d) = count(t) / |d|         │
│  idf(t) = log((N+1)/(df+1)) + 1   │
│  tfidf(t,d) = tf × idf            │
└────────────────┬───────────────────┘
                 │
    ▼────────────▼
┌────────────────────────────────────┐
│      Cosine Similarity             │
│                                    │
│  sim(q,d) = (q·d) / (|q| × |d|)  │
└────────────────┬───────────────────┘
                 │
    ▼────────────▼
┌────────────────────────────────────┐
│      Heuristic Boosting            │
│  + Department match    (+0.30)     │
│  + Semester match      (+0.25)     │
│  + Budget compliance   (+0.20)     │
│  + User profile match  (+0.15)     │
│  + Availability bonus  (+0.05)     │
│  + Popularity (views)  (+0.10)     │
└────────────────┬───────────────────┘
                 │
    ▼────────────▼
┌────────────────────────────────────┐
│      Top-N Ranking & Response      │
│  Sort by score → format response   │
└────────────────────────────────────┘
```

### Intent Categories

| Intent | Example Query | Pattern |
|--------|--------------|---------|
| `search_cheap` | "Books under ₹200" | `/cheap\|budget\|under\s*\d+/i` |
| `search_semester` | "Semester 5 books" | `/sem(?:ester)?\s*\d/i` |
| `search_department` | "CSE department books" | `/computer\s*science\|cse/i` |
| `search_subject` | "Machine learning books" | `/ai\|ml\|data\|algorithm/i` |
| `search_condition` | "Like new books" | `/like\s*new\|good\s*condition/i` |
| `recommendation` | "Recommend books for me" | `/recommend\|suggest\|best/i` |
| `greeting` | "Hello" | `/^(hi\|hello\|hey)/i` |
| `help` | "How can you help?" | `/help\|how\s*(do\|can\|to)/i` |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Build Tool | Vite 5 | Fast HMR, ESBuild |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible components |
| State | React Query + Custom Hooks | Server state caching |
| Auth | Supabase Auth | JWT sessions, email verification |
| Database | Supabase PostgreSQL | RLS-protected data |
| Storage | Supabase Storage | Book cover images |
| AI | TF-IDF + Cosine Similarity | Custom recommendation engine |
| NLP | Rule-Based Intent Detection | Query understanding |
| OCR | Tesseract.js | Image text extraction |
| Charts | Recharts | Analytics visualizations |
| Animation | Framer Motion | Page transitions, hover effects |
| Icons | Lucide React | SVG icon library |

---

## Database Schema

### ER Diagram

```
┌──────────────────┐       ┌──────────────────┐
│     profiles     │       │      books       │
├──────────────────┤       ├──────────────────┤
│ id (PK, UUID)    │──┐    │ id (PK, UUID)    │
│ email            │  │    │ title            │
│ full_name        │  │    │ author           │
│ department       │  │    │ description      │
│ semester         │  ├───▶│ seller_id (FK)   │
│ role             │  │    │ department       │
│ avatar_url       │  │    │ semester         │
│ created_at       │  │    │ condition        │
└──────────────────┘  │    │ price            │
                      │    │ image_url        │
                      │    │ status           │
                      │    │ views_count      │
                      │    │ created_at       │
                      │    └────────┬─────────┘
                      │             │
                      │    ┌────────▼─────────┐
                      │    │  transactions    │
                      │    ├──────────────────┤
                      │    │ id (PK, UUID)    │
                      ├───▶│ buyer_id (FK)    │
                      └───▶│ seller_id (FK)   │
                           │ book_id (FK)     │
                           │ status           │
                           │ created_at       │
                           │ updated_at       │
                           └──────────────────┘
```

### Row-Level Security (RLS)

- **profiles**: Users can read all; update only their own
- **books**: Anyone can read; only sellers can insert/update/delete their own
- **transactions**: Participants (buyer/seller) can read; buyers create; sellers update status

---

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- Supabase project (free tier works)

### 1. Clone & Install

```bash
git clone <repo-url>
cd RE-BOOK-1
npm install  # or bun install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase/schema.sql` in the SQL Editor
3. Enable email auth in Authentication → Providers
4. Create a storage bucket named `book-images` (public)

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev  # or bun dev
```

The app runs at `http://localhost:8080`.

---

## Project Structure

```
src/
├── App.tsx                        # Root component with routing
├── main.tsx                       # Entry point
├── index.css                      # Tailwind base + custom theme
│
├── components/
│   ├── AIAssistant.tsx            # Floating AI chatbot (TF-IDF powered)
│   ├── BookCard.tsx               # Universal book card component
│   ├── FilterChips.tsx            # Reusable filter chip component
│   ├── ImageOCR.tsx               # Tesseract.js OCR scanner
│   ├── Navbar.tsx                 # Auth-aware navigation + profile dropdown
│   ├── NavLink.tsx                # Animated nav link
│   ├── ProtectedRoute.tsx         # Auth guard HOC
│   └── ui/                        # shadcn/ui primitives
│
├── context/
│   └── AuthContext.tsx            # Supabase Auth provider + session mgmt
│
├── hooks/
│   ├── useBooks.ts                # Book data hook (Supabase + mock fallback)
│   └── useTransactions.ts         # Transaction management hook
│
├── lib/
│   ├── supabase.ts                # Supabase client + type definitions
│   ├── mockData.ts                # Fallback mock data
│   ├── utils.ts                   # Utility functions (cn, etc.)
│   ├── ai/
│   │   └── recommendation.ts     # AI engine: TF-IDF + Cosine Similarity + NLP
│   └── api/
│       ├── books.ts               # Book CRUD + image upload
│       └── transactions.ts        # Transaction operations + analytics
│
├── pages/
│   ├── Analytics.tsx              # Dashboard with Recharts
│   ├── Auth.tsx                   # Login/Signup with validation
│   ├── BookDetail.tsx             # Book view + transaction flow
│   ├── Index.tsx                  # Home with AI recommendations
│   ├── NotFound.tsx               # 404 page
│   ├── Profile.tsx                # User profile + edit + transaction tabs
│   ├── Search.tsx                 # Full-featured search with pagination
│   ├── SellerStudio.tsx           # Seller dashboard + add book modal
│   └── Transactions.tsx           # Transaction history + actions
│
└── test/
    ├── example.test.ts
    └── setup.ts

supabase/
├── config.toml
└── schema.sql                     # Complete DB schema with RLS + triggers
```

---

## Security

| Measure | Implementation |
|---------|---------------|
| **RLS Policies** | All tables protected by Row-Level Security |
| **JWT Auth** | Supabase handles token issuance and validation |
| **Session Persistence** | `autoRefreshToken: true`, `persistSession: true` |
| **Email Validation** | College domain restriction (`.edu`, `.ac.in`) |
| **Password Policy** | Min 6 chars, strength meter (weak/fair/good/strong) |
| **File Validation** | Image type whitelist, 5MB size limit |
| **Input Sanitization** | All user inputs trimmed; SQL injection prevented by Supabase SDK |
| **XSS Prevention** | React's built-in JSX escaping + no `dangerouslySetInnerHTML` |
| **Environment Variables** | API keys in `.env`, not committed to git |

---

## API Reference

### Books API (`src/lib/api/books.ts`)

| Function | Description |
|----------|-------------|
| `fetchBooks(filters)` | Paginated, filtered book list |
| `fetchBookById(id)` | Single book with seller data |
| `createBook(data)` | Create listing (auth required) |
| `updateBook(id, data)` | Update own listing |
| `deleteBook(id)` | Delete own listing |
| `incrementViews(id)` | Atomic view counter |
| `uploadBookImage(file, userId)` | Upload to Supabase Storage |

### Transactions API (`src/lib/api/transactions.ts`)

| Function | Description |
|----------|-------------|
| `createTransaction(bookId, buyerId, sellerId)` | Request a book |
| `acceptTransaction(txId)` | Seller accepts |
| `rejectTransaction(txId)` | Seller rejects |
| `cancelTransaction(txId)` | Buyer cancels |
| `completeTransaction(txId)` | Mark as done |
| `fetchUserTransactions(userId, role)` | Get user's transactions |
| `hasActiveRequest(bookId, buyerId)` | Check existing request |
| `fetchAnalytics()` | Platform-wide stats |

### AI Engine (`src/lib/ai/recommendation.ts`)

| Function | Description |
|----------|-------------|
| `detectIntent(query)` | Classify query into 8 intents |
| `getRecommendations(query, books, profile, topN)` | TF-IDF + Cosine Similarity search |
| `getColdStartRecommendations(books, topN)` | Fallback for new users |
| `getPersonalizedRecommendations(books, profile, topN)` | Profile-based ranking |
| `generateResponse(query, intent, results, entities)` | Format AI response text |

---

## License

MIT © ReBook Team
