import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { 
  ShoppingBag, 
  Zap, 
  Images, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  Award, 
  Activity,
  ChevronRight
} from "lucide-react";

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-5)}`;
};

const getTxType = (tx) => {
  try {
    const envelope = StellarSdk.TransactionBuilder.fromXDR(
      tx.envelope_xdr, StellarSdk.Networks.TESTNET
    );
    const op = envelope.operations?.[0];
    if (op?.type === "invokeHostFunction") {
      return { icon: <ShoppingBag size={16} />, label: "Marketplace Action", color: "#ec4899" };
    }
  } catch { }
  return { icon: <Zap size={16} />, label: "Network Transfer", color: "#6366f1" };
};

export default function DashboardPage({ walletAddress, balance, nfts }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [recentTxs, setRecentTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    const fetchTxs = async () => {
      try {
        setTxLoading(true);
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const { records } = await server.transactions()
          .forAccount(walletAddress).limit(5).order("desc").call();
        setRecentTxs(records);
      } catch (e) {
        console.error("Dashboard tx error:", e);
      } finally {
        setTxLoading(false);
      }
    };
    fetchTxs();
  }, [walletAddress]);

  const glassStyle = {
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px) saturate(160%)",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.05)",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.05)",
  };

  const stats = [
    { 
        icon: <Images size={20} />, 
        label: "Total Assets", 
        value: nfts?.length || 0, 
        color: "#8b5cf6",
        sub: "NFTs in wallet"
    },
    { 
        icon: <TrendingUp size={20} />, 
        label: "Wallet Value", 
        value: `${balance} XLM`, 
        color: "#10b981",
        sub: "Available balance"
    },
    { 
        icon: <Award size={20} />, 
        label: "Certificates", 
        value: nfts?.filter(n => n.isCert).length || 0, 
        color: "#f59e0b",
        sub: "Verified credentials"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: "2.5rem" }}>
        <h4 style={{ color: "#ec4899", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.8rem", marginBottom: "8px" }}>
          Dashboard Overview
        </h4>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "8px", background: "linear-gradient(90deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Welcome, Collector
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.7 }}>
          <Activity size={16} />
          <span>Active Session for {shortenAddr(walletAddress)}</span>
        </div>
      </motion.div>

      {/* Stats Cluster */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "2.5rem" }}>
        {stats.map((stat, i) => (
          <motion.div key={i} variants={itemVariants} style={{ ...glassStyle, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "100px", height: "100px", background: `${stat.color}15`, borderRadius: "50%", filter: "blur(20px)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ padding: "12px", background: `${stat.color}20`, color: stat.color, borderRadius: "16px" }}>
                {stat.icon}
              </div>
              <ArrowUpRight size={20} style={{ opacity: 0.3 }} />
            </div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.9rem", fontWeight: 600 }}>{stat.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, margin: "4px 0" }}>{stat.value}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        
        {/* Quick Actions */}
        <motion.div variants={itemVariants} style={glassStyle}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                Quick Actions
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button onClick={() => navigate("/mint")} style={{ 
                    padding: "20px", borderRadius: "20px", border: "none", 
                    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                    color: "#fff", cursor: "pointer", textAlign: "left",
                    transition: "transform 0.2s"
                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <Plus size={24} style={{ marginBottom: "12px" }} />
                    <div style={{ fontWeight: 800 }}>Mint NFT</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Create new asset</div>
                </button>
                <button onClick={() => navigate("/marketplace")} style={{ 
                    padding: "20px", borderRadius: "20px", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", 
                    background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                    color: isDark ? "#fff" : "#1a1a2e", cursor: "pointer", textAlign: "left",
                    transition: "transform 0.2s"
                }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <ShoppingBag size={24} style={{ marginBottom: "12px", color: "#ec4899" }} />
                    <div style={{ fontWeight: 800 }}>Marketplace</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Browse all NFTs</div>
                </button>
            </div>
            
            <div onClick={() => navigate("/gallery")} style={{ 
                marginTop: "16px", padding: "16px", borderRadius: "16px",
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                display: "flex", alignItems: "center", gap: "16px", cursor: "pointer"
            }}>
                <Images style={{ color: "#8b5cf6" }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>View Your Gallery</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Manage your collected pieces</div>
                </div>
                <ChevronRight size={18} />
            </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} style={glassStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Recent Activity</h3>
                <Activity size={20} style={{ opacity: 0.3 }} />
            </div>
            {txLoading ? (
                <div style={{ padding: "40px", textAlign: "center", opacity: 0.5 }}>Syncing with blockchain...</div>
            ) : recentTxs.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", opacity: 0.5 }}>No recent transactions found.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {recentTxs.map(tx => {
                        const type = getTxType(tx);
                        return (
                            <div key={tx.id} style={{ 
                                padding: "12px", borderRadius: "16px", 
                                background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
                                display: "flex", alignItems: "center", gap: "12px"
                            }}>
                                <div style={{ color: type.color }}>{type.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{type.label}</div>
                                    <div style={{ fontSize: "0.65rem", opacity: 0.5, fontFamily: "monospace" }}>{tx.id.slice(0, 16)}...</div>
                                </div>
                                <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                                    {new Date(tx.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>

      </div>
    </motion.div>
  );
}