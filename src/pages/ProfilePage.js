import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWallet } from "../context/WalletContext";
import { ref, onValue } from "firebase/database";
import { db } from "../services/firebase";
import { 
  Wallet, 
  LayoutGrid, 
  History, 
  CreditCard, 
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { shortenAddress } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const generateAvatar = (address) => {
  if (!address) return { color: "#6366f1", initials: "??" };
  const colors = ["#6366f1","#8b5cf6","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444"];
  const idx = address.charCodeAt(2) % colors.length;
  return {
    color: colors[idx],
    initials: address.slice(0, 2).toUpperCase()
  };
};

const ProfilePage = ({ account, nfts: propNfts }) => {
  const { isDark } = useTheme();
  const { walletAddress } = useWallet();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [soldCount, setSoldCount] = useState(0);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [marketHistory, setMarketHistory] = useState([]);
  const [xlmBalance, setXlmBalance] = useState("0");
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const avatar = generateAvatar(walletAddress);

  useEffect(() => {
    if (!walletAddress) return;

    if (account) {
      const native = account.balances.find(b => b.asset_type === "native");
      if (native) setXlmBalance(parseFloat(native.balance).toFixed(2));
    }

    const marketRef = ref(db, "marketplace");
    const unsubscribe = onValue(marketRef, (snap) => {
      const data = snap.val() || {};
      const history = [];
      let sCount = 0;
      let pCount = 0;
      let earnings = 0;

      Object.values(data).forEach(item => {
        if (item.sold && item.previousOwner === walletAddress) {
          sCount++;
          earnings += parseFloat(item.price || 0);
          history.push({ ...item, actionType: "sold", date: item.soldAt });
        }
        if (item.sold && item.ownerFull === walletAddress) {
          pCount++;
          history.push({ ...item, actionType: "bought", date: item.soldAt });
        }
      });

      setTotalEarnings(earnings);
      setSoldCount(sCount);
      setPurchasedCount(pCount);
      setMarketHistory(history.sort((a, b) => b.date - a.date));
    });

    const followerRef = ref(db, `followers/${walletAddress}`);
    const followingRef = ref(db, `following/${walletAddress}`);
    
    const unsubFollowers = onValue(followerRef, (snap) => {
      setFollowersCount(snap.val() ? Object.keys(snap.val()).length : 0);
    });
    
    const unsubFollowing = onValue(followingRef, (snap) => {
      setFollowingCount(snap.val() ? Object.keys(snap.val()).length : 0);
    });

    return () => { unsubscribe(); unsubFollowers(); unsubFollowing(); };
  }, [walletAddress, account]);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabButtonStyle = (key) => ({
    padding: "10px 24px",
    background: "transparent",
    border: "none",
    borderBottom: activeTab === key 
      ? `2px solid ${isDark ? "#a78bfa" : "#6366f1"}` 
      : "2px solid transparent",
    color: activeTab === key 
      ? (isDark ? "#fff" : "#0f172a") 
      : (isDark ? "#64748b" : "#94a3b8"),
    fontWeight: activeTab === key ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s",
  });

  const statCardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    padding: "20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "120px",
  };

  if (!walletAddress) return <div style={{ padding: "40px", textAlign: "center" }}>Please connect wallet</div>;

  return (
    <motion.div 
      className="main-content" 
      style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", color: isDark ? "#e2e8f0" : "#1e293b" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${avatar.color}, ${avatar.color}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", fontWeight: 800, color: "#fff",
          boxShadow: `0 8px 24px ${avatar.color}44`,
          margin: "0 auto 12px",
        }}>
          {avatar.initials}
        </div>
        <div 
          onClick={handleCopy}
          style={{ 
            fontFamily: "monospace", 
            fontSize: "0.85rem", 
            color: isDark ? "#a78bfa" : "#6366f1", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "6px",
            cursor: "pointer",
            position: "relative"
          }}
        >
          {shortenAddress(walletAddress)}
          <ShieldCheck size={14} color="#3b82f6" fill="rgba(59, 130, 246, 0.1)" />
          {copied && (
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ position: "absolute", top: "-20px", fontSize: "0.7rem", background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}
            >
              Copied!
            </motion.span>
          )}
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px", fontSize: "0.9rem", fontWeight: 700 }}>
           <div><span style={{ color: isDark ? "#fff" : "#000" }}>{followersCount}</span> <span style={{ opacity: 0.5 }}>Followers</span></div>
           <div><span style={{ color: isDark ? "#fff" : "#000" }}>{followingCount}</span> <span style={{ opacity: 0.5 }}>Following</span></div>
        </div>
        <a 
          href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
          target="_blank" rel="noopener noreferrer"
          style={{ 
            fontSize: "0.72rem", 
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", 
            textDecoration: "none", 
            display: "inline-flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "6px", 
            marginTop: "10px",
            padding: "5px 12px",
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            borderRadius: "20px",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <ExternalLink size={12} /> View on Explorer
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {[
          { label: "NFTs Owned", value: propNfts?.length || 0, icon: <ImageIcon size={20} />, color: "#8b5cf6" },
          { label: "Purchased", value: purchasedCount, icon: <ShoppingBag size={20} />, color: "#3b82f6" },
          { label: "Total Sold", value: soldCount, icon: <Tag size={20} />, color: "#ec4899" },
          { label: "Earnings", value: `${totalEarnings} XLM`, icon: <TrendingUp size={20} />, color: "#10b981" },
          { label: "Balance", value: `${xlmBalance} XLM`, icon: <Wallet size={20} />, color: "#f59e0b" },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} style={statCardStyle}>
            <div style={{ color: stat.color, marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "24px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", marginBottom: "24px" }}>
        <button onClick={() => setActiveTab("overview")} style={tabButtonStyle("overview")}><LayoutGrid size={18} /> Overview</button>
        <button onClick={() => setActiveTab("history")} style={tabButtonStyle("history")}><History size={18} /> Activity</button>
        <button onClick={() => setActiveTab("wallet")} style={tabButtonStyle("wallet")}><CreditCard size={18} /> Wallet</button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h3 style={{ marginBottom: "16px", fontSize: "1.1rem", fontWeight: 700 }}>Featured Assets</h3>
            {propNfts?.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                No NFTs found in your wallet.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                {propNfts.map((nft, i) => (
                  <motion.div 
                    key={i} 
                    style={{ 
                      borderRadius: "16px", overflow: "hidden", 
                      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)"
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div style={{ aspectRatio: "1/1", overflow: "hidden" }}>
                      <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "12px" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{nft.name}</div>
                      <div style={{ fontSize: "0.7rem", opacity: 0.5 }}># {nft.id}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {marketHistory.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", opacity: 0.5 }}>No recent activity.</div>
            ) : (
              marketHistory.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ 
                      width: "40px", height: "40px", borderRadius: "10px", 
                      background: h.actionType === "sold" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                      color: h.actionType === "sold" ? "#10b981" : "#3b82f6",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {h.actionType === "sold" ? <ShoppingBag size={20} /> : <Tag size={20} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>{h.name}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{h.actionType === "sold" ? "Sold" : "Purchased"} • {new Date(h.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: h.actionType === "sold" ? "#10b981" : "inherit" }}>{h.actionType === "sold" ? "+" : "-"}{h.price} XLM</div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>Confirmed</div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "wallet" && (
          <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "24px", padding: "32px", color: "#fff", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "rgba(255,255,255,0.1)", borderRadius: "50%" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                   <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "8px" }}>Total Balance</div>
                   <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{xlmBalance} XLM</div>
                   <div style={{ marginTop: "24px", fontSize: "0.8rem", letterSpacing: "1px", opacity: 0.7 }}>{walletAddress}</div>
                </div>
             </div>
             <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <button style={{ padding: "16px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: "none", color: "inherit", fontWeight: 700, cursor: "not-allowed" }}>Send (Coming Soon)</button>
                <button style={{ padding: "16px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: "none", color: "inherit", fontWeight: 700, cursor: "not-allowed" }}>Receive (Coming Soon)</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProfilePage;
