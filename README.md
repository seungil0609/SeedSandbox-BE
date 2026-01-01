# SeedSandbox Server

"The Safest Laboratory to Start Investing" — Backend API

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)
- [Data Normalization & Analytics Logic](#data-normalization--analytics-logic)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Run Locally](#run-locally)
- [Frontend Repository](#frontend-repository)
- [Contributing](#contributing)
- [License & Contact](#license--contact)
- [Acknowledgements](#acknowledgements)

---

## Overview

**SeedSandbox Server** is the robust RESTful API powering the SeedSandbox investment simulation platform. Beyond simple data storage, it serves as an **Intelligent Financial Engine** that processes raw market data into actionable insights.

The server acts as a **Smart Proxy & Aggregator**, bridging external services (Yahoo Finance, Google Gemini) with user portfolios. It ensures reliability through **Data Normalization**, handles dynamic **Currency Conversion** (USD/KRW), and computes professional-grade **Risk Metrics** (Volatility, Sharpe Ratio, Beta, MDD) in real-time.

---

## System Architecture

The SeedSandbox architecture is designed for **security, scalability, and high availability**, leveraging cloud-native services.

![System Architecture](./assets/system_architecture.png)

### Architecture Highlights

1.  **Secure Client-Server Communication:**

    - **Frontend (Vercel):** The React application is deployed on Vercel's edge network, communicating with the backend via **RESTful APIs** over JSON.
    - **Backend (AWS EC2):** The Node.js/Express server is hosted on an **AWS EC2** instance, handling business logic and API requests.
    - **Stateless Authentication:** User identity is managed via **Firebase Auth**. The Client SDK handles login, while the backend uses the **Firebase Admin SDK** to verify ID tokens in middleware, ensuring stateless and secure access.

2.  **External Service Aggregation:**

    - **Market Data Pipeline:** The server acts as a proxy, fetching and normalizing real-time quotes and historical data from **Yahoo Finance** (`yahoo-finance2`) before delivering them to the client.
    - **AI Intelligence Layer:** Portfolio updates trigger an event that sends summarized data to **Google Gemini 2.5 Flash**. The AI generates diagnostic reports, which are processed and stored asynchronously.

3.  **Data Persistence & Modeling:**
    - **MongoDB Atlas:** A fully managed cloud database stores complex financial data structures.
    - **Mongoose ODM:** utilized to enforce strict **Schema Validation** and manage relationships between Users, Portfolios, and Transactions, bridging the gap between the application layer and the database.

---

## Database Schema

The database is structured around three core domains: **User Identity**, **Investment Data**, and **Community Interaction**. We use Mongoose references (`ObjectId`) to maintain relationships while keeping collections flexible.

![Database Schema](./assets/db_schema.png)

### Core Collections & Design Decisions

- **Users:** The root entity linking **Firebase UID** with internal app data. It serves as the parent for both `Portfolios` and `Posts`, centralizing user activity.
- **Portfolios:** Stores investment contexts. It manages configuration (e.g., Base Currency: USD/KRW) and caches the expensive **AI Diagnosis results** to reduce API costs and latency.
- **Transactions:** The source of truth for portfolio state. Instead of storing a mutable "current quantity" in the Portfolio, we record immutable Buy/Sell events. This allows for **historical replay** and precise PnL calculation based on FIFO/Average Cost methods.
- **Assets:** A shared reference collection for financial instruments. It decouples market data (Ticker, Name, Sector) from user portfolios. Notably, it stores **ETF Sector Weights** as a Map to enable deep-dive risk analysis beyond simple categorization.
- **Posts & Comments:** Implements a community board structure. The `Comments` collection uses a **self-referencing** `parentComment` field to support infinite nested replies (threads) efficiently.

---

## API Reference

API Documentation is available via **Swagger UI** at `http://localhost:8080/api-docs` when the server is running.

### Auth & Users

User authentication and profile management.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/users/register` | Register a new user with Firebase UID |
| `GET` | `/api/users/profile` | Get current user profile information |
| `DELETE` | `/api/users/profile` | Delete user account |
| `POST` | `/api/users/logout` | Logout (Revoke refresh tokens) |

### Portfolio & Trading

Core investment management: Portfolios, Transactions, and Simulations.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/portfolios` | List all portfolios |
| `POST` | `/api/portfolios` | Create a new portfolio |
| `GET` | `/api/portfolios/:id` | Get portfolio details |
| `PUT` | `/api/portfolios/:id` | Update portfolio settings |
| `DELETE` | `/api/portfolios/:id` | Delete portfolio |
| `GET` | `/api/portfolios/:id/summary` | Get dashboard summary (Valuation, PnL) |
| `GET` | `/api/portfolios/:id/chart` | Get portfolio time-series chart data |
| `POST` | `/api/portfolios/simulations/what-if` | Run "What-If" buy simulation |
| `GET` | `/api/portfolios/:id/transactions` | List all transactions in a portfolio |
| `POST` | `/api/portfolios/:id/transactions` | Add a new transaction (Buy/Sell) |
| `PUT` | `/api/transactions/:transactionId` | Update a transaction |
| `DELETE` | `/api/transactions/:transactionId` | Delete a transaction |

### Analysis & Insights

AI diagnosis and quantitative risk metrics.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ai/summary/:portfolioId` | Get AI-generated portfolio diagnosis (Gemini) |
| `GET` | `/api/analytics/risk/:id` | Get Risk Metrics (Volatility, Sharpe, Beta, MDD) |
| `GET` | `/api/portfolios/:id/assets/:assetTicker` | Analyze specific asset performance within portfolio |

### Market Data

External financial data aggregation and Watchlist.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/assets/search` | Search assets by keyword |
| `GET` | `/api/assets/details/:ticker` | Get asset details (Chart, Fundamentals, News) |
| `GET` | `/api/market-index/:index` | Get market index series (`sp500`, `nasdaq`, `kospi`, etc.) |
| `GET` | `/api/watchlist` | Get watchlist with real-time quotes |
| `POST` | `/api/watchlist` | Add item to watchlist |
| `DELETE` | `/api/watchlist/:watchlistId` | Remove item from watchlist |

### Community

Discussion boards and interactions.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/posts` | List all posts |
| `POST` | `/api/posts` | Create a new post |
| `GET` | `/api/posts/:id` | Get post details |
| `PUT` | `/api/posts/:id` | Update a post |
| `DELETE` | `/api/posts/:id` | Delete a post |
| `GET` | `/api/posts/:id/comments` | List comments for a post |
| `POST` | `/api/posts/:id/comments` | Add a comment |
| `PUT` | `/api/posts/:postId/comments/:commentId` | Update a comment |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | Delete a comment |

---

## Tech Stack

### Runtime & Framework

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

### Database & ODM

![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose-880000.svg?style=for-the-badge&logo=mongoose&logoColor=white)

### Data & AI

![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white) ![Yahoo](https://img.shields.io/badge/Yahoo%20Finance-6001D2?style=for-the-badge&logo=yahoo&logoColor=white)

### Infrastructure & Auth

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black) ![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white) ![Swagger](https://img.shields.io/badge/-Swagger-%23Clojure?style=for-the-badge&logo=swagger&logoColor=white)

### Tooling

![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)

<br/>

**Details:**

- **Runtime:** `Node.js`, `TypeScript`
- **Framework:** `Express.js`
- **Database:** `MongoDB Atlas`, `Mongoose ODM`
- **Data & AI:** `yahoo-finance2`, `Gemini-2.5-Flash`
- **Authentication:** `Firebase Admin SDK`
- **Infrastructure:** `AWS EC2`
- **Documentation:** `Swagger UI`

---

## Data Normalization & Analytics Logic

The server goes beyond simple data fetching by applying financial engineering principles to provide professional-grade insights.

### 1. Advanced Risk Analytics (`/api/analytics/risk`)

We calculate key quantitative metrics using **1-year historical daily data** (252 trading days) to help users understand the "quality" of their returns.

- **Volatility (Annualized Standard Deviation):**
  - Measures how violently the portfolio's value fluctuates.
  - _Logic:_ $\sigma_p \times \sqrt{252}$ (Annualizes the daily standard deviation).
- **Max Drawdown (MDD):**
  - Represents the "worst-case scenario" — the maximum observed loss from a peak to a trough.
  - _Logic:_ $\min(\frac{Price_t - Peak_t}{Peak_t})$ over the selected period.
- **Sharpe Ratio:**
  - Measures risk-adjusted return. "Is the return worth the risk?"
  - _Logic:_ $\frac{R_p - R_f}{\sigma_p}$
  - _Note:_ Uses a risk-free rate ($R_f$) of **4.14%** (based on recent US Treasury yields).
- **Beta ($\beta$):**
  - Measures sensitivity relative to the market (S&P 500).
  - _Logic:_ $Covariance(R_p, R_m) / Variance(R_m)$.
  - _Meaning:_ $\beta > 1$ implies higher volatility than the market; $\beta < 1$ implies lower.
- **Correlation Matrix (Heatmap):**
  - Calculates the Pearson correlation coefficient between every pair of assets in the portfolio.
  - _Purpose:_ Helps users identify diversification opportunities (e.g., finding assets that move inversely to each other).

### 2. Time-Series Normalization & Charting

To visualize a user's portfolio alongside market indices (e.g., S&P 500) on a single chart, we perform **Multi-Layer Normalization**.

#### A. Currency Standardization (FX Rate Application)

Since a portfolio may contain both **KRW (Samsung Electronics)** and **USD (Apple)** assets:

- The server fetches real-time exchange rates (`KRW=X`).
- Assets are dynamically converted to the user's **Base Currency** (e.g., converting Apple's price to KRW) before aggregation.

#### B. Date Alignment & Zero-Filling

Financial data often has gaps due to holidays or differing market hours.

- **Intersection Logic:** The server identifies common trading dates between all assets and the benchmark.
- **Forward-Filling:** If data is missing for a specific date (e.g., a holiday in Korea but not in the US), the previous closing price is carried forward to maintain continuity.

#### C. Performance Rebasing (Percentage Yield)

Instead of plotting raw prices (e.g., Index at 5,000 vs. Portfolio at $100), we normalize all data points to **Percentage Return (%)**:

- _Formula:_ $\frac{Price_t - Price_{start}}{Price_{start}} \times 100$
- **Result:** Both the Market Index and User Portfolio start at **0%** on the X-axis, allowing for a direct, "apple-to-apple" performance comparison over time.

---

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** >= 18.0.0
- **npm** or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone [https://github.com/ksi010609/SeedSandbox-BE.git](https://github.com/ksi010609/SeedSandbox-BE.git)

# 2. Navigate to the project directory
cd SeedSandbox-BE

# 3. Install dependencies
npm install
# or
yarn install
```

### Environment Setup

Create a `.env` file in the root directory of the backend project.

> **Note:** This file contains sensitive keys and should **not** be committed to version control (Git).

Copy the following template and fill in your specific configuration values:

```bash
# Server Configuration
NODE_ENV=development
PORT=8080

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/seedsandbox

# Firebase Admin SDK
# Note: The code automatically handles \n replacements for private keys.
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# AI Service (Google Gemini)
GEMINI_AI_API=your_gemini_api_key
```

---

### Run Locally

Start the development server:

```bash
# Development mode (using tsx & nodemon)
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (usually http://localhost:8080).

### Build for Production

To build and start the server for production deployment:

```bash
# 1. Compile TypeScript to JavaScript (dist folder)
npm run build

# 2. Start the production server
npm start
```

---

## Frontend Repository

This API serves as the foundation for a responsive **React-based User Interface**. The frontend handles interactive data visualization, state management, and user authentication flows.

> **Note:** For details on **UI/UX Design**, **Client-Side State Management (Jotai)**, and **Chart Visualization (Nivo)**, please visit the frontend repository.

**Repository Link:** [https://github.com/ksi010609/SeedSandbox-FE](https://github.com/ksi010609/SeedSandbox-FE)

---

## Contributing

While this is primarily a personal portfolio project, I am open to code reviews and feedback to improve code quality.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License & Contact

- **License:** Distributed under the MIT License. See `LICENSE` for more information.
- **Contact:**
  - **Email:** ksi010609@gmail.com
  - **GitHub:** [https://github.com/ksi010609](https://github.com/ksi010609)

---

## Acknowledgements

Special thanks to the open-source community for the tools that made this project possible.

- **Core Framework:** [Express.js](https://expressjs.com/)
- **Database ODM:** [Mongoose](https://mongoosejs.com/)
- **Financial Data:** [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2)
- **AI Model:** [Google Gemini API](https://ai.google.dev/)
- **Authentication:** [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- **API Documentation:** [Swagger](https://swagger.io/)
