import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { ref, set, onValue, runTransaction } from "firebase/database";
import { db } from "../firebase";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK, NETWORK_PASSPHRASE } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { shortenAddress } from "../utils";
import { fetchAllNFTs } from "../utils/soroban";
import { recordActivity } from "../utils/activityService";
import { containerVariants, itemVariants } from "../components/ProfilePage";
import { RefreshCw, Tag, ShoppingCart, Trash2, Edit2, Search, SlidersHorizontal } from "lucide-react";
import SkeletonCard from "../components/SkeletonCard";
import { AIPricePredictorMini } from "../components/AIPricePredictor";
import { getNFTTraits, calculateRarityScore, getRarityTier } from "../utils/RarityCalculator";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export default function MarketplacePage({ walletAddress, initialFilter = "all", title = "Marketplace", hideTabs = false, hideStats = false }) {
  const { walletType } = useWallet();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [blockchainNFTs, setBlockchainNFTs] = useState([]); // raw from chain
  const [firebaseData, setFirebaseData] = useState({});      // raw from Firebase
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [buyingId, setBuyingId] = useState(null);
  const [successTx, setSuccessTx] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState("10");
  const [listCurrency, setListCurrency] = useState("XLM");
  const [selectedNft, setSelectedNft] = useState(null);
  const [filter, setFilter] = useState(initialFilter);
  const [sortBy, setSortBy] = useState("newest");
  const [statusMsg, setStatusMsg] = useState("");
  const [confirmBuy, setConfirmBuy] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [likes, setLikes] = useState({});
  const [category, setCategory] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const CATEGORIES = ["all", "Art", "3D", "Music", "Photography", "Gaming"];

  // ── Load blockchain NFTs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;
    setLoadingNFTs(true);
    fetchAllNFTs(walletAddress)
      .then(nfts => setBlockchainNFTs(nfts))
      .catch(e => console.error("fetchAllNFTs error:", e))
      .finally(() => setLoadingNFTs(false));
  }, [walletAddress]);

  // ── Listen to Firebase marketplace in real-time ───────────────────────────
  useEffect(() => {
    const marketRef = ref(db, "marketplace");
    const unsub = onValue(marketRef, (snap) => {
      setFirebaseData(snap.val() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    const likesRef = ref(db, `likes`);
    const unsub = onValue(likesRef, (snap) => {
      const data = snap.val() || {};
      const userLikes = {};
      Object.entries(data).forEach(([nftId, bidders]) => {
        if (bidders[walletAddress]) userLikes[`nft_${nftId}`] = true;
      });
      setLikes(userLikes);
    });
    return () => unsub();
  }, [walletAddress]);

  // ── Merge blockchain + Firebase into final listings ───────────────────────
  const listings = (() => {
    const result = [];

    // 1. Start with blockchain NFTs
    blockchainNFTs.forEach((nft, i) => {
      const nftKey = `nft_${nft.id}`;
      const fb = firebaseData[nftKey];
      const traits = fb?.traits || getNFTTraits(nft);
      // Pass blockchainNFTs as allNfts to compute frequency
      const rarityScore = fb?.rarityScore || calculateRarityScore(traits, blockchainNFTs);
      const rarityTier = getRarityTier(rarityScore);

      result.push({
        id: i + 1,
        nftKey,
        nftId: nft.id,
        name: nft.name || `NFT #${nft.id}`,
        image: nft.image || "",
        // Use Firebase owner if exists (after purchase), else blockchain owner
        ownerFull: fb?.ownerFull || nft.owner,
        owner: fb?.ownerFull ? shortenAddress(fb.ownerFull) : shortenAddress(nft.owner),
        price: fb?.price || "10",
        currency: fb?.currency || "XLM",
        listed: fb?.listed || false,
        sold: fb?.sold || false,
        isCert: false,
        traits,
        rarityScore,
        rarityTier,
      });
    });

    // 2. Add Firebase-only listings (from Gallery listing — nftKey like nft_ADDR_name)
    Object.values(firebaseData).forEach(fb => {
      if (!fb?.nftKey) return;
      // Skip if already in result from blockchain
      const alreadyIn = result.find(n => n.nftKey === fb.nftKey);
      if (!alreadyIn) {
        const traits = fb.traits || getNFTTraits(fb);
        const rarityScore = fb.rarityScore || calculateRarityScore(traits, result);
        const rarityTier = getRarityTier(rarityScore);

        result.push({
          id: result.length + 1,
          nftKey: fb.nftKey,
          nftId: null,
          name: fb.name || "NFT",
          image: fb.image || "",
          ownerFull: fb.ownerFull || "",
          owner: fb.owner || "",
          price: fb.price || "10",
          listed: fb.listed || false,
          sold: fb.sold || false,
          isCert: false,
          traits,
          rarityScore,
          rarityTier,
        });
      }
    });

    return result;
  })();

  // ── Filtered listings ─────────────────────────────────────────────────────
  const filteredListings = listings
    .filter(n => {
      const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.ownerFull.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "sale") return n.listed && !n.sold;
      if (filter === "mine") return n.ownerFull === walletAddress;
      if (filter === "fav") return likes[n.nftKey];
      return true;
    })
    .filter(n => {
      // Category filter — stored in nft.category or derived from nft.name
      if (category !== "all") {
        const nftCat = (n.category || "").toLowerCase();
        if (!nftCat.includes(category.toLowerCase())) return false;
      }
      // Price range filter
      if (priceMin !== "" && parseFloat(n.price) < parseFloat(priceMin)) return false;
      if (priceMax !== "" && parseFloat(n.price) > parseFloat(priceMax)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price-high") return parseFloat(b.price) - parseFloat(a.price);
      return b.id - a.id;
    });

  const listedCount = listings.filter(n => n.listed && !n.sold).length;

  const myCount = listings.filter(n => n.ownerFull === walletAddress).length;

  // ── Save listing to Firebase ──────────────────────────────────────────────
  const saveToFirebase = async (nft, price) => {
    const marketRef = ref(db, `marketplace/${selectedNft.nftKey}`);
    await set(marketRef, {
      nftKey: nft.nftKey,
      name: nft.name,
      image: nft.image || "",
      price: price,
      currency: listCurrency,
      ownerFull: walletAddress,
      owner: shortenAddress(walletAddress),
      listed: true,
      sold: false,
      isCert: nft.isCert,
      listedAt: Date.now(),
    });
  };

  // ── Buy flow ──────────────────────────────────────────────────────────────
  const handleBuy = (nft) => {
    if (!walletAddress || !walletType) {
      setStatusMsg("Please connect your wallet first.");
      return;
    }
    if (nft.ownerFull === walletAddress) {
      setStatusMsg("You cannot buy your own NFT!");
      setTimeout(() => setStatusMsg(""), 3000);
      return;
    }
    if (!nft.listed || nft.sold) {
      setStatusMsg(" This NFT is no longer available!");
      setTimeout(() => setStatusMsg(""), 3000);
      return;
    }
    setConfirmBuy(nft);
  };

  const executeBuy = async (nft) => {
    setBuyingId(nft.id);
    setStatusMsg(" Processing purchase...");
    try {
      // Step 1 — XLM payment
      const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
      const sourceAccount = await horizonServer.loadAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: "1000000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: nft.ownerFull,
          asset: StellarSdk.Asset.native(),
          amount: nft.price,
        }))
        .setTimeout(300).build();

      setStatusMsg(" Please sign the XLM payment...");
      const signedXDR = await signTransaction(tx.toXDR(), {
        walletType,
        network: NETWORK,
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (!signedXDR) throw new Error("Signing cancelled");

      const signedTxXdr = typeof signedXDR === "object" && signedXDR.signedTxXdr
        ? signedXDR.signedTxXdr : signedXDR;
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      setStatusMsg(" Submitting payment...");
      const response = await horizonServer.submitTransaction(signedTx);

      // Step 2 — Atomic Firebase ownership update
      setStatusMsg(" Updating ownership...");
      const listingRef = ref(db, `marketplace/${nft.nftKey}`);

      const txResult = await runTransaction(listingRef, (current) => {
        if (!current) {
          // Create new record if not exists
          return {
            nftKey: nft.nftKey,
            name: nft.name,
            image: nft.image || "",
            price: nft.price,
            currency: nft.currency,
            ownerFull: walletAddress,       // ← new owner
            owner: shortenAddress(walletAddress),
            listed: false,
            sold: true,
            soldAt: Date.now(),
            soldPrice: nft.price,
            isCert: nft.isCert,
          };
        }
        if (current.sold) return; // abort — already sold
        return {
          ...current,
          ownerFull: walletAddress,         // ← ownership transferred
          owner: shortenAddress(walletAddress),
          listed: false,
          sold: true,
          soldAt: Date.now(),
          soldPrice: nft.price,
        };
      });

      if (!txResult.committed) {
        throw new Error("NFT was already purchased by someone else!");
      }

      // Log Activities
      // 1. For Buyer
      await recordActivity(walletAddress, {
        type: "nft_purchased",
        title: "NFT Purchased",
        description: `Purchased ${nft.name} for ${nft.price} ${nft.currency || "XLM"}`,
        color: "#60a5fa"
      });

      // 2. For Seller
      await recordActivity(nft.ownerFull, {
        type: "nft_sold",
        title: "NFT Sold",
        description: `Sold ${nft.name} for ${nft.price} ${nft.currency || "XLM"} to ${shortenAddress(walletAddress)}`,
        color: "#a78bfa"
      });

      setSuccessTx({ hash: response.hash, nftName: nft.name, price: nft.price, currency: nft.currency });
      setStatusMsg("");

    } catch (e) {
      console.error("Buy error:", e);
      if (e.message?.includes("already purchased")) {
        setStatusMsg(" NFT already purchased by someone else!");
      } else if (e.message?.includes("cancelled") || e.message?.includes("denied")) {
        setStatusMsg("Transaction cancelled.");
      } else if (e.message?.includes("INSUFFICIENT")) {
        setStatusMsg(" Insufficient XLM balance.");
      } else {
        setStatusMsg(` ${e.message}`);
      }
      setTimeout(() => setStatusMsg(""), 6000);
    } finally {
      setBuyingId(null);
    }
  };

  // ── List / Unlist ─────────────────────────────────────────────────────────
  const handleOpenListModal = (nft) => {
    setSelectedNft(nft);
    setListPrice(nft.price || "10");
    setListCurrency(nft.currency || "XLM");
    setShowListModal(true);
  };

  const confirmListing = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      setStatusMsg("Please enter a valid price.");
      return;
    }
    try {
      await saveToFirebase(selectedNft, listPrice);
      
      // Log Activity
      await recordActivity(walletAddress, {
        type: "nft_listed",
        title: "NFT Listed",
        description: `Listed ${selectedNft.name} for ${listPrice} ${listCurrency}`,
        color: "#fbbf24"
      });

      setShowListModal(false);
      setListPrice("10");
      setSelectedNft(null);
      setStatusMsg(" NFT listed for sale! Visible to all users.");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (e) {
      setStatusMsg(` Failed to list: ${e.message}`);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleUnlist = async (nft) => {
    const listingRef = ref(db, `marketplace/${nft.nftKey}`);
    await runTransaction(listingRef, (current) => {
      if (!current) return current;
      return { ...current, listed: false };
    });
    setStatusMsg("NFT removed from sale.");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
      <style>{`
        .market-card { background:${isDark ? "rgba(15,15,30,0.7)" : "rgba(255,255,255,0.9)"}; border:1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}; border-radius:20px; overflow:hidden; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); backdrop-filter:blur(20px); }
        .market-card:hover { border-color:rgba(139,92,246,0.4); box-shadow:0 20px 40px rgba(139,92,246,0.15); transform:translateY(-6px); }

        .buy-btn { background:linear-gradient(135deg,#059669,#047857); color:white; border:none; border-radius:12px; padding:10px 20px; font-weight:700; font-size:0.9rem; cursor:pointer; width:100%; transition:all 0.3s; }
        .buy-btn:hover:not(:disabled) { box-shadow:0 8px 25px rgba(5,150,105,0.4); transform:translateY(-1px); }
        .buy-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .list-btn { background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.3); color:#a78bfa; border-radius:12px; padding:10px 20px; font-weight:700; font-size:0.9rem; cursor:pointer; width:100%; transition:all 0.3s; }
        .list-btn:hover { background:rgba(139,92,246,0.25); }
        .unlist-btn { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#f87171; border-radius:12px; padding:10px 20px; font-weight:700; font-size:0.9rem; cursor:pointer; width:100%; margin-top:8px; }
        .for-sale-badge { position:absolute; top:12px; left:12px; background:linear-gradient(135deg,#8b5cf6,#3b82f6); color:white; font-size:0.7rem; font-weight:800; padding:4px 10px; border-radius:8px; }
        .own-badge { position:absolute; top:12px; right:12px; background:rgba(16,185,129,0.2); color:#10b981; border:1px solid rgba(16,185,129,0.4); font-size:0.7rem; font-weight:800; padding:4px 10px; border-radius:8px; }

        .overlay-modal { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; }
        .modal-card { background:${isDark ? "rgba(13,17,28,0.98)" : "#fff"}; border:1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}; border-radius:24px; padding:36px; max-width:420px; width:90%; color:${isDark ? "#fff" : "#1a1a2e"}; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes glow-pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }

      `}</style>

      <motion.div className="max-w-7xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={itemVariants} style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: isDark ? "#fff" : "#1a1a2e" }}>
            {filter === "all" ? "Marketplace" : filter === "sale" ? "For Sale" : "My NFTs"}
          </h1>
          <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", marginTop: "4px" }}>Buy and sell NFTs on Stellar blockchain</p>
          <div style={{ width: "48px", height: "3px", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", borderRadius: "2px", margin: "8px auto 0" }} />
          {!hideStats && (
            <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Total NFTs", value: listings.length },
                { label: "For Sale", value: listedCount, color: "#34d399" },
                { label: "My NFTs", value: myCount, color: "#60a5fa" },

              ].map(stat => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: stat.color || "#a78bfa" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={itemVariants} style={{ marginBottom: "24px", position: "relative" }}>
          <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search NFTs by name or owner address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 16px 16px 48px",
              borderRadius: "16px",
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              color: isDark ? "#fff" : "#1a1a2e",
              fontSize: "1rem",
              outline: "none",
              boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.02)",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#ec4899"}
            onBlur={(e) => e.target.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          />
        </motion.div>

        {/* Tabs */}
        {!hideTabs && (
          <motion.div variants={itemVariants} style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "8px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "6px", borderRadius: "14px", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
              {[
                { key: "all", label: "All NFTs", count: listings.length },
                { key: "sale", label: "For Sale", count: listedCount },
                { key: "fav", label: "Favorites", count: Object.keys(likes).length },
                { key: "mine", label: "My NFTs", count: myCount },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  flex: 1, padding: "10px 6px", borderRadius: "10px", border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: "clamp(0.65rem,2vw,0.85rem)",
                  background: filter === tab.key ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent",
                  color: filter === tab.key ? "#fff" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  transition: "all 0.2s",
                }}>
                  {tab.label}
                  <span style={{ marginLeft: "5px", fontSize: "0.7rem", background: filter === tab.key ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.15)", padding: "2px 6px", borderRadius: "10px" }}>{tab.count}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sort + Filters + Refresh */}
        <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", padding: "8px 16px", color: isDark ? "#e2e8f0" : "#1e293b", fontSize: "0.85rem", cursor: "pointer" }}>
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
            </select>
            <button onClick={() => setShowFilters(v => !v)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: showFilters ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), border: "none", borderRadius: "10px", color: showFilters ? "#fff" : (isDark ? "#a78bfa" : "#6d28d9"), cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              <SlidersHorizontal size={14} /> Filters
            </button>
          </div>
          <button onClick={() => { setLoadingNFTs(true); fetchAllNFTs(walletAddress).then(setBlockchainNFTs).finally(() => setLoadingNFTs(false)); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", color: isDark ? "#a78bfa" : "#6d28d9", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
            <RefreshCw size={14} className={loadingNFTs ? "animate-spin" : ""} /> Refresh
          </button>
        </motion.div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: "16px", padding: "20px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", opacity: 0.6, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Category</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{
                      padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
                      background: category === cat ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                      color: category === cat ? "#fff" : (isDark ? "#94a3b8" : "#64748b"), transition: "all 0.2s"
                    }}>
                      {cat === "all" ? "All" : cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", opacity: 0.6, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Price Range</div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    style={{ width: "100px", padding: "8px 12px", borderRadius: "10px", background: isDark ? "rgba(255,255,255,0.05)" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: "inherit", outline: "none" }} />
                  <span style={{ opacity: 0.5 }}>–</span>
                  <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    style={{ width: "100px", padding: "8px 12px", borderRadius: "10px", background: isDark ? "rgba(255,255,255,0.05)" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: "inherit", outline: "none" }} />
                  {(priceMin || priceMax || category !== "all") && (
                    <button onClick={() => { setPriceMin(""); setPriceMax(""); setCategory("all"); }}
                      style={{ padding: "8px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: statusMsg.includes("❌") ? "rgba(239,68,68,0.1)" : statusMsg.includes("✅") ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)", border: `1px solid ${statusMsg.includes("❌") ? "rgba(239,68,68,0.3)" : statusMsg.includes("✅") ? "rgba(16,185,129,0.3)" : "rgba(139,92,246,0.3)"}`, borderRadius: "12px", padding: "12px 20px", color: statusMsg.includes("❌") ? "#f87171" : statusMsg.includes("✅") ? "#34d399" : "#a78bfa", marginBottom: "16px", fontSize: "0.9rem", fontWeight: 500 }}>
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading: Skeleton Cards */}
        {loadingNFTs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loadingNFTs && filteredListings.length === 0 && (
          <motion.div variants={itemVariants} style={{ textAlign: "center", padding: "80px 20px", background: isDark ? "rgba(15,15,30,0.5)" : "rgba(255,255,255,0.8)", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", borderRadius: "20px" }}>
            <h3 style={{ color: isDark ? "#94a3b8" : "#475569", fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
              {filter === "sale" ? "No NFTs Listed for Sale" : filter === "mine" ? "You don't own any NFTs yet" : "No NFTs Found"}
            </h3>
            <p style={{ color: isDark ? "#475569" : "#64748b", fontSize: "0.9rem" }}>
              {filter === "mine" ? "Mint an NFT or complete a job to view them here!" : filter === "sale" ? "List your NFTs from Gallery → List for Sale" : "Mint some NFTs first!"}
            </p>
          </motion.div>
        )}

        {/* Grid */}
        {!loadingNFTs && (
          <motion.div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }} variants={containerVariants}>
            {filteredListings.map(nft => (
              <motion.div 
                key={nft.nftKey} 
                className="market-card" 
                variants={itemVariants}
                onClick={() => navigate(`/nft/${nft.nftId}`)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: isDark ? "#0a0a15" : "#f1f5f9" }}>
                  {/* Rarity Badge with Tooltip */}
                  {nft.rarityTier && (
                    <div 
                      title={`Rarity Score: ${nft.rarityScore}`}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        zIndex: 10,
                        background: nft.rarityTier.bg,
                        border: `1px solid ${nft.rarityTier.border}`,
                        color: nft.rarityTier.color,
                        padding: "4px 8px",
                        borderRadius: "10px",
                        fontSize: "0.72rem",
                        fontWeight: "800",
                        backdropFilter: "blur(8px)",
                        boxShadow: `0 4px 12px ${nft.rarityTier.bg}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "help"
                      }}
                    >
                      {nft.rarityTier.badge}
                    </div>
                  )}

                  {nft.image ? (
                    <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
                      onMouseEnter={e => e.target.style.transform = "scale(1.08)"}
                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                      🖼️
                    </div>
                  )}

                  {/* SOLD overlay */}
                  {nft.sold && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                      <span style={{ background: "rgba(239,68,68,0.95)", color: "white", padding: "8px 24px", borderRadius: "8px", fontWeight: 800, fontSize: "1.1rem" }}>SOLD</span>
                    </div>
                  )}

                  {nft.listed && !nft.sold ? <span className="for-sale-badge" style={{background: "#3b82f6"}}>For Sale</span>
                      : null}
                  {nft.ownerFull === walletAddress && (
                    <span className="own-badge" style={{ left: "12px", right: "auto" }}>
                      {nft.soldPrice ? "PURCHASED" : "YOURS"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "16px" }}>
                  <h3 style={{ color: isDark ? "white" : "#1a1a2e", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nft.name}</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    {nft.listed && !nft.sold ? (
                      <div style={{ padding: "4px 10px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", fontSize: "0.9rem", fontWeight: 900 }}>
                        {nft.price} {nft.currency || "XLM"}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>
                        {nft.sold
                          ? (nft.ownerFull === walletAddress ? "Purchased by You" : "Sold")
                          : "Not listed"}
                      </span>
                    )}
                    <span style={{ color: isDark ? "#64748b" : "#94a3b8", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>{nft.owner}</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <AIPricePredictorMini 
                      nft={nft} 
                      price={nft.price} 
                      currency={nft.currency || "XLM"} 
                    />
                  </div>
                  {/* Buy/List buttons */}
                  {nft.ownerFull === walletAddress ? (
                    nft.sold ? (
                      <div style={{ padding: "10px", textAlign: "center", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: "0.85rem" }}> You sold this NFT</div>
                    ) : !nft.listed ? (
                      <button className="list-btn" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }} 
                        onClick={(e) => { e.stopPropagation(); handleOpenListModal(nft); }}>
                        <Tag size={14} /> List for Sale
                      </button>
                    ) : (
                      <>
                        <button className="list-btn" onClick={(e) => { e.stopPropagation(); handleOpenListModal(nft); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}><Edit2 size={14}/> Edit Price</button>
                        <button className="unlist-btn" onClick={(e) => { e.stopPropagation(); handleUnlist(nft); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}><Trash2 size={14}/> Remove</button>
                      </>
                    )
                  ) : nft.sold ? (
                    <button disabled style={{ width: "100%", padding: "10px", borderRadius: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 600, cursor: "not-allowed" }}> Already Sold</button>
                  ) : nft.listed ? (
                    <button className="buy-btn" onClick={(e) => { e.stopPropagation(); handleBuy(nft); }} disabled={buyingId === nft.id} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                      {buyingId === nft.id ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                          Buying...
                        </span>
                      ) : <><ShoppingCart size={16}/> Buy for {nft.price} {nft.currency || "XLM"}</>}
                    </button>
                  ) : (
                    <button disabled style={{ width: "100%", padding: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", fontWeight: 600, cursor: "not-allowed" }}>Not for Sale</button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Confirm Buy Modal */}
      <AnimatePresence>
        {confirmBuy && (
          <motion.div className="overlay-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.2rem", fontWeight: 700, textAlign: "center" }}>Confirm Purchase</h3>
              <div style={{ padding: "16px", background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)", borderRadius: "12px", marginBottom: "16px", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{confirmBuy.name}</p>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", opacity: 0.6 }}>Seller: {confirmBuy.owner}</p>
                <p style={{ margin: 0, fontSize: "0.6rem", opacity: 0.5, textTransform: "uppercase" }}>Price</p>
                <p style={{ margin: 0, fontWeight: 900, color: "#ec4899", fontSize: "1.1rem" }}>{confirmBuy.price} <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{confirmBuy.currency || "XLM"}</span></p>
              </div>
              <p style={{ fontSize: "0.78rem", opacity: 0.5, textAlign: "center", marginBottom: "20px" }}>
                XLM sent to seller. NFT ownership transfers instantly in Marketplace.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setConfirmBuy(null)} style={{ flex: 1, padding: "12px", background: "transparent", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)", borderRadius: "12px", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={() => { executeBuy(confirmBuy); setConfirmBuy(null); }} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>Confirm & Pay</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successTx && (
          <motion.div className="overlay-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}>Purchase Successful!</h2>
              <p style={{ color: isDark ? "#94a3b8" : "#475569", marginBottom: "16px" }}>
                You bought <strong style={{ color: "#a78bfa" }}>{successTx.nftName}</strong> for <strong style={{ color: "#34d399" }}>{successTx.price} {successTx.currency || "XLM"}</strong>
              </p>
              <p style={{ fontSize: "0.8rem", color: "#34d399", marginBottom: "16px" }}>
                 NFT ownership transferred! Check "My NFTs" tab.
                <br />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                  Note: Gallery updates after blockchain sync (~few minutes)
                </span>
              </p>
              <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "12px", padding: "10px", marginBottom: "20px", wordBreak: "break-all", fontSize: "0.72rem", color: "#8b5cf6" }}>TX: {successTx.hash}</div>
              <div style={{ display: "flex", gap: "12px" }}>
                <a href={`https://stellar.expert/explorer/testnet/tx/${successTx.hash}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "10px", borderRadius: "12px", textAlign: "center", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}>View on Explorer</a>
                <button onClick={() => { setSuccessTx(null); setFilter("mine"); }} style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}>My NFTs →</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Modal */}
      <AnimatePresence>
        {showListModal && selectedNft && (
          <motion.div className="overlay-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <h2 style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>{selectedNft.listed ? "Edit Price" : "List for Sale"}</h2>
              <p style={{ textAlign: "center", color: isDark ? "#94a3b8" : "#475569", marginBottom: "20px" }}>
                <strong style={{ color: selectedNft.isCert ? "#f59e0b" : "#a78bfa" }}>{selectedNft.name}</strong>
              </p>
              <div style={{ marginBottom: "20px" }}>
                  {/* Price Row */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.6, marginBottom: "8px", fontWeight: 700 }}>Price</label>
                      <input type="number" value={listPrice} onChange={e => setListPrice(e.target.value)}
                        style={{ width: "100%", padding: "14px", borderRadius: "14px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: "none", color: "inherit", fontWeight: 800, fontSize: "1.2rem", outline: "none" }} />
                    </div>
                    <div style={{ width: "120px" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.6, marginBottom: "8px", fontWeight: 700 }}>Currency</label>
                      <select value={listCurrency} onChange={e => setListCurrency(e.target.value)}
                        style={{ width: "100%", padding: "14px", borderRadius: "14px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: "none", color: "inherit", fontWeight: 800, fontSize: "1rem", outline: "none", cursor: "pointer", height: "100%" }}>
                        <option value="XLM">XLM</option>
                        <option value="USDC">USDC</option>
                        <option value="AQUA">AQUA</option>
                      </select>
                    </div>
                  </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => { setShowListModal(false); setSelectedNft(null); }} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: isDark ? "#94a3b8" : "#475569", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={confirmListing} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}>
                  {selectedNft.listed ? "Update Price" : "List Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}