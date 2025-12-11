# SeedUp Backend - README

## Project Title & Description

### **SeedUp Backend** 📈

A comprehensive investment portfolio management and AI-powered analytics backend service. SeedUp enables users to create and manage investment portfolios, track transactions, analyze market indices, and leverage AI-driven insights to optimize investment decisions. Built with Express.js and integrated with Firebase authentication, MongoDB persistence, and Google Generative AI capabilities.

---

## Key Features

- **👤 User Management & Authentication**

  - Firebase Authentication integration for secure user registration and login
  - User profile management with email and nickname support

- **💼 Portfolio Management**

  - Create and manage multiple investment portfolios
  - Track portfolio performance with base currency support
  - AI-powered portfolio analysis and summarization

- **📊 Asset & Transaction Tracking**

  - Browse and search investment assets (stocks, cryptocurrencies, etc.)
  - Record buy/sell transactions with detailed tracking
  - Real-time transaction history and analysis

- **📈 Market Analytics & Insights**

  - Real-time market index data via Yahoo Finance integration
  - Historical price charts and trend analysis
  - Correlation analysis across multiple assets
  - Portfolio performance metrics and analytics

- **🤖 AI-Powered Features**

  - Google Generative AI integration for intelligent portfolio analysis
  - Automated portfolio summaries and insights
  - Smart recommendations based on portfolio composition

- **💬 Community & Social Features**

  - Create and share investment posts
  - Comment on community posts
  - Watchlist functionality for tracking interesting assets and posts
  - Real-time notifications system

- **📚 API Documentation**
  - Swagger/OpenAPI integration for interactive API documentation
  - Auto-generated API specs at `/api-docs`

---

## Tech Stack

### **Runtime & Language**

- **Node.js** (with TypeScript)
- **TypeScript** (v5.9.3) - Type-safe JavaScript

### **Core Framework & Server**

- **Express.js** (v5.1.0) - Web application framework
- **CORS** (v2.8.5) - Cross-Origin Resource Sharing middleware

### **Database**

- **MongoDB** - NoSQL database via MongoDB Atlas
- **Mongoose** (v8.19.2) - MongoDB object modeling for Node.js

### **Authentication & Security**

- **Firebase Admin SDK** (v13.5.0) - Authentication and user management
- **dotenv** (v17.2.3) - Environment variable management

### **External APIs & Services**

- **Yahoo Finance 2** (v3.10.2) - Real-time and historical market data
- **Google Generative AI** (v0.24.1) - AI-powered analysis and insights
- **Google GenAI** (v1.30.0) - Additional AI capabilities

### **API Documentation**

- **Swagger JSDoc** (v6.2.8) - API documentation generator
- **Swagger UI Express** (v5.0.1) - Interactive API documentation UI

### **Development Tools**

- **ts-node** (v10.9.2) - TypeScript execution for Node.js
- **tsx** (v4.20.6) - Fast TypeScript execution
- **Nodemon** (v3.1.10) - Auto-restart development server on file changes
- **TypeScript** (v5.9.3) - TypeScript compiler

---

## Prerequisites

Before running the SeedUp backend, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **MongoDB Atlas Account**: Free tier available at [mongodb.com](https://www.mongodb.com)
- **Firebase Project**: Set up at [console.firebase.google.com](https://console.firebase.google.com)
- **Google Cloud API Key**: For Google Generative AI access

### **Environment Setup**

You'll need the following environment variables configured in a .env file:

- MongoDB connection URI
- Firebase project credentials (Project ID, Client Email, Private Key)
- Google Generative AI API key

---

## Installation & Running

### **1. Clone the Repository**

```powershell
git clone https://git.ajou.ac.kr/seedup/seedup-be.git
cd seedup-be
```

### **2. Install Dependencies**

```powershell
npm install
```

### **3. Configure Environment Variables**

Create a .env file in the root directory with the following variables:

```env
# MongoDB Connection
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Generative AI
GEMINI_AI_API=your_gemini_api_key
```

### **4. Development Mode**

Start the development server with hot-reload enabled:

```powershell
npm run dev
```

The server will run on `http://localhost:8080`

### **5. Build for Production**

Compile TypeScript to JavaScript:

```powershell
npm run build
```

### **6. Start Production Server**

Run the compiled application:

```powershell
npm start
```

---

## Usage

### **API Base URL**

```
http://localhost:8080/api
```

### **API Documentation**

Once the server is running, access the interactive API documentation:

```
http://localhost:8080/api-docs
```

### **Core Features Usage Examples**

#### **1. User Management**

- **Register/Login**: Authenticate via Firebase authentication
- **User Profile**: View and update user information
- **Endpoint**: `/api/users`

#### **2. Portfolio Management**

- **Create Portfolio**: `POST /api/portfolios`
  ```json
  {
    "name": "My Investment Portfolio",
    "baseCurrency": "KRW"
  }
  ```
- **Get Portfolios**: `GET /api/portfolios`
- **Get AI Analysis**: AI-powered portfolio summaries included in portfolio details

#### **3. Asset & Market Data**

- **Search Assets**: `GET /api/assets?symbol=AAPL`
- **Get Market Indices**: `GET /api/market-index`
- **Historical Data**: Real-time and historical price data via Yahoo Finance

#### **4. Transaction Tracking**

- **Record Transaction**: `POST /api/transactions`
  ```json
  {
    "portfolio": "portfolio_id",
    "asset": "asset_id",
    "transactionType": "BUY",
    "quantity": 10,
    "price": 150.0,
    "transactionDate": "2025-12-08"
  }
  ```
- **View History**: `GET /api/transactions`

#### **5. AI-Powered Analytics**

- **Get Portfolio Analysis**: `POST /api/ai/analyze`
  - Receives AI-generated insights about portfolio composition
  - Recommendations based on market trends

#### **6. Community Features**

- **Create Post**: `POST /api/posts`
- **Add Comment**: `POST /api/posts/:id/comments`
- **Get Feed**: `GET /api/posts`
- **Watchlist**: Save interesting assets and posts for later review

#### **7. Analytics Dashboard**

- **Portfolio Metrics**: `GET /api/analytics/portfolio/:id`
  - Performance metrics
  - Correlation analysis
  - Risk assessment

---

## Project Structure

```
seedup-be/
├── src/
│   ├── server.ts              # Express app initialization
│   ├── config/                # Configuration files
│   │   ├── db.ts             # MongoDB connection
│   │   ├── firebaseAdmin.ts  # Firebase setup
│   │   ├── swagger.ts        # API documentation
│   │   └── yahooFinance.ts   # Market data client
│   ├── controllers/           # Route handlers
│   │   ├── userController.ts
│   │   ├── portfolioController.ts
│   │   ├── transactionController.ts
│   │   ├── assetController.ts
│   │   ├── aiController.ts
│   │   ├── analyticsController.ts
│   │   ├── postController.ts
│   │   ├── commentController.ts
│   │   └── marketIndexController.ts
│   ├── models/                # Database schemas
│   │   ├── User.ts
│   │   ├── Portfolio.ts
│   │   ├── Asset.ts
│   │   ├── Transaction.ts
│   │   ├── Post.ts
│   │   ├── Comment.ts
│   │   ├── Notification.ts
│   │   └── Watchlist.ts
│   ├── routes/                # API routes
│   │   ├── userRoutes.ts
│   │   ├── portfolioRoutes.ts
│   │   ├── transactionRoutes.ts
│   │   ├── assetRoutes.ts
│   │   ├── aiRoutes.ts
│   │   ├── analyticsRoutes.ts
│   │   ├── postRoutes.ts
│   │   └── marketIndexRoutes.ts
│   ├── services/              # Business logic
│   │   └── aiService.ts       # AI analysis service
│   └── middleware/            # Custom middleware
│       └── authMiddleware.ts  # Firebase auth verification
├── package.json
├── tsconfig.json
├── .env                       # Environment variables (not in repo)
└── README.md
```

---

## Additional Notes

- **Swagger Documentation**: Comprehensive API documentation is auto-generated and available at the `/api-docs` endpoint
- **Firebase Integration**: Secure authentication is handled through Firebase Admin SDK
- **Real-time Market Data**: Market indices and asset prices are fetched from Yahoo Finance API
- **AI Analysis**: Google Generative AI provides intelligent portfolio insights and recommendations
- **CORS Enabled**: Backend accepts requests from all origins (configure for production)

---

## Support & Contributing

For issues, feature requests, or contributions, please refer to the project repository at:

```
https://git.ajou.ac.kr/seedup/seedup-be
```

---

**SeedUp Backend** - Empower your investment decisions with AI-driven analytics ✨
