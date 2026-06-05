import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  ImagePlus,
  Images,
  Store,
  User,
  Settings,
  Sun,
  Moon,
  LogOut,
  Wallet,
  Tag,
  Briefcase,
  Award,
  LayoutDashboard
} from "lucide-react";

const SettingsModal = ({ isDark, toggleTheme, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          background: isDark ? 'rgba(30, 30, 40, 0.98)' : '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          color: isDark ? '#ffffff' : '#1a1a2e'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: isDark ? '#fff' : '#000', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Theme</span>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '8px',
                background: isDark ? 'rgba(236,72,153,0.2)' : 'rgba(236,72,153,0.1)',
                border: isDark ? '1px solid rgba(236,72,153,0.3)' : '1px solid rgba(236,72,153,0.5)',
                color: isDark ? '#fbcfe8' : '#db2777',
                cursor: 'pointer', fontWeight: 600
              }}
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
              {isDark ? 'Dark' : 'Light'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Network</span>
            <span style={{ color: isDark ? '#f472b6' : '#db2777', background: isDark ? 'rgba(219,39,119,0.15)' : 'rgba(219,39,119,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>Testnet</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Version</span>
            <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>1.0.0</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Sidebar = ({ walletAddress, onDisconnect, isOpen, setIsOpen }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const shortenAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  const links = [
    { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/gallery", icon: <Images size={18} />, label: "Collection" },
    { to: "/mint", icon: <ImagePlus size={18} />, label: "Mint NFT" },
    { to: "/marketplace", icon: <Store size={18} />, label: "Marketplace" },
    { to: "/for-sale", icon: <Tag size={18} />, label: "For Sale" },
    { to: "/my-nfts", icon: <Briefcase size={18} />, label: "My NFTs" },
    { to: "/certificates", icon: <Award size={18} />, label: "Certificates" },
    { to: "/profile", icon: <User size={18} />, label: "Profile" },
  ];

  const handleLogout = () => {
    if (onDisconnect) onDisconnect();
    window.location.href = '/login';
  };

  const themeStyles = {
    sidebarBg: isDark ? "rgba(10, 10, 26, 0.65)" : "rgba(255, 255, 255, 0.65)",
    activeLinkBg: isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(236, 72, 153, 0.08)",
    inactiveLinkColor: isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.55)",
    activeLinkColor: isDark ? "#fff" : "#1a1a2e",
    logoText: isDark ? "#fff" : "#1a1a2e",
    walletBadgeBg: isDark ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.1)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
  };

  const navItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    margin: "4px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    background: isActive ? themeStyles.activeLinkBg : "transparent",
    borderLeft: isActive ? "3px solid #ec4899" : "3px solid transparent",
    color: isActive ? themeStyles.activeLinkColor : themeStyles.inactiveLinkColor,
  });

  const sidebarContent = (
    <div style={{
      width: "240px",
      height: "100vh",
      position: "fixed",
      top: 0, left: 0,
      background: themeStyles.sidebarBg,
      borderRight: `1px solid ${themeStyles.borderColor}`,
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
      backdropFilter: "blur(24px) saturate(160%)",
      boxShadow: isDark ? "10px 0 30px rgba(0,0,0,0.5)" : "10px 0 30px rgba(0,0,0,0.03)"
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
        borderBottom: `1px solid ${themeStyles.borderColor}`,
      }}>
        <div style={{
          width: "36px", height: "36px",
          background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
          borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", flexShrink: 0,
        }}>🎨</div>
        <span style={{
          color: themeStyles.logoText,
          fontSize: "1rem",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.5px",
        }}>NFT Hub</span>
      </div>

      {/* Nav Links */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={() => setIsOpen(false)}
            style={({ isActive }) => navItemStyle(isActive)}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  display: "flex", alignItems: "center",
                  color: isActive ? "#ec4899" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"
                }}>
                  {link.icon}
                </span>
                <span style={{ flex: 1 }}>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ margin: "16px 20px", borderTop: `1px solid ${themeStyles.borderColor}` }} />

        {/* Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 20px", margin: "4px 12px", width: "calc(100% - 24px)",
            borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem",
            background: "transparent", border: "none",
            borderLeft: "3px solid transparent",
            color: themeStyles.inactiveLinkColor, cursor: "pointer", textAlign: "left"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
            <Settings size={18} />
          </span>
          Settings
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 20px", margin: "4px 12px", width: "calc(100% - 24px)",
            borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem",
            background: "transparent", border: "none",
            borderLeft: "3px solid transparent",
            color: themeStyles.inactiveLinkColor, cursor: "pointer", textAlign: "left"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Wallet + Logout */}
      <div style={{ padding: "20px 16px", borderTop: `1px solid ${themeStyles.borderColor}`, display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          onClick={() => {
            navigator.clipboard.writeText(walletAddress);
            const el = document.getElementById("wallet-copy-hint");
            if (el) { el.style.display = "block"; setTimeout(() => { el.style.display = "none"; }, 1500); }
          }}
          title="Click to copy wallet address"
          style={{
            background: themeStyles.walletBadgeBg, padding: "12px", borderRadius: "12px",
            display: "flex", alignItems: "center", gap: "10px",
            border: `1px solid ${isDark ? 'rgba(236,72,153,0.2)' : 'rgba(236,72,153,0.3)'}`,
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(236,72,153,0.6)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? "rgba(236,72,153,0.2)" : "rgba(236,72,153,0.3)"}
        >
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
          <span style={{ color: themeStyles.activeLinkColor, fontSize: "0.85rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
            <Wallet size={14} />
            {shortenAddress(walletAddress)}
          </span>
          <span style={{ fontSize: "0.7rem", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>📋</span>
        </div>

        <div id="wallet-copy-hint" style={{ display: "none", textAlign: "center", fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
           Copied!
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "12px",
            background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
            border: isDark ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            isDark={isDark}
            toggleTheme={toggleTheme}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 45, backdropFilter: "blur(4px)" }}
              className="md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ zIndex: 50, position: "fixed", top: 0, left: 0 }}
              className="md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) { .md\\:block { display: block !important; } .md\\:hidden { display: none !important; } }
        @media (max-width: 767px) { .hidden { display: none; } }
      `}</style>
    </>
  );

};

export default Sidebar;