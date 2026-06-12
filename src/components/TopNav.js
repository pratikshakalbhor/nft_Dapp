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
  Tag as TagIcon,
  Briefcase,
  LayoutDashboard,
  Menu,
  X,
  MessageSquare
} from "lucide-react";
import NotificationPanel from "./NotificationPanel";

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
        zIndex: 1000,
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
          background: isDark ? 'rgba(30,30,40,0.98)' : '#ffffff',
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
        </div>
      </motion.div>
    </motion.div>
  );
};

const TopNav = ({ walletAddress, onDisconnect }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const shortenAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  const links = [
    { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/gallery", icon: <Images size={18} />, label: "Collection" },
    { to: "/mint", icon: <ImagePlus size={18} />, label: "Mint" },
    { to: "/marketplace", icon: <Store size={18} />, label: "Market" },
    { to: "/for-sale", icon: <TagIcon size={18} />, label: "Sales" },
    { to: "/my-nfts", icon: <Briefcase size={18} />, label: "Inventory" },
    { to: "/profile", icon: <User size={18} />, label: "Profile" },
    { to: "/chat", icon: <MessageSquare size={18} />, label: "Chat" },
  ];

  const handleLogout = () => {
    if (onDisconnect) onDisconnect();
    window.location.href = '/login';
  };

  const navItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    transition: "all 0.2s ease",
    background: isActive ? (isDark ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.1)") : "transparent",
    color: isActive ? (isDark ? "#fff" : "#be185d") : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"),
  });

  return (
    <>
      <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: "64px",
        background: isDark ? "rgba(10, 10, 26, 0.8)" : "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px) saturate(160%)",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: isDark ? "0 4px 30px rgba(0,0,0,0.3)" : "0 4px 30px rgba(0,0,0,0.03)"
      }}>
        {/* Left: Logo */}
        <NavLink to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
          }}>🎨</div>
          <span style={{
            color: isDark ? "#fff" : "#1a1a2e",
            fontSize: "1.1rem",
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>NFT Hub</span>
        </NavLink>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }} className="desktop-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} style={({ isActive }) => ({
              ...navItemStyle(isActive),
              padding: "8px 12px",
              position: "relative"
            })}>
              {({ isActive }) => (
                <>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span style={{ 
                      color: isActive ? "#ec4899" : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" 
                    }}>
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="navTab"
                      style={{
                        position: "absolute",
                        bottom: "-4px",
                        left: "12px",
                        right: "12px",
                        height: "2px",
                        background: "linear-gradient(90deg, #ec4899, #8b5cf6)",
                        borderRadius: "2px",
                        boxShadow: "0 2px 10px rgba(236, 72, 153, 0.4)"
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <NotificationPanel walletAddress={walletAddress} />
            
            <button onClick={() => setIsSettingsOpen(true)} style={{ background: "transparent", border: "none", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", cursor: "pointer", display: "flex" }}>
               <Settings size={20} />
            </button>

            <div style={{
              background: isDark ? "rgba(236,72,153,0.1)" : "rgba(236,72,153,0.05)",
              padding: "6px 12px",
              borderRadius: "10px",
              border: `1px solid ${isDark ? "rgba(236,72,153,0.2)" : "rgba(236,72,153,0.2)"}`,
              fontSize: "0.75rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: isDark ? "#f472b6" : "#be185d",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              {shortenAddress(walletAddress)}
            </div>

            <button onClick={handleLogout} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", padding: "8px", borderRadius: "8px", cursor: "pointer" }}>
               <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ 
              background: "transparent", border: "none", 
              color: isDark ? "#fff" : "#000", cursor: "pointer",
              display: "none"
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed",
              top: "64px", left: 0, right: 0,
              background: isDark ? "#0a0a1a" : "#fff",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              padding: "16px",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
            }}
          >
            {links.map((link) => (
              <NavLink 
                key={link.to} 
                to={link.to} 
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  ...navItemStyle(isActive),
                  fontSize: "1rem",
                  padding: "12px 16px"
                })}
              >
                <span style={{ marginRight: "12px" }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
            <div style={{ borderTop: "1px solid rgba(128,128,128,0.2)", marginTop: "8px", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <div style={{ display: "flex", gap: "16px" }}>
                  <button onClick={toggleTheme} style={{ background: "transparent", border: "none", color: isDark ? "#fff" : "#000" }}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
                  <button onClick={() => setIsSettingsOpen(true)} style={{ background: "transparent", border: "none", color: isDark ? "#fff" : "#000" }}><Settings size={20} /></button>
               </div>
               <button onClick={handleLogout} style={{ color: "#ef4444", fontWeight: 700, background: "transparent", border: "none" }}>Logout</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal isDark={isDark} toggleTheme={toggleTheme} onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 992px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default TopNav;
