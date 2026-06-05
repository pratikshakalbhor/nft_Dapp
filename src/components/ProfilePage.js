import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWallet } from "../WalletContext";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { 
  Copy, 
  Check, 
  Wallet, 
  LayoutGrid, 
  History, 
  CreditCard, 
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  Briefcase,
  ExternalLink
} from "lucide-react";
import { shortenAddress } from "../utils";
import { motion } from "framer-motion";
import { ESCROW_CONTRACT_ID, SOROBAN_SERVER, NETWORK_PASSPHRASE } from "../constants";
import * as StellarSdk from "@stellar/stellar-sdk";


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

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const avatar = generateAvatar(walletAddress);

  useEffect(() => {
    if (!walletAddress) return;

    // 1. Get Balance
    if (account) {
      const native = account.balances.find(b => b.asset_type === "native");
      if (native) setXlmBalance(parseFloat(native.balance).toFixed(2));
    }

    // 2. Fetch Firebase History
    const marketRef = ref(db, "marketplace");
    const unsubscribe = onValue(marketRef, (snap) => {
      const data = snap.val() || {};
      const history = [];
      let sCount = 0;
      let pCount = 0;

      Object.values(data).forEach(item => {
        // Sold items
        if (item.sold && item.previousOwner === walletAddress) {
          sCount++;
          history.push({ ...item, actionType: "sold", date: item.soldAt });
        }
        // Purchased items
        if (item.sold && item.ownerFull === walletAddress) {
          pCount++;
          history.push({ ...item, actionType: "bought", date: item.soldAt });
        }
      });

      setSoldCount(sCount);
      setPurchasedCount(pCount);
      setMarketHistory(history.sort((a, b) => b.date - a.date));
    });

    return () => unsubscribe();
  }, [walletAddress, account]);

  useEffect(() => {
    if (!walletAddress) return;
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const dummy = new StellarSdk.Account(walletAddress, "0");
        const totalTx = new StellarSdk.TransactionBuilder(dummy, {
          fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(StellarSdk.Operation.invokeContractFunction({
            contract: ESCROW_CONTRACT_ID,
            function: "get_total",
            args: [],
          }))
          .setTimeout(30).build();
        const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
        if (!totalSim?.result?.retval) { setJobs([]); return; }
        const total = Number(StellarSdk.scValToNative(totalSim.result.retval));
        
        const jobPromises = Array.from({ length: total }, (_, i) => {
          const id = i + 1;
          return (async () => {
            try {
              const jobTx = new StellarSdk.TransactionBuilder(dummy, {
                fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
              })
                .addOperation(StellarSdk.Operation.invokeContractFunction({
                  contract: ESCROW_CONTRACT_ID,
                  function: "get_job",
                  args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
                }))
                .setTimeout(30).build();
              const sim = await SOROBAN_SERVER.simulateTransaction(jobTx);
              if (sim?.result?.retval) {
                const job = StellarSdk.scValToNative(sim.result.retval);
                return { ...job, id };
              }
              return null;
            } catch { return null; }
          })();
        });
        const results = (await Promise.all(jobPromises)).filter(Boolean);
        setJobs(results);
      } catch (e) {
        console.error("Jobs load error:", e);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, [walletAddress]);

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

  const getStatusKey = (s) => {
    if (!s) return "Open";
    if (typeof s === "string") return s;
    if (typeof s === "object") return Object.keys(s)[0];
    return "Open";
  };

  const STATUS_COLORS = {
    Open: "#60a5fa",
    InProgress: "#facc15",
    Submitted: "#fb923c",
    Completed: "#34d399",
    Cancelled: "#f87171",
  };

  const myPostedJobs = jobs.filter(j => String(j.client) === walletAddress);
  const myFreelanceJobs = jobs.filter(j => String(j.freelancer) === walletAddress && String(j.freelancer) !== String(j.client));
  const completedJobs = jobs.filter(j => getStatusKey(j.status) === "Completed" && (String(j.client) === walletAddress || String(j.freelancer) === walletAddress));
  
  const reputationScore = Math.min(100, completedJobs.length * 20 + (propNfts?.length || 0) * 5);

  const certificates = propNfts?.filter(n => n.name?.toLowerCase().includes("certificate") || n.name?.toLowerCase().includes("job cert")) || [];
  const regularNFTs = propNfts?.filter(n => !n.name?.toLowerCase().includes("certificate") && !n.name?.toLowerCase().includes("job cert")) || [];

  if (!walletAddress) return <div style={{ padding: "40px", textAlign: "center" }}>Please connect wallet</div>;

  return (
    <motion.div 
      className="main-content" 
      style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", color: isDark ? "#e2e8f0" : "#1e293b" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* Avatar Section */}
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
        <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: isDark ? "#a78bfa" : "#6366f1" }}>
          {walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}
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
            transition: "all 0.2s"
          }}
        >
          <ExternalLink size={12} />
          View on Stellar Explorer
        </a>
      </div>

      {/* Header Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: isDark ? "#fff" : "#0f172a" }}>Profile</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: isDark ? "rgba(99, 102, 241, 0.1)" : "#eff6ff",
            color: isDark ? "#818cf8" : "#3b82f6",
            padding: "6px 12px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <Wallet size={16} />
            {shortenAddress(walletAddress)}
          </div>
          <button 
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: isDark ? "#cbd5e1" : "#64748b",
              display: "flex",
              alignItems: "center"
            }}
            title="Copy Address"
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px", 
        marginBottom: "40px" 
      }}>
        {/* Balance */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(99, 102, 241, 0.15)" : "#eff6ff",
            color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <CreditCard size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {xlmBalance}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            XLM Balance
          </div>
        </div>

        {/* Owned */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
            color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <ImageIcon size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {propNfts ? propNfts.length : 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Owned
          </div>
        </div>

        {/* Sold */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
            color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <Tag size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {soldCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Sold
          </div>
        </div>

        {/* Purchased */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(236, 72, 153, 0.15)" : "#fdf2f8",
            color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <ShoppingBag size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {purchasedCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Purchased
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={tabButtonStyle("overview")} onClick={() => setActiveTab("overview")}>
            <LayoutGrid size={16} /> Overview
          </button>
          <button style={tabButtonStyle("nfts")} onClick={() => setActiveTab("nfts")}>
            <ImageIcon size={16} /> My NFTs
          </button>
          <button style={tabButtonStyle("history")} onClick={() => setActiveTab("history")}>
            <History size={16} /> History
          </button>
          <button style={tabButtonStyle("jobs")} onClick={() => setActiveTab("jobs")}>
            <Briefcase size={16} /> Jobs
          </button>
        </div>
      </motion.div>

      {/* Tab Content */}
      <div style={{ minHeight: "300px" }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <motion.div variants={itemVariants} style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
            <h3 style={{ color: isDark ? "#fff" : "#0f172a", marginTop: 0 }}>Wallet Details</h3>
            <div style={{ 
              background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
              padding: "20px", 
              borderRadius: "12px", 
              border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0" 
            }}>
              <p style={{ margin: "0 0 10px" }}><strong>Network:</strong> Testnet</p>
              <p style={{ margin: "0 0 10px" }}><strong>Sequence Number:</strong> {account?.sequence || "Loading..."}</p>
              <p style={{ margin: 0 }}><strong>Subentry Count:</strong> {account?.subentry_count || 0}</p>
            </div>

            {/* Reputation Score */}
            <div style={{
              marginTop: "20px",
              background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
              padding: "20px", borderRadius: "12px",
              border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontWeight: 700, color: isDark ? "#fff" : "#0f172a" }}>Reputation Score</span>
                <span style={{ fontWeight: 800, color: "#f59e0b", fontSize: "1.1rem" }}>{reputationScore}/100</span>
              </div>
              <div style={{ height: "8px", borderRadius: "4px", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${reputationScore}%`, background: "linear-gradient(90deg, #f59e0b, #d97706)", borderRadius: "4px", transition: "width 1s ease" }} />
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                  {completedJobs.length} jobs completed
                </span>
                <span style={{ fontSize: "0.78rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                  {propNfts?.length || 0} NFTs owned
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* MY NFTS TAB */}
        {activeTab === "nfts" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            
            {/* Certificates */}
            {certificates.length > 0 && (
              <div style={{ gridColumn: "1/-1", marginBottom: "16px" }}>
                <h4 style={{ color: "#f59e0b", marginBottom: "12px", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Certificates ({certificates.length})
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                  {certificates.map((nft, i) => (
                    <div key={i} style={{
                      background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.05)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "12px", padding: "16px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🏆</div>
                      <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.85rem" }}>{nft.name}</div>
                      <div style={{ fontSize: "0.7rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: "4px" }}>Stellar Blockchain</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular NFTs */}
            {regularNFTs.length > 0 ? (
              regularNFTs.map((nft) => (
                <motion.div key={nft.id} variants={itemVariants} style={{ 
                  background: isDark ? "rgba(30, 41, 59, 0.4)" : "#fff",
                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  transition: "transform 0.2s",
                }}>
                  <div style={{ 
                    height: "200px", 
                    background: isDark ? "#0f172a" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                    fontSize: "3rem"
                  }}>
                    {nft.image ? (
                        <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "🖼️"}
                  </div>
                  <div style={{ padding: "16px" }}>
                    <h4 style={{ margin: "0 0 4px", color: isDark ? "#fff" : "#0f172a", fontSize: "1rem" }}>{nft.name || `NFT #${nft.id}`}</h4>
                    <span style={{ fontSize: "0.75rem", color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      ID: {nft.id.toString().slice(0,8)}...
                    </span>
                  </div>
                </motion.div>
              ))
            ) : certificates.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", opacity: 0.6 }}>
                No NFTs found in this wallet.
              </div>
            ) : null}
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {marketHistory.length > 0 ? (
              marketHistory.map((item, i) => (
                <motion.div key={i} variants={itemVariants} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "16px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                  border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
                  borderRadius: "12px"
                }}>
                  <div style={{ 
                    padding: "10px", 
                    borderRadius: "50%", 
                    background: item.actionType === "bought" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: item.actionType === "bought" ? "#10b981" : "#f59e0b",
                    marginRight: "16px"
                  }}>
                    {item.actionType === "bought" ? <ShoppingBag size={20} /> : <Tag size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
                      {item.actionType === "bought" ? "Purchased NFT" : "Sold NFT"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                      {item.name} for <strong>{item.price} XLM</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: isDark ? "#64748b" : "#94a3b8" }}>
                    {new Date(item.soldAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                No transaction history found.
              </div>
            )}
          </motion.div>
        )}

        {/* JOBS TAB */}
        {activeTab === "jobs" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {loadingJobs ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Loading jobs...</div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
                  {[
                    { label: "Jobs Posted", value: myPostedJobs.length, color: "#60a5fa" },
                    { label: "Jobs Accepted", value: myFreelanceJobs.length, color: "#a78bfa" },
                    { label: "Completed", value: completedJobs.length, color: "#34d399" },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "12px", padding: "16px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Job list */}
                {jobs.filter(j => String(j.client) === walletAddress || String(j.freelancer) === walletAddress).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>No jobs yet.</div>
                ) : (
                  jobs
                    .filter(j => String(j.client) === walletAddress || String(j.freelancer) === walletAddress)
                    .slice(0, 10)
                    .map(job => {
                      const sk = getStatusKey(job.status);
                      const statusColor = STATUS_COLORS[sk] || "#60a5fa";
                      const isClient = String(job.client) === walletAddress;
                      return (
                        <div key={job.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "14px 16px", marginBottom: "10px",
                          background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                          border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
                          borderRadius: "12px",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, color: isDark ? "#fff" : "#0f172a", fontSize: "0.9rem" }}>{job.title}</div>
                            <div style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: "2px" }}>
                              {isClient ? "Posted by you" : "Accepted by you"} • Job #{job.id}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: statusColor, background: `${statusColor}20`, padding: "3px 10px", borderRadius: "20px", marginBottom: "4px" }}>{sk}</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>
                              {(Number(job.amount) / 10_000_000).toFixed(1)} XLM
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ── Exported Icons (used by MintPage, PaymentPage) ──────────────────────────
export const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export const CopyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const XLMIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default ProfilePage;
