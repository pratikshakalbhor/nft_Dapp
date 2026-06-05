import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { getNotifications, markAllAsRead } from "../utils/notificationService";
import { useTheme } from "../context/ThemeContext";

const NotificationPanel = ({ walletAddress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();


  useEffect(() => {
    if (!walletAddress) return;
    const unsubscribe = getNotifications(walletAddress, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [walletAddress]);


  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      await markAllAsRead(walletAddress, notifications);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell Icon */}
      <div
        onClick={handleOpen}
        style={{
          width: "38px", height: "38px",
          background: isOpen ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: "18px",
          transition: "all 0.2s",
          position: "relative",
        }}
        title="Notifications"
      >
        <Bell size={18} strokeWidth={2} color="#a78bfa" />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "-6px", right: "-6px",
            background: "#ef4444",
            color: "white",
            fontSize: "0.65rem",
            fontWeight: 700,
            minWidth: "18px", height: "18px",
            borderRadius: "9px",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
            border: "2px solid rgba(13,17,28,0.9)",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "48px", right: 0,
          width: "340px",
          background: isDark ? "rgba(13,17,28,0.98)" : "rgba(255,255,255,0.98)",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)",
          zIndex: 1000,
          overflow: "hidden",
          maxHeight: "400px",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: isDark ? "#fff" : "#1a1a2e" }}>
               Notifications
            </h3>
            {unreadCount > 0 && (
              <span style={{
                fontSize: "0.75rem",
                background: "rgba(99,102,241,0.2)",
                color: "#a78bfa",
                padding: "2px 8px",
                borderRadius: "20px",
                fontWeight: 600,
              }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                fontSize: "0.9rem",
              }}>
                No notifications yet 🎉
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    navigate("/chat", {
                      state: {
                        autoOpenJobId: notif.jobId,
                        senderAddress: notif.from
                      }
                    });
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "14px 20px",
                    borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    background: notif.read
                      ? "transparent"
                      : isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
                    transition: "background 0.2s",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? "transparent" : isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)"}
                >
                  {/* Avatar */}
                  <div style={{
                    width: "36px", height: "36px",
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px", flexShrink: 0,
                  }}>💬</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Job title */}
                    <p style={{
                      margin: "0 0 2px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#a78bfa",
                    }}>
                      {notif.jobTitle}
                    </p>
                    {/* From */}
                    <p style={{
                      margin: "0 0 4px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: isDark ? "#fff" : "#1a1a2e",
                    }}>
                      {notif.fromShort}
                    </p>
                    {/* Message */}
                    <p style={{
                      margin: "0 0 4px",
                      fontSize: "0.8rem",
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {notif.message}
                    </p>
                    {/* Time */}
                    <p style={{
                      margin: 0,
                      fontSize: "0.72rem",
                      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                    }}>
                      {formatTime(notif.timestamp)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div style={{
                      width: "8px", height: "8px",
                      background: "#6366f1",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: "4px",
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;