# RE-BOOK Backend (sample)

This is a small demo backend for the RE-BOOK frontend. It provides static REST endpoints that return sample data shaped like the frontend `mockData`.

Quick start

1. Open a terminal in `backend`.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

By default the server runs on `http://localhost:4000`.

Available endpoints

- `GET /api/health` — health check
- `GET /api/books` — list books
   - Query params supported: `department`, `semester`, `condition`, `q` (search), `limit`
- `GET /api/books/:id` — single book
- `GET /api/transactions` — sample transactions
- `GET /api/seller-stats` — seller stats
- `POST /api/request/:id` — simulate sending a request for a book

Integration notes

- The frontend can fetch data from `http://localhost:4000/api/books` and map results directly into the same UI components used for `mockBooks`.
- For development, run this server locally and update the frontend fetch calls (or set a proxy) to point to `http://localhost:4000`.

This is intentionally minimal and file-backed JSON. For production, replace the JSON files with a proper database and add authentication.
