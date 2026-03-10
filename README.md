# 📚 RE-BOOK

### Smart Campus Book Exchange Platform

RE-BOOK is a **campus-based book exchange platform** that allows students to **buy, sell, and exchange academic books within their college community**. The platform integrates **AI-powered search, chatbot recommendations, transaction tracking, reviews, and in-app messaging** to create a complete peer-to-peer academic marketplace.

---

# 🚀 Project Overview

Students often purchase textbooks that become unused after a semester. RE-BOOK solves this problem by creating a **smart campus marketplace** where students can:

* Sell used books
* Discover affordable books
* Chat with buyers/sellers
* Track transactions
* Receive AI-based recommendations
* Leave reviews and feedback

The system combines **modern web technologies with AI recommendation algorithms** to provide an intelligent book discovery experience.

---

# 🎯 Key Features

## 🤖 AI Chatbot & Smart Recommendation

* AI-powered chatbot assists users in finding books
* Natural language search queries
* Personalized book recommendations
* Genre and subject-based suggestions
* Recommendation algorithm based on:

  * TF-IDF vectorization
  * Cosine similarity
  * User preference profiling
  * Popularity ranking

Example queries:

```
Suggest AI books
Cheap data science books
Books for semester 4
Popular networking books
```

---

# 🔍 Advanced AI Search

The system supports **semantic search and intelligent filtering**.

Search features:

* Natural language search
* Genre detection
* Department filtering
* Semester filtering
* Price filtering
* Smart ranking of results

Search ranking factors:

* Content similarity
* User taste profile
* Book popularity
* User activity history

---

# 📦 Transaction & Order Tracking System

RE-BOOK includes a complete **transaction lifecycle management system**.

### Order Status Flow

```
Requested → Accepted → Book Given → Received → Completed
```

Transaction features:

* Book request system
* Seller approval
* Order tracking
* Buyer confirmation (Received button)
* Transaction history dashboard

Example workflow:

1. Buyer requests book
2. Seller accepts request
3. Seller hands over book
4. Buyer confirms receipt
5. Transaction completed

---

# ⭐ Review & Feedback System

After a transaction is completed, both users can leave feedback.

### Review capabilities

* Buyer reviews seller
* Seller reviews buyer
* Rating system (1–5 stars)
* Comment feedback
* Average rating displayed on profiles

Example:

```
⭐ Seller Rating: 4.6
Based on 23 reviews
```

This builds **trust within the marketplace**.

---

# 💬 Buyer–Seller In-App Chat

Users can communicate directly through the platform.

Chat features:

* Real-time messaging
* Transaction-specific conversations
* Message timestamps
* Chat UI with message bubbles
* Secure communication between buyer and seller

Example chat:

```
Buyer: Is the book still available?
Seller: Yes, you can collect it tomorrow.
Buyer: Okay, thanks!
```

---

# 📊 Analytics Dashboard

The system includes an analytics page that visualizes platform activity.

Analytics features:

* Total books listed
* Average book price
* Department distribution
* Monthly listing trends
* Transaction completion rate

Charts built using **Recharts**.

---

# 📷 OCR Book Search

Users can upload an image containing text, and the system extracts book information using **OCR technology**.

Technologies used:

* Tesseract.js
* Image text recognition
* Search suggestions from extracted text

---

# 🧑‍🎓 User Roles

### Buyer

* Search books
* Request books
* Chat with seller
* Track transactions
* Mark book as received
* Leave reviews

### Seller

* List books
* Manage listings
* Accept or reject requests
* Chat with buyers
* Track completed transactions

---

# 🏗️ System Architecture

```
Frontend (React + TypeScript)
        │
        │
        ├── AI Recommendation Engine
        ├── Chatbot Interface
        ├── Transaction Tracking
        ├── Reviews & Ratings
        └── Chat System
        │
Backend API (Node / PostgreSQL)
        │
PostgreSQL Database
```

---

# 🧠 AI Recommendation Engine

The recommendation system uses a **hybrid algorithm** combining:

### 1. Content-Based Filtering

Analyzes book metadata such as:

* Title
* Author
* Description
* Genre
* Department
* Semester

Uses:

```
TF-IDF Vectorization
Cosine Similarity
```

---

### 2. User Preference Modeling

User taste is inferred from:

* Search history
* Book views
* Favorites
* Purchases

This generates a **user interest profile** used for recommendations.

---

### 3. Popularity Ranking

Books are also ranked based on:

* Views
* Transactions
* Ratings

Final score formula:

```
score =
(0.5 × query_similarity)
+
(0.3 × user_preference_similarity)
+
(0.2 × popularity_score)
```

---

# 🗄️ Database Schema

Main tables:

```
users
books
transactions
favorites
reviews
messages
user_activity
notifications
```

---

### Books Table

Stores book listings.

Fields include:

* title
* author
* department
* semester
* price
* condition
* status

---

### Transactions Table

Manages book exchange lifecycle.

Key fields:

* buyer_id
* seller_id
* order_status
* created_at

---

### Reviews Table

Stores feedback between users.

Fields:

* reviewer_id
* rating
* comment

---

### Messages Table

Handles buyer–seller chat.

Fields:

* sender_id
* receiver_id
* message
* timestamp

---

# 🖥️ Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* React Router
* Recharts

### Backend

* Node.js
* Express.js
* PostgreSQL

### AI & Data Processing

* TF-IDF Vectorization
* Cosine Similarity
* Rule-based NLP
* Tesseract.js OCR

---

# 📂 Project Structure

```
RE-BOOK
│
├── frontend
│   ├── components
│   ├── pages
│   ├── hooks
│   ├── lib
│   └── contexts
│
├── backend
│   ├── routes
│   ├── middleware
│   └── server.js
│
├── database
│   └── schema.sql
│
└── README.md
```

---

# ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```
git clone https://github.com/your-username/re-book.git
cd re-book
```

---

### 2️⃣ Install Dependencies

Frontend:

```
npm install
```

Backend:

```
cd backend
npm install
```

---

### 3️⃣ Run Application

Start backend:

```
node server.js
```

Start frontend:

```
npm run dev
```

---

# 🌐 Application Pages

* Home Dashboard
* Search Books
* Book Detail
* Seller Studio
* Transactions Page
* Analytics Dashboard
* User Profile
* AI Chatbot Assistant

---

# 🔐 Security Features

* Authentication system
* Protected routes
* Input validation
* Secure transaction handling
* Role-based access

---

# 📈 Future Enhancements

Potential improvements:

* Real-time notifications
* AI collaborative filtering
* Book recommendation using embeddings
* Mobile app version
* Payment integration
* Blockchain transaction verification

---

# 👨‍💻 Authors

Developed as a **Final Year Project** for the **AI & Data Science program**.

---

# 📜 License

This project is developed for **academic and research purposes**.
