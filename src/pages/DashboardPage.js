import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL, CONTRACT_ID } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { Wallet, ImagePlus, ShoppingBag, Zap, Images, Plus, ArrowUpRight } from "lucide-react";

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-5)}`;
};

const getTxType = (tx) => {
  try {
    const envelope = StellarSdk.TransactionBuilder.fromXDR(
      tx.envelope_xdr, "Test SDF Network ; September 2015"
    );
    const op = envelope.operations?.[0];
    if (op?.type === "invokeHostFunction") {
      const xdr = op.func?.toXDR?.("base64") || "";
      if (xdr.includes(CONTRACT_ID.slice(0, 8))) {
        return { icon: <ShoppingBag size={18} />, label: "NFT Action", color: "rgba(236,72,153,0.15)", text: "#f472b6" };
      }
    }
  } catch { }
  return { icon: <Zap size={18} />, label: "Transaction", color: "rgba(236,72,153,0.1)", text: "#f472b6" };
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
        setRecentTxs(records.slice(0, 3));
      } catch (e) {
        console.error("NFT Dashboard tx error:", e);
      } finally {
        setTxLoading(false);
      }
    };
    fetchTxs();
  }, [walletAddress]);

  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
    borderRadius: "24px", padding: "28px",
    boxShadow: isDark ? "none" : "0 10px 40px rgba(236,72,153,0.05)",
    backdropFilter: "blur(12px)"
  };

  const StatCard = ({ icon, label, value, color, delay }) => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
      style={{
        ...cardStyle,
        display: "flex", flexDirection: "column", gap: "12px", flex: "1 1 200px",
        background: `linear-gradient(135deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)'}, ${color})`
      }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#ec4899", boxShadow: "0 4px 12px rgba(236,72,153,0.2)" }}>
        {icon}
      </div>
      <div>
        <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "0.85rem", fontWeight: 600 }}>{label}</div>
        <div style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.8rem", fontWeight: 900, marginTop: "4px" }}>{value}</div>
      </div>
    </motion.div>
  );

  const stats = [
    { icon: <Images size={24} />, label: "Collection Size", value: nfts?.length || 0, color: "rgba(236,72,153,0.05)", delay: 0 },
    { icon: <Wallet size={24} />, label: "Wallet Balance", value: `${balance} XLM`, color: "rgba(139,92,246,0.05)", delay: 0.1 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>

      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: isDark ? "#fff" : "#1a1a2e", letterSpacing: "-1px" }}>Collector Hub</h1>
        <p style={{ opacity: 0.6, fontSize: "1.1rem" }}>Managing assets for {shortenAddr(walletAddress)}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "40px" }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
        
        <motion.div whileHover={{ scale: 1.02 }} onClick={() => navigate("/mint")}
          style={{ ...cardStyle, flex: "1 1 300px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", color: "#fff", border: "none" }}>
          <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "50%" }}><Plus size={32} /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.3rem" }}>Mint New NFT</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>Digitalize your creation</div>
          </div>
        </motion.div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
        
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "24px" }}>Quick Explore</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div onClick={() => navigate("/marketplace")} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: "16px", cursor: "pointer", border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
              <div style={{ color: "#ec4899" }}><ShoppingBag /></div>
              <div style={{ flex: 1, fontWeight: 700 }}>NFT Marketplace</div>
              <ArrowUpRight size={18} opacity={0.5} />
            </div>
            <div onClick={() => navigate("/gallery")} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: "16px", cursor: "pointer", border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
              <div style={{ color: "#8b5cf6" }}><Images /></div>
              <div style={{ flex: 1, fontWeight: 700 }}>View Collection</div>
              <ArrowUpRight size={18} opacity={0.5} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "24px" }}>Recent Activity</h2>
          {txLoading ? (
            <div style={{ textAlign: "center", opacity: 0.5, padding: "20px" }}>Fetching...</div>
          ) : recentTxs.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.5, padding: "20px" }}>No recent NFT steps.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentTxs.map(tx => {
                const type = getTxType(tx);
                return (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                    <div style={{ color: "#ec4899" }}>{type.icon}</div>
                    <div style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600 }}>{type.label}</div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>{shortenAddr(tx.hash)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}