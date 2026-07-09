import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../context/WalletContext";
import { signTransaction } from "../services/walletService";
import { NETWORK, NETWORK_PASSPHRASE, CONTRACT_ID, SOROBAN_SERVER } from "../constants";
import { recordActivity } from "../utils/activityService";
import { useTheme } from "../context/ThemeContext";
import { Check as CheckIcon, Copy as CopyIcon, Plus, Sparkles, ImageIcon, Loader } from "lucide-react";
import { containerVariants, itemVariants } from "./ProfilePage";
import "./MintPage.css";
import { ref, set, onValue } from "firebase/database";
import { db } from "../services/firebase";
import { shortenAddress } from "../utils/helpers";
import { calculateRarityScore } from "../utils/RarityCalculator";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MIN_BALANCE_REQUIRED = 2.0;

const validateFile = (file) => {
  if (!file) return { valid: false, error: "No file selected." };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Use JPG, PNG, GIF, or WEBP." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 5MB limit." };
  }
  return { valid: true };
};

const uploadToPinata = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    if (data.status !== "success" || !data.cid) {
      throw new Error(data.message || "Failed to pin asset via backend");
    }
    return data.cid;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw new Error(error.message || "IPFS upload failed via Backend");
  }
};

const MintPage = ({ walletAddress, server, setNfts, nfts }) => {
  const { walletType } = useWallet();
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [txHash, setTxHash] = useState("");
  const [mintedAssetCode, setMintedAssetCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [localBalance, setLocalBalance] = useState(0);
  const [mintMode, setMintMode] = useState("manual"); // 'manual' | 'ai'
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState("");
  const fileInputRef = useRef(null);

  const [traitBackground, setTraitBackground] = useState("Space Black");
  const [traitEyes, setTraitEyes] = useState("Dark Shades");
  const [traitOutfit, setTraitOutfit] = useState("Hoodie");
  const [traitAccessory, setTraitAccessory] = useState("None");
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

  const fetchBalance = useCallback(async () => {
    try {
      const account = await server.loadAccount(walletAddress);
      const xlmBalance = account.balances.find((b) => b.asset_type === "native");
      const bal = parseFloat(xlmBalance.balance).toFixed(2);
      setLocalBalance(parseFloat(bal));
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, [server, walletAddress]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  const handleMint = async () => {
    setTxHash("");
    if (!name) { setStatus("Please enter an NFT name."); setStatusType("warning"); return; }
    if (!walletType) { setStatus("Wallet not connected. Please reconnect."); setStatusType("warning"); return; }
    if (localBalance < MIN_BALANCE_REQUIRED) { setStatus(`Insufficient balance. Need at least ${MIN_BALANCE_REQUIRED} XLM.`); setStatusType("warning"); return; }
    if (mintMode === "manual" && !file) { setStatus("Please select an image file to upload."); setStatusType("warning"); return; }
    if (mintMode === "ai" && !aiImageUrl) { setStatus("Please generate an AI image first."); setStatusType("warning"); return; }
    setShowConfirmation(true);
  };

  const generateAIImage = async () => {
    if (!aiPrompt.trim()) { setStatus("Please enter a description for AI."); setStatusType("warning"); return; }
    setAiGenerating(true);
    setStatus("AI is creating your masterpiece...");
    setStatusType("info");
    try {
      // Pollinations.ai — completely free, no API key needed!
      const encodedPrompt = encodeURIComponent(`${aiPrompt}, digital art, NFT, vibrant, high quality`);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;
      // Pre-load to confirm image is ready
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      setAiImageUrl(url);
      setPreviewUrl(url);
      setStatus("✨ AI image generated! Review and mint.");
      setStatusType("success");
    } catch (e) {
      setStatus("AI generation failed. Try a different prompt.");
      setStatusType("warning");
    } finally {
      setAiGenerating(false);
    }
  };

  const confirmMint = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setStatus("Starting mint process...");
    setStatusType("info");

    try {
      if (mintMode === "manual" && !file) throw new Error("No file selected.");

      // Step 1: Get image URL
      setStatus("Preparing image...");
      let tokenURI;
      if (mintMode === "ai" && aiImageUrl) {
        // AI mode: use the generated image URL directly (no Pinata upload needed)
        tokenURI = aiImageUrl;
        setStatus("Using AI-generated image...");
      } else {
        // Manual mode: upload to IPFS via Pinata
        setStatus("Uploading image to IPFS...");
        const cid = await uploadToPinata(file);
        tokenURI = `https://gateway.pinata.cloud/ipfs/${cid}`;
      }
      console.log(" URI:", tokenURI);
      console.log(" Name:", name);

      // Step 2: Load account via Soroban RPC
      setStatus("Building transaction...");
      let sourceAccount;
      try {
        sourceAccount = await SOROBAN_SERVER.getAccount(walletAddress);
        console.log(" Account loaded:", sourceAccount.accountId());
      } catch (e) {
        throw new Error(
          "Account not found on Stellar testnet. " +
          "Fund your wallet at: https://friendbot.stellar.org/?addr=" +
          walletAddress
        );
      }

      // Step 3: Build transaction
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: "1000000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(CONTRACT_ID).call(
            "mint_nft",
            new StellarSdk.Address(walletAddress).toScVal(),
            new StellarSdk.Address(walletAddress).toScVal(),
            StellarSdk.nativeToScVal(name.trim(), { type: "string" }),
            StellarSdk.nativeToScVal(tokenURI, { type: "string" })
          )
        )
        .setTimeout(300)
        .build();

      // Step 4: Simulate
      setStatus("Simulating transaction...");
      const simulation = await SOROBAN_SERVER.simulateTransaction(tx);
      console.log(" Simulation:", simulation);

      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        console.error(" Simulation Error:", simulation.error);
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // Step 5: Assemble
      const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
      console.log(" Transaction assembled");

      // Step 6: Sign
      // NOTE: NETWORK = "TESTNET" (uppercase) is passed here.
      // walletService.js converts it to lowercase "testnet" for Albedo internally.
      setStatus(
        walletType === "ALBEDO"
          ? "Albedo popup opening — please sign in the popup window..."
          : "Please sign in your wallet..."
      );

      let signedTxXdr;
      try {
        signedTxXdr = await signTransaction(assembledTx.toXDR(), {
          walletType,
          network: NETWORK,
          networkPassphrase: NETWORK_PASSPHRASE,
        });
      } catch (signErr) {
        console.error("❌ Signing error:", signErr);
        throw new Error(signErr.message || "Signing failed or was cancelled");
      }

      if (!signedTxXdr) throw new Error("No signed XDR returned from wallet.");
      console.log(" Transaction signed, XDR length:", signedTxXdr.length);

      // Step 7: Reconstruct Transaction object from signed XDR
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      // Step 8: Submit via Soroban RPC (NOT Horizon — Horizon rejects Soroban txs)
      setStatus("Submitting to Soroban RPC...");
      const response = await SOROBAN_SERVER.sendTransaction(signedTx);
      console.log("📤 Submit response:", response);

      if (response.status === "ERROR") {
        console.error(" ERROR response:", response);
        throw new Error(
          `Transaction submission failed: ${response.errorResult?.toXDR
            ? response.errorResult.toXDR("base64")
            : JSON.stringify(response)
          }`
        );
      }

      setTxHash(response.hash);

      // Step 9: Poll for confirmation
      setStatus("Waiting for confirmation...");
      let finalStatus = response.status;

      if (finalStatus !== "SUCCESS") {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const poll = await SOROBAN_SERVER.getTransaction(response.hash);
            console.log(` Poll ${i + 1}: ${poll.status}`);
            if (poll.status !== "NOT_FOUND") {
              finalStatus = poll.status;
              if (finalStatus === "SUCCESS") break;
              if (finalStatus === "FAILED") throw new Error("Transaction failed during execution.");
            }
          } catch (pollErr) {
            if (pollErr.message?.includes("Transaction failed")) throw pollErr;
            console.warn(`Poll ${i + 1} error (non-fatal):`, pollErr.message);
          }
        }
      }

      if (finalStatus !== "SUCCESS") {
        throw new Error(`Transaction timed out or failed. Final status: ${finalStatus}`);
      }

      // Step 10: Success
      console.log("🎉 NFT Minted! Hash:", response.hash);
      setStatus("NFT Minted Successfully!");
      setStatusType("success");
      setTxHash(response.hash);
      // Get the ID of the new NFT by querying total tokens
      let newNftId = nfts.length + 1;
      try {
        const dummyAccount = new StellarSdk.Account(walletAddress, "0");
        const totalTx = new StellarSdk.TransactionBuilder(dummyAccount, { fee: "0", networkPassphrase: NETWORK_PASSPHRASE })
          .addOperation(new StellarSdk.Contract(CONTRACT_ID).call("get_total"))
          .setTimeout(30).build();
        const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
        if (totalSim && totalSim.result?.retval) {
          const totalVal = StellarSdk.scValToNative(totalSim.result.retval);
          if (totalVal) newNftId = totalVal;
        }
      } catch (e) {
        console.warn("Failed to get total NFTs dynamically:", e);
      }

      // Save traits and rarityScore to Firebase under `marketplace/nft_${newNftId}`
      const nftKey = `nft_${newNftId}`;
      const traits = [
        { type: "Background", value: traitBackground },
        { type: "Eyes", value: traitEyes },
        { type: "Outfit", value: traitOutfit },
        { type: "Accessory", value: traitAccessory }
      ];
      
      const isCert = name.toLowerCase().includes("certificate") || name.toLowerCase().includes("job cert");
      const rarityScore = calculateRarityScore(traits, allNfts);

      await set(ref(db, `marketplace/${nftKey}`), {
        nftKey,
        nftId: newNftId,
        name: name,
        image: tokenURI,
        ownerFull: walletAddress,
        owner: shortenAddress(walletAddress),
        traits: traits,
        rarityScore: rarityScore,
        listed: false,
        sold: false,
        isCert: isCert,
        mintedAt: Date.now()
      });

      setNfts((prev) => [
        ...prev,
        { id: newNftId, name, imageId: tokenURI, assetCode: "NFT", issuer: CONTRACT_ID },
      ]);

      // Log Activity
      await recordActivity(walletAddress, {
        type: "nft_minted",
        title: "NFT Minted",
        description: `Minted "${name}" on Stellar`,
        color: "#8b5cf6"
      });

      setName("");
      setDescription("");
      setFile(null);
      await fetchBalance();

    } catch (e) {
      console.error(" Mint Error:", e);
      let msg = e.message || "Transaction failed";
      if (msg.includes("txBAD_AUTH") || msg.includes("Auth Error")) {
        msg = "Auth Error: Disconnect and reconnect your wallet, then try again.";
      } else if (msg.includes("non-existent contract function") || msg.includes("MissingValue")) {
        msg = "Contract Error: Function not found. Check CONTRACT_ID in constants.js";
      } else if (msg.includes("Simulation failed")) {
        msg = `Simulation Error: ${msg}`;
      } else if (msg.includes("Backend server")) {
        msg = "Backend not running. Run: cd backend && node server.js";
      } else if (msg.includes("popup") || msg.includes("Albedo error")) {
        msg = `${msg} — In Chrome: click the popup-blocked icon in the address bar and allow popups.`;
      }
      setStatus(msg);
      setStatusType("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = `
    .mint-page-wrapper { min-height: 100vh; padding: 2rem 1rem; position: relative; overflow: hidden; }
    .mint-bg-glow {
      position: absolute; width: 800px; height: 800px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
      top: -300px; left: 50%; transform: translateX(-50%);
      pointer-events: none; z-index: 0; animation: pulse-glow 10s infinite ease-in-out;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
      50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
    }
    .glass-card-premium {
      background: ${isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.6)"}; backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px); border: 1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"};
      border-radius: 24px; box-shadow: ${isDark ? "0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" : "0 8px 32px rgba(31, 38, 135, 0.1)"};
      overflow: hidden; position: relative;
    }
    .mint-btn-gradient {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;
    }
    .mint-btn-gradient:hover:not(:disabled) {
      box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5); transform: translateY(-2px);
    }
  `;

  if (txHash) {
    return (
      <motion.div className="success-card-container" style={{ background: isDark ? "rgba(15,15,30,0.95)" : "rgba(255,255,255,0.95)" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="success-icon-wrapper"><CheckIcon className="success-icon" /></div>
        <h2 className={`success-title text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"} mb-2`}>NFT Minted Successfully! 🎉</h2>
        <div className="nft-details-badge">
          <span className="badge-label">Asset</span>
          <span className="badge-value">{mintedAssetCode || "NFT"}</span>
        </div>
        <div className="hash-section">
          <span className="hash-label" style={{ color: isDark ? "#a78bfa" : "#6b7280" }}>Transaction Hash</span>
          <div className="hash-box" style={{ background: isDark ? "rgba(139,92,246,0.1)" : "rgba(243,244,246,1)", border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid #e5e7eb" }} onClick={handleCopyHash} title="Click to copy">
            <span className="hash-text" style={{ color: isDark ? "#c4b5fd" : "#4b5563" }}>{`${txHash.slice(0, 8)}...${txHash.slice(-8)}`}</span>
            {copied ? <CheckIcon className="copy-icon success" /> : <CopyIcon className="copy-icon" />}
          </div>
        </div>
        <div className="success-actions">
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="button button-secondary explorer-btn">
            View on Explorer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "8px" }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <button className="button button-primary" onClick={() => { setTxHash(""); setStatus(""); setName(""); setMintedAssetCode(""); }}>
            Mint Another NFT
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mint-page-wrapper">
      <style>{styles}</style>
      <div className="mint-bg-glow" />
      <motion.div className="max-w-5xl mx-auto relative z-10" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="text-center mb-10" variants={itemVariants}>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"} mb-3`}>
            Mint <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">NFT</span>
          </h1>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-lg`}>Create and manage your digital assets on Stellar</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div className="lg:col-span-8 space-y-6" variants={itemVariants}>
            <div className="glass-card-premium p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-700"} ml-1`}>NFT Name</label>
                  <input type="text"
                    className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "bg-white/50 border-gray-200 text-gray-900 placeholder-gray-400"} border rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all`}
                    placeholder="Enter NFT Name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-700"} ml-1`}>Description</label>
                  <textarea
                    className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "bg-white/50 border-gray-200 text-gray-900 placeholder-gray-400"} border rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none h-24`}
                    placeholder="Describe your NFT..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
                </div>

                {/* Traits / Attributes Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-800"} ml-1`}>
                      🛡️ NFT Attributes (Traits)
                    </label>
                    <button
                      onClick={() => {
                        const backgrounds = ["Space Black", "Cyber Neon", "Crimson Red", "Royal Purple", "Solar Gold", "Glacier Blue", "Emerald Green"];
                        const eyes = ["Laser Glow", "Cyborg Visor", "Dark Shades", "Heterochromia", "Holographic", "Anime Eyes", "Golden Pupils"];
                        const clothes = ["Cyber Jacket", "Hoodie", "Astro Suit", "Ninja Robes", "Steampunk Vest", "Formal Tux", "T-Shirt"];
                        const accessories = ["Golden Chain", "Crown", "Wireless Earbuds", "VR Headset", "Angel Halo", "None", "Pet Companion"];
                        
                        setTraitBackground(backgrounds[Math.floor(Math.random() * backgrounds.length)]);
                        setTraitEyes(eyes[Math.floor(Math.random() * eyes.length)]);
                        setTraitOutfit(clothes[Math.floor(Math.random() * clothes.length)]);
                        setTraitAccessory(accessories[Math.floor(Math.random() * accessories.length)]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-purple-400" : "bg-gray-100 hover:bg-gray-200 text-purple-650"}`}
                    >
                      🎲 Roll Random Attributes
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Background</span>
                      <select 
                        value={traitBackground} 
                        onChange={(e) => setTraitBackground(e.target.value)}
                        className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all`}
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                      >
                        {["Space Black", "Cyber Neon", "Crimson Red", "Royal Purple", "Solar Gold", "Glacier Blue", "Emerald Green"].map((v) => (
                          <option key={v} value={v} style={{ background: isDark ? "#1e1e2d" : "#fff", color: isDark ? "#fff" : "#000" }}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Eyes</span>
                      <select 
                        value={traitEyes} 
                        onChange={(e) => setTraitEyes(e.target.value)}
                        className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all`}
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                      >
                        {["Laser Glow", "Cyborg Visor", "Dark Shades", "Heterochromia", "Holographic", "Anime Eyes", "Golden Pupils"].map((v) => (
                          <option key={v} value={v} style={{ background: isDark ? "#1e1e2d" : "#fff", color: isDark ? "#fff" : "#000" }}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Outfit</span>
                      <select 
                        value={traitOutfit} 
                        onChange={(e) => setTraitOutfit(e.target.value)}
                        className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all`}
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                      >
                        {["Cyber Jacket", "Hoodie", "Astro Suit", "Ninja Robes", "Steampunk Vest", "Formal Tux", "T-Shirt"].map((v) => (
                          <option key={v} value={v} style={{ background: isDark ? "#1e1e2d" : "#fff", color: isDark ? "#fff" : "#000" }}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Accessory</span>
                      <select 
                        value={traitAccessory} 
                        onChange={(e) => setTraitAccessory(e.target.value)}
                        className={`w-full ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all`}
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                      >
                        {["Golden Chain", "Crown", "Wireless Earbuds", "VR Headset", "Angel Halo", "None", "Pet Companion"].map((v) => (
                          <option key={v} value={v} style={{ background: isDark ? "#1e1e2d" : "#fff", color: isDark ? "#fff" : "#000" }}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mode Tabs */}
                <div className={`flex gap-2 p-1 rounded-xl ${isDark ? "bg-black/30" : "bg-gray-100"}`}>
                  <button
                    onClick={() => { setMintMode("manual"); setAiImageUrl(""); setPreviewUrl(""); }}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mintMode === "manual" ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow" : (isDark ? "text-gray-400" : "text-gray-500")}`}
                  >
                    <ImageIcon size={16} /> Manual Upload
                  </button>
                  <button
                    onClick={() => { setMintMode("ai"); setFile(null); }}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mintMode === "ai" ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow" : (isDark ? "text-gray-400" : "text-gray-500")}`}
                  >
                    <Sparkles size={16} /> AI Generate ✨
                  </button>
                </div>

                {mintMode === "ai" ? (
                  <div className="space-y-3">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-700"} ml-1`}>
                      Describe your NFT to AI
                    </label>
                    <div className="flex gap-2">
                      <input type="text"
                        className={`flex-1 ${isDark ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "bg-white/50 border-gray-200 text-gray-900 placeholder-gray-400"} border rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all`}
                        placeholder='e.g. "Cyberpunk dragon on Stellar blockchain"'
                        value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        onKeyPress={e => e.key === "Enter" && generateAIImage()}
                        disabled={loading || aiGenerating} />
                      <button
                        onClick={generateAIImage}
                        disabled={loading || aiGenerating}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                      >
                        {aiGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {aiGenerating ? "Creating..." : "Generate"}
                      </button>
                    </div>
                    {aiImageUrl && (
                      <div className={`rounded-xl overflow-hidden border-2 border-purple-500/30`}>
                        <img src={aiImageUrl} alt="AI Generated" className="w-full object-cover" />
                        <div className="p-3 text-center text-sm text-green-400 font-semibold">
                          ✅ AI image ready — enter a name above and click Mint!
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-700"} ml-1`}>Upload NFT Image</label>
                    <div className={`border-2 border-dashed ${isDark ? "border-white/10 bg-black/20" : "border-gray-300 bg-white/50"} rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer`}
                      onClick={() => fileInputRef.current?.click()}>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const selectedFile = e.target.files[0];
                            const validation = validateFile(selectedFile);
                            if (!validation.valid) { setStatus(validation.error); setStatusType("warning"); return; }
                            setFile(selectedFile); setStatus("");
                          }
                        }} disabled={loading} />
                      {file ? (
                        <div className="text-green-400 font-medium flex items-center justify-center gap-2">
                          <CheckIcon className="w-5 h-5" />{file.name}
                        </div>
                      ) : (
                        <div className={isDark ? "text-gray-400" : "text-gray-500"}>
                          <div className="mb-2 text-2xl">📂</div>
                          <span className="text-sm">Click to upload image</span>
                          <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"} mt-1`}>Max 5MB (JPG, PNG, GIF, WEBP)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                <button className="mint-btn-gradient w-full py-4 rounded-xl text-white font-bold text-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  onClick={handleMint} disabled={loading}>
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Minting on Stellar...</span></>
                  ) : (
                    <><span>Mint NFT</span>
                      <Plus size={20} />
                    </>
                  )}
                </button>

                {status && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className={`p-4 rounded-xl text-sm font-medium border ${statusType === "success" ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : statusType === "warning" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                    {status}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="lg:col-span-4" variants={itemVariants}>
            <div className="glass-card-premium p-6 sticky top-24">
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"} mb-4`}>Preview</h3>
              <div className={`aspect-square rounded-2xl ${isDark ? "bg-black/40 border-white/10" : "bg-gray-100 border-gray-200"} border overflow-hidden relative group`}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/400?text=No+Image"; }} />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-50">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-sm">Select an image</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-10">
                  <div className="text-white font-bold text-lg truncate">{name || "Untitled NFT"}</div>
                  <div className="text-purple-400 text-xs font-mono mt-1">{file ? file.name : "NO ASSET SELECTED"}</div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm"><span className={isDark ? "text-gray-500" : "text-gray-400"}>Network</span><span className={isDark ? "text-gray-300" : "text-gray-600"}>Stellar Testnet</span></div>
                <div className="flex justify-between text-sm"><span className={isDark ? "text-gray-500" : "text-gray-400"}>Standard</span><span className={isDark ? "text-gray-300" : "text-gray-600"}>Soroban NFT</span></div>
                <div className={`h-px ${isDark ? "bg-white/10" : "bg-black/10"} my-2`} />
                <div className="flex justify-between text-sm font-medium"><span className={isDark ? "text-gray-400" : "text-gray-500"}>Estimated Fee</span><span className="text-purple-400">~0.01 XLM</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirmation && (
          <motion.div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? "bg-black/80" : "bg-white/60"} backdrop-blur-sm`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`${isDark ? "bg-[#1e1e2d] border-white/10" : "bg-white border-gray-200"} border rounded-2xl p-6 max-w-md w-full shadow-2xl`}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mb-4`}>Confirm Minting</h3>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-6`}>You are about to mint <strong>"{name}"</strong>. This cannot be undone and will cost a small amount of XLM.</p>
              <div className="flex gap-3">
                <button className={`flex-1 px-4 py-2 rounded-xl ${isDark ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-colors`} onClick={() => setShowConfirmation(false)}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity" onClick={confirmMint}>Confirm & Mint</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MintPage;