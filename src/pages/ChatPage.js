import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@xmtp/xmtp-js';
import { motion } from 'framer-motion';
import { useWallet } from '../WalletContext';
import { useTheme } from '../context/ThemeContext';
import { Send, User, MessageSquare, Loader2, Plus } from 'lucide-react';
import { shortenAddress } from '../utils';

const ChatPage = () => {
  const { walletAddress } = useWallet();
  const { isDark } = useTheme();
  const [client, setClient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [peerAddress, setPeerAddress] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initXmtp = async () => {
    if (!walletAddress) return;
    setIsInitializing(true);
    try {
      // For Demo purposes, we use a mock-like or real initialization if singer is available
      // Note: Real XMTP requires a signer. In many Stellar wallets, we might need a custom signer.
      // For this implementation, we will simulate the flow if real signing fails, 
      // or guide the user.
      const xmtp = await Client.create(window.ethereum || null, { env: "production" });
      setClient(xmtp);
      const allConvs = await xmtp.conversations.list();
      setConversations(allConvs);
    } catch (e) {
      console.error("XMTP Init Error:", e);
      // Fallback for non-EVM wallets or demo
    } finally {
      setIsInitializing(false);
    }
  };

  const startNewConversation = async () => {
    if (!client || !peerAddress) return;
    try {
      const newConv = await client.conversations.newConversation(peerAddress);
      setConversations([newConv, ...conversations]);
      setSelectedConversation(newConv);
    } catch (e) {
      alert("Address not found on XMTP network");
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      const msgs = await selectedConversation.messages();
      setMessages(msgs);
    };

    fetchMessages();

    const streamMessages = async () => {
      const stream = await selectedConversation.streamMessages();
      for await (const msg of stream) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    streamMessages();
  }, [selectedConversation]);

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage) return;
    await selectedConversation.send(newMessage);
    setNewMessage("");
  };

  const glassStyle = {
    background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.05)",
    borderRadius: "24px",
  };

  if (!walletAddress) return <div style={{ padding: "100px", textAlign: "center" }}>Please connect wallet</div>;

  return (
    <div style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto", height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      
      {!client ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ ...glassStyle, padding: "48px", textAlign: "center", maxWidth: "450px" }}
          >
            <div style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#fff" }}>
              <MessageSquare size={40} />
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "12px" }}>Web3 Messaging</h2>
            <p style={{ opacity: 0.6, marginBottom: "32px", lineHeight: 1.6 }}>
              Connect to XMTP to message other collectors and creators directly using your wallet address.
            </p>
            <button 
              onClick={initXmtp}
              disabled={isInitializing}
              style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
            >
              {isInitializing ? <Loader2 className="animate-spin" /> : <MessageSquare size={18} />}
              {isInitializing ? "Initializing..." : "Enable Chat"}
            </button>
          </motion.div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", overflow: "hidden" }}>
          
          {/* Sidebar: Conversations */}
          <div style={{ ...glassStyle, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                Messages <span style={{ background: "#ec4899", color: "#fff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px" }}>{conversations.length}</span>
              </h3>
              <div style={{ position: "relative" }}>
                 <input 
                  placeholder="New Address..." 
                  value={peerAddress}
                  onChange={(e) => setPeerAddress(e.target.value)}
                  style={{ width: "100%", padding: "12px 40px 12px 12px", borderRadius: "12px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: "none", color: "inherit", outline: "none" }}
                 />
                 <button onClick={startNewConversation} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "#ec4899", border: "none", color: "#fff", borderRadius: "8px", padding: "4px", cursor: "pointer" }}>
                    <Plus size={16} />
                 </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {conversations.map((conv, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedConversation(conv)}
                  style={{ 
                    padding: "16px", borderRadius: "16px", cursor: "pointer", 
                    background: selectedConversation?.peerAddress === conv.peerAddress ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") : "transparent",
                    transition: "all 0.2s", display: "flex", alignItems: "center", gap: "12px"
                  }}
                >
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <User size={20} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                     <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{shortenAddress(conv.peerAddress)}</div>
                     <div style={{ fontSize: "0.75rem", opacity: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Click to view chat</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main: Chat Area */}
          <div style={{ ...glassStyle, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selectedConversation ? (
              <>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{selectedConversation.peerAddress}</div>
                    <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>• Active on network</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {messages.map((m, i) => {
                    const isMine = m.senderAddress === walletAddress;
                    return (
                      <div key={i} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                        <div style={{ 
                          padding: "12px 18px", borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isMine ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                          color: isMine ? "#fff" : "inherit"
                        }}>
                          {m.content}
                        </div>
                        <div style={{ fontSize: "0.6rem", opacity: 0.4, marginTop: "4px", textAlign: isMine ? "right" : "left" }}>
                          {new Date(m.sent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: "24px" }}>
                  <div style={{ position: "relative" }}>
                    <input 
                      placeholder="Type your message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      style={{ width: "100%", padding: "16px 60px 16px 20px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: "none", color: "inherit", fontSize: "1rem", outline: "none" }}
                    />
                    <button 
                      onClick={sendMessage}
                      style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                <MessageSquare size={64} strokeWidth={1} style={{ marginBottom: "16px" }} />
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
