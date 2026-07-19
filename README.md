# FundFlow Server — Crowdfunding Platform API ⚙️

[![Node.js](https://img.shields.io/badge/Node.js-v20.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-Modeling-red?style=for-the-badge)](https://mongoosejs.com/)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render)](https://render.com/)

**FundFlow Server** is the companion API server that powers the FundFlow Crowdfunding Platform. It handles MongoDB database modeling, security tokens, user authentication, role-based middleware routing, Stripe payment sessions, webhook event processing, and administrative payout workflows.

---

## 📝 Project Submission Details

* **Website Name:** FundFlow
* **Backend Live Server Link:** [https://crowdfunding-platform-server.onrender.com](https://crowdfunding-platform-server.onrender.com)
* **Client-Side GitHub Repository:** [https://github.com/kazolhabib/Crowdfunding-Platform](https://github.com/kazolhabib/Crowdfunding-Platform)
* **Server-Side GitHub Repository:** [https://github.com/kazolhabib/Crowdfunding-Platform-Server](https://github.com/kazolhabib/Crowdfunding-Platform-Server)

---

## 🛠️ Technology Stack

* **Runtime Environment:** Node.js
* **Backend Framework:** Express.js (v5)
* **Database & modeling:** MongoDB & Mongoose ORM
* **Security & Authentication:** JSON Web Tokens (JWT) & bcryptjs
* **Payments Integration:** Stripe SDK (Checkout Sessions, Webhook Verification)

---

## 🗃️ Database Schema Models (`/models`)

* **User (`User.js`):** Manages user registration records, role assignments (`Admin`/`Creator`/`Supporter`), available credits, and hashed password states.
* **Campaign (`Campaign.js`):** Stores title, category, target funding credits, deadline, status (`pending`/`approved`/`rejected`), and total raised amount.
* **Contribution (`Contribution.js`):** Logs supporter backing amounts, transaction states, and references back to campaigns and creators.
* **Withdrawal (`Withdrawal.js`):** Track creator payout requests (calculating payouts at a rate of 20 credits = $1 USD).
* **Notification (`Notification.js`):** Handles floating real-time user notification logs.
* **Report (`Report.js`):** Stores flagged campaigns submitted by supporters for administrative investigations.

---

## 🛡️ Middleware Routings (`/middleware`)

* `authMiddleware`: Parses authorization headers and validates JWT payloads to attach authenticated user entities.
* `supporterOnly`: Gates endpoints to restrict supporter actions (such as initiating Stripe checkout sessions).
* `creatorOnly`: Restricts access to creator routes (such as requesting USD withdrawals).
* `adminOnly`: Secures sensitive routes (like user management and report resolutions) for administrative credentials.

---

## ⚙️ Environment Configurations

Create a `.env` file in the root directory:
```env
PORT=5001
MONGODB_URI=your_mongodb_cluster_connection_string
JWT_SECRET=your_jwt_token_signing_secret
FRONTEND_URL=https://crowdfunding-platform-pha.netlify.app
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
git clone https://github.com/kazolhabib/Crowdfunding-Platform-Server.git
cd Crowdfunding-Platform-Server
npm install
```

### 2. Run the Server
Start the API backend with hot reloading:
```bash
npm run dev
```
The server defaults to port `5001` (based on environment config) and logs connection status to MongoDB.

### 3. Stripe Webhook Testing (Local Development)
To forward Stripe events to the local webhook endpoint:
```bash
stripe listen --forward-to localhost:5001/api/payments/webhook
```
Copy the webhook signing secret (`whsec_...`) printed in the terminal, add it to your `.env` configuration, and restart the server.
