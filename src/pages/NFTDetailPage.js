import React, { useState, useEffect } from "react";
import AIPricePredictor from "../components/AIPricePredictor";
import { getNFTTraits, calculateRarityScore, getRarityTier, getTraitFrequency } from "../utils/RarityCalculator";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  User, 
  Gavel, 
  ShieldCheck,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";
import { 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { ref, onValue, set } from "firebase/database";
import { db } from "../firebase";
import { useWallet } from "../WalletContext";
import { useTheme } from "../context/ThemeContext";
import { fetchNFTById } from "../utils/soroban";
import { shortenAddress } from "../utils";
import AuctionTimer from "../components/AuctionTimer";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, y: 0,
    transition: { staggerChildren: 0.15, duration: 0.6 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export default function NFTDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { isDark } = useTheme();
  
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fbData, setFbData] = useState(null);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offers, setOffers] = useState([]);
  const [offerStatus, setOfferStatus] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [allNfts, setAllNfts] = useState([]);

  useEffect(() => {
    const allNftsRef = ref(db, "marketplace");
    const unsubAll = onValue(allNftsRef, (snap) => {
      const val = snap.val();
      if (val) {
        setAllNfts(Object.values(val));
      }
    });
    return () => unsubAll();
  }, []);

  const traits = (nft || fbData) ? (fbData?.traits || getNFTTraits(nft || fbData)) : [];
  const rarityScore = fbData?.rarityScore || calculateRarityScore(traits, allNfts);
  const rarityTier = getRarityTier(rarityScore);

  // Mock Price History Data
  const priceData = [
    { name: "Mon", price: 5, date: "2026-06-01" },
    { name: "Tue", price: 8, date: "2026-06-02" },
    { name: "Wed", price: 7, date: "2026-06-03" },
    { name: "Thu", price: 12, date: "2026-06-04" },
    { name: "Fri", price: 10, date: "2026-06-05" },
    { name: "Sat", price: 15, date: "2026-06-06" },
  ];

  useEffect(() => {
    if (!id) return;
    
    // 1. Fetch from Blockchain
    fetchNFTById(walletAddress || "G...", id).then(data => {
      setNft(data);
      setLoading(false);
    });

    // 2. Fetch from Firebase
    const nftRef = ref(db, `marketplace/nft_${id}`);
    const unsub = onValue(nftRef, (snap) => {
      setFbData(snap.val());
    });
    
    // 3. Check Likes (mock for now)
    const likeRef = ref(db, `likes/${id}/${walletAddress}`);
    if (walletAddress) {
      onValue(likeRef, (snap) => setLiked(!!snap.val()));
    }

    // 4. Fetch Offers
    const offersRef = ref(db, `offers/${id}`);
    const offersUnsub = onValue(offersRef, (snap) => {
      const data = snap.val();
      if (data) {
        setOffers(Object.entries(data).map(([key, val]) => ({ id: key, ...val })));
      } else {
        setOffers([]);
      }
    });

    return () => { unsub(); offersUnsub(); };
  }, [id, walletAddress]);

  useEffect(() => {
    if (!nft?.owner || !walletAddress) return;
    
    // Follow Status
    const followRef = ref(db, `followers/${nft.owner}/${walletAddress}`);
    const unsubFollow = onValue(followRef, (snap) => setIsFollowing(!!snap.val()));

    // Follower Count
    const countRef = ref(db, `followers/${nft.owner}`);
    const unsubCount = onValue(countRef, (snap) => {
      setFollowerCount(snap.val() ? Object.keys(snap.val()).length : 0);
    });

    return () => { unsubFollow(); unsubCount(); };
  }, [nft?.owner, walletAddress]);

  const handleFollow = () => {
    if (!walletAddress) return alert("Connect wallet first!");
    if (isOwner) return alert("You cannot follow yourself");
    
    const followRef = ref(db, `followers/${nft.owner}/${walletAddress}`);
    const followingRef = ref(db, `following/${walletAddress}/${nft.owner}`);
    
    const newState = !isFollowing ? { timestamp: Date.now() } : null;
    set(followRef, newState);
    set(followingRef, newState);
  };

  const handleLike = () => {
    if (!walletAddress) return alert("Connect wallet first!");
    const likeRef = ref(db, `likes/${id}/${walletAddress}`);
    set(likeRef, !liked ? true : null);
    setLiked(!liked);
  };

  const handleMakeOffer = async () => {
    if (!walletAddress) return alert("Connect wallet first!");
    if (!offerAmount || isNaN(offerAmount)) return alert("Enter valid amount");
    
    setOfferStatus("submitting");
    try {
      const offerId = `offer_${Date.now()}`;
      const offerRef = ref(db, `offers/${id}/${offerId}`);
      await set(offerRef, {
        amount: offerAmount,
        bidder: walletAddress,
        bidderShort: shortenAddress(walletAddress),
        timestamp: Date.now(),
        status: "pending"
      });
      setOfferStatus("success");
      setTimeout(() => {
        setShowOfferModal(false);
        setOfferAmount("");
        setOfferStatus("");
      }, 1500);
    } catch (err) {
      console.error(err);
      setOfferStatus("error");
    }
  };

  const startAuction = async () => {
    if (!walletAddress || !isOwner) return;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const newEnd = Date.now() + twentyFourHours;
    await set(ref(db, `marketplace/nft_${id}/auctionEnd`), newEnd);
    alert("Auction started/extended for 24 hours!");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid #ec489922", borderTopColor: "#ec4899", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!nft) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
        <h2 style={{ opacity: 0.5 }}>NFT Not Found</h2>
        <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: "12px", background: "#ec4899", color: "white", border: "none", cursor: "pointer" }}>Go Back</button>
      </div>
    );
  }

  const isOwner = walletAddress === nft.owner;

  const glassStyle = {
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.05)",
    borderRadius: "24px",
    padding: "24px",
  };

  const tabStyle = (active) => ({
    padding: "12px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.9rem",
    transition: "all 0.2s",
    background: active ? (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)") : "transparent",
    color: active ? (isDark ? "#fff" : "#000") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"),
  });

  return (
    <motion.div 
      initial="hidden" animate="visible" variants={containerVariants}
      style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: isDark ? "#fff" : "#000", cursor: "pointer", marginBottom: "32px", fontWeight: 700, opacity: 0.7 }}>
        <ArrowLeft size={20} /> Back to Marketplace
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "48px" }}>
        
        {/* Left Col: Image */}
        <motion.div variants={itemVariants}>
          <div style={{ ...glassStyle, padding: "12px", position: "relative" }}>
            <div style={{ borderRadius: "20px", overflow: "hidden", aspectRatio: "1/1", background: "#000" }}>
              <img src={nft.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000"} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            
            <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", gap: "8px" }}>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                style={{ width: "44px", height: "44px", borderRadius: "12px", border: "none", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", color: liked ? "#ff4081" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Heart fill={liked ? "#ff4081" : "none"} size={20} />
              </motion.button>

              <button style={{ width: "44px", height: "44px", borderRadius: "12px", border: "none", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Share2 size={20} />
              </button>
            </div>
          </div>

          <div style={{ ...glassStyle, marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
             <h3 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
               <TrendingUp size={20} color="#8b5cf6" /> Price History
             </h3>
             <div style={{ height: "200px", width: "100%", marginTop: "10px" }}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ 
                        background: isDark ? "rgba(30, 30, 45, 0.9)" : "rgba(255, 255, 255, 0.9)", 
                        border: "1px solid rgba(255,255,255,0.1)", 
                        borderRadius: "12px", 
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        backdropFilter: "blur(10px)"
                      }}
                      itemStyle={{ color: "#ec4899", fontWeight: 900, fontSize: "0.9rem" }}
                      labelStyle={{ color: isDark ? "#94a3b8" : "#64748b", marginBottom: "4px", fontSize: "0.75rem", fontWeight: 700 }}
                      formatter={(value) => [`${value} XLM`, "Price"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#ec4899" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
        </motion.div>

        {/* Right Col: Info */}
        <motion.div variants={itemVariants}>
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span style={{ padding: "4px 12px", background: "linear-gradient(135deg, #ec489922, #8b5cf622)", border: "1px solid #ec489944", color: "#ec4899", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Limited Edition</span>
              <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontSize: "0.85rem", fontWeight: 500 }}># {nft.id}</span>
              {rarityTier && (
                <span 
                  title={`Rarity Score: ${rarityScore}`}
                  style={{ 
                    padding: "4px 12px", 
                    background: rarityTier.bg, 
                    border: `1px solid ${rarityTier.border}`, 
                    color: rarityTier.color, 
                    borderRadius: "8px", 
                    fontSize: "0.75rem", 
                    fontWeight: 805, 
                    cursor: "help" 
                  }}
                >
                  {rarityTier.badge} ({rarityScore} Score)
                </span>
              )}
            </div>
            <h1 style={{ fontSize: "3rem", fontWeight: 900, margin: "0 0 16px", lineHeight: 1.1 }}>{nft.name}</h1>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.5 }}>Owner</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                    {isOwner ? "You" : shortenAddress(nft.owner)}
                    <ShieldCheck size={14} color="#3b82f6" fill="rgba(59, 130, 246, 0.1)" />
                  </div>
                  {!isOwner && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <button 
                        onClick={handleFollow}
                        style={{ 
                          fontSize: "0.7rem", fontWeight: 700, 
                          color: isFollowing ? "#3b82f6" : "#ec4899", background: "transparent", 
                          border: "none", cursor: "pointer", padding: 0 
                        }}
                      >
                        {isFollowing ? "✓ Following" : "+ Follow"}
                      </button>
                      <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>• {followerCount} followers</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.5 }}>Collection</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>Verified Assets</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...glassStyle, marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, opacity: 0.6, marginBottom: "4px" }}>Current Price</div>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#ec4899" }}>{fbData?.price || "---"} <span style={{ fontSize: "1.2rem", color: isDark ? "#fff" : "#000", opacity: 0.5 }}>{fbData?.currency || "XLM"}</span></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                   <Clock size={14} /> Auction Ends In
                </div>
                {/* Default 24h timer if not set in Firebase */}
                <AuctionTimer endTime={fbData?.auctionEnd || (Date.now() + 86400000)} isDark={isDark} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexDirection: isOwner ? "column" : "row" }}>
              {isOwner ? (
                <button 
                  onClick={startAuction}
                  style={{ width: "100%", padding: "18px", borderRadius: "16px", background: "linear-gradient(135deg, #10b981, #3b82f6)", color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                >
                  <Gavel size={20} /> Start/Extend 24h Auction
                </button>
              ) : (
                <>
                  <button style={{ flex: 1, padding: "18px", borderRadius: "16px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 10px 20px rgba(236, 72, 153, 0.3)" }}>
                    Buy Now
                  </button>
                  <button 
                    onClick={() => setShowOfferModal(true)}
                    style={{ flex: 1, padding: "18px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", color: isDark ? "#fff" : "#000", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}
                  >
                    Make Offer
                  </button>
                </>
              )}
            </div>
            
            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.8rem", opacity: 0.5 }}>
              <Gavel size={14} /> Auction powered by Stellar Network
            </div>
          </div>

          {/* AI Price Predictor */}
          <div style={{ marginBottom: "24px" }}>
            <AIPricePredictor
              nft={nft}
              price={fbData?.price || "10"}
              currency={fbData?.currency || "XLM"}
              priceHistory={priceData}
              isDark={isDark}
            />
          </div>

          {/* Tabs Section */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <div onClick={() => setActiveTab("details")} style={tabStyle(activeTab === "details")}>Details</div>
            <div onClick={() => setActiveTab("rarity")} style={tabStyle(activeTab === "rarity")}>Rarity Breakdown</div>
            <div onClick={() => setActiveTab("history")} style={tabStyle(activeTab === "history")}>History</div>
            <div onClick={() => setActiveTab("offers")} style={tabStyle(activeTab === "offers")}>Offers ({offers.length})</div>
          </div>

          <div style={{ ...glassStyle, minHeight: "200px" }}>
             <AnimatePresence mode="wait">
               {activeTab === "rarity" && (
                 <motion.div key="rarity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      
                      {/* Overall Rarity Score Info */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "4px" }}>Total Rarity Score</div>
                          <div style={{ fontSize: "2rem", fontWeight: 900, color: rarityTier?.color }}>{rarityScore}</div>
                        </div>
                        <div style={{ padding: "8px 16px", background: rarityTier?.bg, border: `1px solid ${rarityTier?.border}`, borderRadius: "12px", color: rarityTier?.color, fontWeight: 800, fontSize: "0.95rem" }}>
                          {rarityTier?.badge}
                        </div>
                      </div>

                      {/* Rarity Traits Breakdown Table */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0" }}>Trait Breakdown</h4>
                        {traits.map((t, idx) => {
                          const freq = getTraitFrequency(t, allNfts);
                          const freqPct = (freq * 100).toFixed(1);
                          return (
                            <div key={idx} style={{ padding: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                                <div>
                                  <span style={{ fontSize: "0.75rem", opacity: 0.5, fontWeight: 700, textTransform: "uppercase" }}>{t.type}</span>
                                  <div style={{ fontSize: "0.95rem", fontWeight: 800, marginTop: "2px" }}>{t.value}</div>
                                </div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 705, color: freq <= 0.05 ? "#ef4444" : freq <= 0.15 ? "#a78bfa" : "#3b82f6" }}>
                                  {freqPct}% have this trait
                                </div>
                              </div>
                              {/* Rarity Bar */}
                              <div style={{ width: "100%", height: "6px", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", borderRadius: "999px", overflow: "hidden" }}>
                                <div style={{ 
                                  height: "100%", 
                                  width: `${freqPct}%`, 
                                  background: freq <= 0.05 
                                    ? "linear-gradient(90deg, #ef4444, #f87171)" 
                                    : freq <= 0.15 
                                      ? "linear-gradient(90deg, #a78bfa, #c4b5fd)" 
                                      : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                                  borderRadius: "999px"
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                 </motion.div>
               )}
               {activeTab === "details" && (
                 <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                   <p style={{ lineHeight: 1.6, opacity: 0.7, marginBottom: "20px" }}>
                     This unique digital asset is a part of the exclusive "Verified Assets" collection. 
                     It represents a high-fidelity piece of digital craftsmanship on the Stellar blockchain.
                   </p>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {[
                        { label: "Contract", value: "Soroban_v1" },
                        { label: "Token Std", value: "NFT_V1" },
                        { label: "Blockchain", value: "Stellar" },
                        { label: "Royalty", value: "5%" }
                      ].map(attr => (
                        <div key={attr.label} style={{ padding: "12px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
                          <div style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 700 }}>{attr.label}</div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{attr.value}</div>
                        </div>
                      ))}
                   </div>
                 </motion.div>
               )}
               {activeTab === "history" && (
                 <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                   {[
                     { user: "Collector_A", event: "Bought", price: "5 XLM", time: "2 days ago" },
                     { user: "Minter_X", event: "Minted", price: "-", time: "5 days ago" },
                   ].map((h, i) => (
                     <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={16} /></div>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{h.user}</div>
                            <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>{h.event} • {h.time}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: "#ec4899" }}>{h.price}</div>
                     </div>
                   ))}
                 </motion.div>
               )}
               {activeTab === "offers" && (
                 <motion.div key="offers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                   {offers.length === 0 ? (
                     <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.5 }}>No offers yet. Be the first to bid!</div>
                   ) : (
                     offers.sort((a,b) => b.amount - a.amount).map((o, i) => (
                       <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#8b5cf622", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={16} /></div>
                            <div>
                               <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{o.bidderShort}</div>
                               <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>Offer received</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                             <div style={{ fontWeight: 800, color: "#10b981" }}>{o.amount} XLM</div>
                             <div style={{ fontSize: "0.65rem", opacity: 0.5 }}>{new Date(o.timestamp).toLocaleDateString()}</div>
                          </div>
                       </div>
                     ))
                   )}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </motion.div>

      </div>

      {/* Recommended Section */}
      <div style={{ marginTop: "80px" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 900 }}>More from this Collection</h2>
            <button onClick={() => navigate("/marketplace")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "#ec4899", fontWeight: 700, cursor: "pointer" }}>
              Explore All <ChevronRight size={18} />
            </button>
         </div>
         
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
            {[1, 2, 3, 4].map(idx => (
              <motion.div 
                key={idx} 
                whileHover={{ y: -10 }}
                style={{ ...glassStyle, padding: "12px", cursor: "pointer" }}
                onClick={() => navigate(`/nft/${idx}`)}
              >
                <div style={{ borderRadius: "16px", overflow: "hidden", aspectRatio: "1/1", marginBottom: "16px" }}>
                  <img src={`https://picsum.photos/seed/${idx}/400/400`} alt="rec" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontWeight: 800 }}>Recommended NFT #{idx}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                   <span style={{ fontSize: "0.85rem", opacity: 0.5 }}>Price</span>
                   <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ec4899" }}>{10 + idx} XLM</span>
                </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Offer Modal */}
      <AnimatePresence>
        {showOfferModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ ...glassStyle, maxWidth: "400px", width: "100%", position: "relative", zIndex: 1, textAlign: "center" }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900 }}>Make an Offer</h2>
              <p style={{ opacity: 0.6, fontSize: "0.9rem", marginBottom: "24px" }}>Enter the amount you're willing to pay for this NFT.</p>
              
              <div style={{ position: "relative", marginBottom: "24px" }}>
                <input 
                  type="number" 
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "1.5rem", fontWeight: 800, textAlign: "center", outline: "none" }}
                />
                <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontWeight: 800, opacity: 0.5 }}>XLM</span>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setShowOfferModal(false)} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button 
                  onClick={handleMakeOffer}
                  disabled={offerStatus === "submitting"}
                  style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                >
                  {offerStatus === "submitting" ? "Submitting..." : offerStatus === "success" ? "Success!" : "Send Offer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
