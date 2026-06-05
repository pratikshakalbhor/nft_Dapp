import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { getImageById } from "../utils/imageMap";
import { containerVariants, itemVariants } from "../components/ProfilePage";
import { useTheme } from "../context/ThemeContext";
import { shortenAddress } from "../utils";
import { recordActivity } from "../utils/activityService";
import "./GalleryPage.css";

export default function GalleryPage({ nfts, walletAddress }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [price, setPrice] = useState("10");
  const [listing, setListing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const uniqueNfts = nfts ? nfts.filter((nft, index, self) =>
    index === self.findIndex((n) =>
      n.name === nft.name &&
      (n.imageId || n.image) === (nft.imageId || nft.image)
    )
  ) : [];

  const isEmpty = uniqueNfts.length === 0;

  // ── List NFT for sale → save to Firebase ─────────────────────────────────
  const handleListForSale = (nft) => {
    setSelectedNft(nft);
    setPrice("10");
    setShowPriceModal(true);
  };

  const confirmList = async () => {
    if (!price || parseFloat(price) <= 0) return;
    if (!walletAddress || !selectedNft) return;

    setListing(true);
    try {
      const imageId = selectedNft.imageId || selectedNft.image || "";
      const nftKey = `nft_${walletAddress.slice(0, 8)}_${selectedNft.name.replace(/\s+/g, "_")}`;

      // Save to Firebase — Marketplace will pick this up
      const listingRef = ref(db, `marketplace/${nftKey}`);
      await set(listingRef, {
        nftKey,
        name: selectedNft.name,
        image: imageId,
        price: price,
        ownerFull: walletAddress,
        owner: shortenAddress(walletAddress),
        listed: true,
        sold: false,
        isCert: selectedNft.name?.toLowerCase().includes("certificate") ||
          selectedNft.name?.toLowerCase().includes("job cert"),
        listedAt: Date.now(),
      });

      // Log Activity
      await recordActivity(walletAddress, {
        type: "nft_listed",
        title: "NFT Listed",
        description: `Listed "${selectedNft.name}" for ${price} XLM`,
        color: "#fbbf24"
      });

      setShowPriceModal(false);
      setSuccessMsg(` "${selectedNft.name}" listed for ${price} XLM!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error("List error:", e);
      setSuccessMsg(" Failed to list NFT. Try again.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setListing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <motion.div
        className="max-w-6xl mx-auto p-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="gallery-header" variants={itemVariants}>
          <h1 className="heading-xl" style={{ color: isDark ? "#fff" : "#1a1a2e", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My NFT Collection</h1>
          <p className="subtext" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
            Your minted digital assets on Stellar.
          </p>
        </motion.div>

        {/* Success message */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                padding: "12px 20px", borderRadius: "12px",
                background: successMsg.includes("❌") ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                border: `1px solid ${successMsg.includes("❌") ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                color: successMsg.includes("❌") ? "#f87171" : "#34d399",
                fontSize: "0.9rem", fontWeight: 500,
              }}>
              {successMsg}
              {!successMsg.includes("❌") && (
                <button onClick={() => navigate("/marketplace")} style={{
                  marginLeft: "12px", padding: "4px 12px",
                  background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
                  border: "none", borderRadius: "8px",
                  color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.8rem",
                }}>View in Marketplace →</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* NFT Count Badge */}
        {!isEmpty && (
          <motion.div variants={itemVariants}>
            <span style={{
              background: "rgba(139, 92, 246, 0.15)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              color: "#a78bfa", padding: "6px 16px",
              borderRadius: "999px", fontSize: "0.85rem", fontWeight: "600",
            }}>
              {uniqueNfts.length} NFT{uniqueNfts.length > 1 ? "s" : ""} Minted
            </span>
          </motion.div>
        )}

        {isEmpty ? (
          <motion.div className="card flex flex-col items-center justify-center text-center" variants={itemVariants}
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
              boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.06)",
              padding: "40px"
            }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#94a3b8" : "#475569"} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: isDark ? "#fff" : "#1a1a2e", margin: "0 0 8px 0" }}>
              No NFTs Minted Yet
            </h3>
            <p style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", margin: "0 0 24px 0" }}>
              Start your collection by minting your first digital asset.
            </p>
            <button onClick={() => navigate('/mint')} className="btn-primary mt-6">
              Mint Your First NFT
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="gallery-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            {uniqueNfts.map((nft, index) => {
              const imageId = nft.imageId || nft.image || "";
              const imageSrc =
                imageId.startsWith("https://") || imageId.startsWith("ipfs://")
                  ? imageId
                  : getImageById(imageId.toUpperCase()) ||
                  "https://via.placeholder.com/200?text=No+Image";

              const imageKey = imageId.startsWith("https://")
                ? "IPFS" : imageId.toUpperCase();

              return (
                <motion.div
                  key={`${nft.name}-${index}`}
                  className="relative flex justify-center mt-8"
                  variants={itemVariants}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[500px] h-[500px] bg-gradient-to-br from-purple-600/40 via-pink-500/20 to-blue-500/30 rounded-full blur-[180px] opacity-70 z-0"></div>

                  <motion.div
                    className="relative z-10 w-[380px] card"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{
                      background: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.9)",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                      boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
                      borderRadius: "20px", overflow: "hidden"
                    }}
                  >
                    <div className="nft-image-container" style={{ background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.05)" }}>
                      <img
                        src={imageSrc}
                        alt={nft.name || "NFT"}
                        className="nft-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/200?text=Image+Error";
                        }}
                      />
                    </div>

                    <div className="nft-info" style={{
                      padding: "16px",
                      borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
                      background: isDark ? "rgba(15, 23, 42, 0.3)" : "rgba(255, 255, 255, 0.5)"
                    }}>
                      <h3 className="nft-name" title={nft.name || "Unnamed NFT"} style={{
                        fontSize: "1.1rem", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, margin: "0 0 6px 0",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        color: isDark ? "#f8fafc" : "#1a1a2e"
                      }}>
                        {nft.name || "Unnamed NFT"}
                      </h3>
                      <div className="nft-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: isDark ? "#94a3b8" : "rgba(0,0,0,0.6)" }}>
                        <span className="nft-badge" style={{
                          background: isDark ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.05)",
                          color: isDark ? "#a78bfa" : "#7c3aed", padding: "2px 8px", borderRadius: "6px",
                          fontWeight: 600, border: isDark ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(139, 92, 246, 0.3)"
                        }}>#{imageKey}</span>
                        <span>Stellar Network</span>
                      </div>

                      {imageId.startsWith("https://") && (
                        <a href={imageId} target="_blank" rel="noopener noreferrer" style={{
                          display: "block", marginTop: "8px", fontSize: "0.7rem",
                          color: "#8b5cf6", textDecoration: "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          🔗 View on IPFS
                        </a>
                      )}

                      {/* Fixed: List for Sale button saves to Firebase */}
                      <button
                        onClick={() => handleListForSale(nft)}
                        style={{
                          marginTop: "12px", width: "100%", padding: "10px",
                          background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                          border: "none", borderRadius: "12px",
                          color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={e => e.target.style.opacity = "0.9"}
                        onMouseLeave={e => e.target.style.opacity = "1"}
                      >
                        List for Sale
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* ── Price Modal ── */}
      <AnimatePresence>
        {showPriceModal && selectedNft && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85 }}
              style={{
                background: isDark ? "rgba(13,17,28,0.98)" : "#fff",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                borderRadius: "24px", padding: "36px",
                width: "90%", maxWidth: "420px",
                color: isDark ? "#fff" : "#1a1a2e",
                boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
              }}
            >
              <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem", fontWeight: 700, textAlign: "center" }}>
                List for Sale
              </h3>
              <p style={{ textAlign: "center", color: isDark ? "#94a3b8" : "#475569", marginBottom: "20px" }}>
                <strong style={{ color: "#a78bfa" }}>{selectedNft.name}</strong>
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>
                  Price in XLM
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 10"
                  min="0.1" step="0.1"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "12px",
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                    color: isDark ? "white" : "#1a1a2e", fontSize: "1rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <p style={{ fontSize: "0.78rem", opacity: 0.5, textAlign: "center", marginBottom: "20px" }}>
                Listing saved to Firebase — visible to all users in Marketplace.
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => { setShowPriceModal(false); setSelectedNft(null); }}
                  style={{
                    flex: 1, padding: "12px", background: "transparent",
                    border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "12px",
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmList}
                  disabled={listing}
                  style={{
                    flex: 2, padding: "12px",
                    background: listing ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg,#8b5cf6,#3b82f6)",
                    border: "none", borderRadius: "12px",
                    color: "white", cursor: listing ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: "1rem",
                  }}
                >
                  {listing ? "Listing..." : "List Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}