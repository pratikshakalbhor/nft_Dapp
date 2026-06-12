import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import * as StellarSdk from "@stellar/stellar-sdk";
import TopNav from "./components/TopNav";
import { HORIZON_URL } from "./constants";
import Background from "./components/Background";
import { fetchNFTs } from "./utils/soroban";
import MintPage from "./pages/MintPage";
import GalleryPage from "./pages/GalleryPage";
import MarketplacePage from "./pages/MarketplacePage";
import { useWallet } from "./WalletContext";
import WalletModal from "./WalletModal";
import ProfilePage from "./components/ProfilePage";
import { errorHandler } from "./utils/errorHandler";
import DashboardPage from "./pages/DashboardPage";
import NFTDetailPage from "./pages/NFTDetailPage";
import ChatPage from "./pages/ChatPage";

import { useTheme } from "./context/ThemeContext";

function App() {
  const location = useLocation();
  const { 
    walletAddress, 
    isModalOpen, 
    setModalOpen, 
    disconnectWallet, 
    setWalletAddress, 
    setWalletType, 
    setConnectedWallets 
  } = useWallet();
  const { isDark } = useTheme();
  const [nfts, setNfts] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);

  const server = useMemo(
    () => new StellarSdk.Horizon.Server(HORIZON_URL),
    []
  );

  function showError(message, field) {
    alert(message);
  }

  useEffect(() => {
    const fetchData = async () => {
      if (walletAddress) {
        try {
          const account = await server.loadAccount(walletAddress);

          setAccountDetails(account);
        } catch (e) {
          setAccountDetails(null);
          const errorMessage = errorHandler(e);

          showError(
            `Error loading account (${walletAddress}): ${errorMessage}.`,
            "accountError"
          );

          console.error("Account error:", e);
        }

        try {
          console.log("Fetching NFTs for", walletAddress);
          const userNfts = await fetchNFTs(walletAddress);
          console.log("Fetched NFTs:", userNfts);
          setNfts(userNfts);
        } catch (e) {
          console.error("Failed to fetch NFTs:", e);
          setNfts([]);
        }
      }
    };
    fetchData();
  }, [walletAddress, server]);

  return (
    <>
      <Background />
      <style>{`
        .main-content {
          flex: 1;
          width: 100%;
          min-height: 100vh;
        }
      `}</style>
      <div style={{ position: "relative", zIndex: 2, display: "flex", width: "100%", minHeight: "100vh" }}>
        <div
          className={`app-container ${walletAddress ? "loggedin" : "loggedout"}`}
          style={{
            display: "flex",
            width: "100%",
            color: isDark ? "#fff" : "#1a1a2e",
            minHeight: "100vh"
          }}
        >
          {/* Wallet Connection Modal */}
          {isModalOpen && (
            <WalletModal
              onClose={() => setModalOpen(false)}
              onConnect={({ wallet, address }) => {
                setWalletAddress(address);
                setWalletType(wallet.toUpperCase());
                setConnectedWallets(prev => {
                  if (prev.some(w => w.address === address)) return prev;
                  return [...prev, { 
                    address, 
                    type: wallet.toUpperCase(), 
                    name: wallet.charAt(0).toUpperCase() + wallet.slice(1) 
                  }];
                });
                setModalOpen(false);
              }}
            />
          )}

          {walletAddress && (
            <TopNav
              walletAddress={walletAddress}
              onDisconnect={() => disconnectWallet()}
            />
          )}

          <main className="main-content"
            style={{ paddingTop: walletAddress ? "64px" : "0", flex: 1, width: "100%" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                style={{ width: "100%", minHeight: "100%" }}
              >
            <Routes>
              {/*  Mobile Responsive Login Page */}
              <Route path="/login" element={
                !walletAddress ? (
                  <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                  }}>
                    <div style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "24px",
                      padding: "clamp(24px, 6vw, 48px)",
                      width: "100%",
                      maxWidth: "480px",
                      textAlign: "center",
                      boxShadow: isDark ? "0 25px 50px rgba(139,92,246,0.4)" : "0 4px 24px rgba(0,0,0,0.1)",
                    }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                        fontSize: "28px",
                      }}>
                        🎨
                      </div>

                      <h1 style={{
                        fontSize: "clamp(1.4rem, 5vw, 2rem)",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                        color: isDark ? "#fff" : "#1a1a2e",
                        marginBottom: "10px",
                        lineHeight: 1.2,
                      }}>NFT Hub - DApp</h1>

                      <p style={{
                        fontSize: "clamp(0.85rem, 3vw, 1rem)",
                        fontFamily: "'Inter', sans-serif",
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                        marginBottom: "8px",
                      }}>Create and Trade Stellar NFTs</p>

                      <p style={{
                        fontSize: "0.8rem",
                        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                        marginBottom: "32px",
                      }}>Connect your wallet to get started</p>



                      <button
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                          color: "#fff",
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 600,
                          padding: "clamp(12px, 3vw, 16px)",
                          borderRadius: "14px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "clamp(0.9rem, 3vw, 1rem)",
                          boxShadow: "0 8px 24px rgba(236,72,153,0.4)",
                          transition: "all 0.3s ease",
                        }}
                        onClick={() => setModalOpen(true)}
                        onMouseEnter={e => e.target.style.transform = "scale(1.02)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      >
                        Connect Wallet
                      </button>

                      <p style={{
                        marginTop: "20px",
                        fontSize: "0.75rem",
                        color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                      }}>
                        Supports Freighter • Albedo • xBull
                      </p>
                    </div>
                  </div>
                ) : <Navigate to="/dashboard" replace />
              } />
              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />
              
              <Route
                path="/dashboard"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <DashboardPage 
                        walletAddress={walletAddress} 
                        balance={accountDetails?.balances.find(b => b.asset_type === "native")?.balance || "0"} 
                        nfts={nfts} 
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              
              <Route
                path="/mint"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MintPage
                        walletAddress={walletAddress}
                        server={server}
                        setNfts={setNfts}
                        nfts={nfts}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/profile"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <ProfilePage account={accountDetails} nfts={nfts} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/gallery"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <GalleryPage nfts={nfts} walletAddress={walletAddress} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/marketplace"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MarketplacePage walletAddress={walletAddress} nfts={nfts} server={server} hideTabs={true} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/for-sale"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MarketplacePage 
                        walletAddress={walletAddress} 
                        nfts={nfts} 
                        server={server} 
                        initialFilter="sale" 
                        title="For Sale" 
                        hideTabs={true}
                        hideStats={true}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/my-nfts"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MarketplacePage 
                        walletAddress={walletAddress} 
                        nfts={nfts} 
                        server={server} 
                        initialFilter="mine" 
                        title="My NFTs" 
                        hideTabs={true}
                        hideStats={true}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />

              <Route
                path="/nft/:id"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <NFTDetailPage />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/chat"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <ChatPage />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
            </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
