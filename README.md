# 🎨 NFT Hub — Stellar NFT DApp

A full-stack decentralized application (DApp) for creating, managing, and trading NFTs on the **Stellar blockchain** using **Soroban smart contracts**.

---

## ✨ Features

- **🖼️ Mint NFTs** — Upload images and mint NFTs directly on the Stellar testnet via Soroban smart contracts.
- **🗂️ Collection Gallery** — Browse and manage your personal NFT collection.
- **🏪 Marketplace** — Discover, list, and buy NFTs from other creators.
- **📊 Dashboard** — View your portfolio stats, wallet balance, and recent activity.
- **🔨 Auctions** — Start 24-hour timed auctions and place bids on NFTs.
- **💰 Sales & Inventory** — Track your listed NFTs and view your current inventory.
- **👤 Profile** — View your public profile, follower stats, and owned assets.
- **🔔 Notifications** — Real-time in-app notifications powered by Firebase.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Framer Motion |
| **Styling** | Vanilla CSS + Inline styles |
| **Charts** | Recharts |
| **Blockchain** | Stellar (Testnet), Soroban Smart Contracts |
| **Wallets** | Freighter, Albedo, xBull |
| **Backend** | Node.js + Express |
| **Database** | Firebase Realtime Database |
| **Icons** | Lucide React |

---

## 📁 Project Structure

```
nft/
├── src/                    # Reorganized React frontend
│   ├── components/         # Reusable UI components (TopNav, Skeletons, WalletModal)
│   ├── context/            # Context API providers (Theme, WalletContext)
│   ├── pages/              # Lazy-loaded page components (Dashboard, Marketplace, Profile)
│   ├── services/           # External API & blockchain services (Firebase, Wallet Service)
│   └── utils/              # Helper functions & utilities (Soroban, RarityCalculator)
├── backend/                # Security-hardened MVC Node.js Backend
│   ├── config/             # Configuration registry loaded from environment variables
│   ├── controllers/        # Request handling and control logic layers
│   ├── middleware/         # Security and Express utilities (Rate limiter, Helmet, Error handler)
│   ├── routes/             # Aggregate Express API endpoints (with health status check)
│   ├── services/           # Background/External services (Pinata IPFS Pinning engine)
│   ├── validators/         # Input request validation guards
│   ├── utils/              # Utilities (Structured console Logger, AppError handlers)
│   ├── app.js              # Express app bootstrap instance
│   └── server.js           # Server listen & process uncaught exception boundaries
├── contract/               # Soroban Smart Contracts (Workspace)
│   ├── contracts/
│   │   ├── snft-token/     # SNFT Token contract
│   │   └── nft-marketplace/# Main NFT Marketplace contract
│   └── Cargo.toml          # Workspace configuration
├── .env.example            # Environment variable template
└── package.json

```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- A Stellar Testnet wallet (Freighter, Albedo, or xBull browser extension)
- A Firebase project (Realtime Database enabled)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd nft
```

---

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Stellar sponsor account secret key (for fee sponsorship)
REACT_APP_SPONSOR_SECRET=your_sponsor_secret_key
```

---

### 3. Run the Frontend

```bash
npm install
npm start
```

Runs on [http://localhost:3001](http://localhost:3001)

---

### 4. Run the Backend

```bash
cd backend
npm install
npm start
```

Runs on [http://localhost:5000](http://localhost:5000)

The backend handles image uploads and acts as an intermediary API server.

---

## 🔗 Smart Contracts

| Contract | ID |
|---|---|
| **NFT Contract** | `CBFGZCD2HZK35OAP7MCX3JEEHKGQLUSEOG3SPPCU43PTWEIOGFKEEPVC` |
| **Escrow Contract** | `CBNGQSH743IQE7JMT3YFPC4J4LNO4B73HHP2NAHDGIPD3TVL6WI7A2S3` |
| **Native XLM SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

All contracts are deployed on **Stellar Testnet**.

- **RPC URL**: `https://soroban-testnet.stellar.org`
- **Horizon URL**: `https://horizon-testnet.stellar.org`

Contract source code is located in the `contract/` directory.

---

## 👛 Supported Wallets

| Wallet | Platform |
|---|---|
| [Freighter](https://www.freighter.app/) | Browser Extension |
| [Albedo](https://albedo.link/) | Web-based |
| [xBull](https://xbull.app/) | Browser Extension |

---

## 🔧 Available Scripts

In the `nft/` directory:

| Command | Description |
|---|---|
| `npm start` | Start the development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and demonstration purposes on the Stellar Testnet.
