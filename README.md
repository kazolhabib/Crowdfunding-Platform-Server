# FundFlow Server - Crowdfunding Platform API

FundFlow Server is the Express and MongoDB-based companion API server that powers FundFlow, a role-based crowdfunding platform. It handles database operations, Stripe checkout sessions, withdrawal requests, in-app notifications, and supporter contributions.

## Technical Stack
* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js (v5)
* **Database & Modeling:** MongoDB & Mongoose
* **Security & Tokens:** JSON Web Tokens (jsonwebtoken), bcryptjs
* **Payments Integration:** Stripe API

## Environment Setup
Create a `.env` file in the root of the server directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_db
JWT_SECRET=fundflow-super-secret-key-change-me-in-production
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Demo Credentials (Seeded)
Use the following accounts to test role-based access:
* **Administrator:** `admin@demo.com` / `password123`
* **Supporter:** `supporter@demo.com` / `password123`
* **Creator:** `creator@demo.com` / `password123`

## Key Architecture & Features

### 1. Database Schema Models (`/models`)
* **User:** Holds profile details, hashed passwords, roles (`Admin`/`Creator`/`Supporter`), and available credits.
* **Campaign:** Manages title, description, category, deadline, funding goals, and total raised credits.
* **Contribution:** Track supporter pledges, amount, and approval status (`pending`/`approved`/`rejected`).
* **Withdrawal:** Handles Creator payouts (converted at 20 credits = $1 USD).
* **Notification:** Stores in-app alerts displayed dynamically to logged-in users.
* **Report:** Tracks suspicious campaign reports submitted by supporters.

### 2. Authorization Middlewares (`/middleware`)
* `authMiddleware`: Verifies and extracts JWT payload from standard Authorization headers.
* `supporterOnly`: Restricts endpoints (like credit purchases) to supporters.
* `creatorOnly`: Restricts endpoints (like withdrawal requests) to creators.

### 3. API Routes Endpoints (`/routes`)
* `/api/auth`: Handles mock demo authentication.
* `/api/campaigns`: Manages top funded and active explore campaigns.
* `/api/creator`: Handles creator withdrawals and contribution approval reviews.
* `/api/supporter`: Manages supporter contributions logs.
* `/api/payments`: Initiates Stripe Checkout sessions, handles verification fallbacks, logs payment histories, and processes Stripe Webhooks.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in the required MongoDB URIs and Stripe credentials.

3. **Start the API Server:**
   ```bash
   npm run dev
   ```
   The server will start listening on port `5000` (default) with automatic hot-reloads on file changes.

4. **Stripe Webhook forwarding (optional for local testing):**
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
