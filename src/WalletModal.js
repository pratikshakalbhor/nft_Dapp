import { useState, useEffect } from "react";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import "./WalletModal.css";

const WALLETS = [
  {
    id: "freighter",
    name: "Freighter",
    subtitle: "Stellar Extension",
    letter: "F",
    color: "#7C3AED",
    installUrl: {
      desktop: "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk",
      android: "https://play.google.com/store/apps/details?id=app.freighter",
      ios: "https://apps.apple.com/app/freighter/id1556917909",
    },
    detect: async () => {
      // Priority 1: Direct window check
      if (window.freighter || window.freighter?.isFreighter) return true;
      
      // Priority 2: Official library check (async)
      try {
        const result = await isConnected();
        return typeof result === "boolean" ? result : result?.isConnected === true;
      } catch (e) {
        return false;
      }
    },
    connect: async () => {
      // Use official library for connection
      await requestAccess();
      const address = await getAddress();
      return typeof address === 'string' ? address : address?.address;
    },
  },
  {
    id: "albedo",
    name: "Albedo",
    subtitle: "Web Wallet",
    letter: "A",
    color: "#2563EB",
    detect: async () => true, // Albedo is web-based — always available
    installUrl: {
      desktop: "https://albedo.link",
      android: "https://albedo.link",
      ios: "https://albedo.link",
    },
    connect: async () => {
      window.open("https://albedo.link", "_blank");
      return null;
    },
  },
  {
    id: "xbull",
    name: "xBull",
    subtitle: "Stellar Wallet",
    letter: "X",
    color: "#7C3AED",
    detect: async () => !!(window.xBullSDK || window.xbull || window.xBull),
    installUrl: {
      desktop: "https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemkkd",
      android: "https://play.google.com/store/apps/details?id=io.xbull.app",
      ios: "https://apps.apple.com/app/xbull-wallet/id1583190078",
    },
    connect: async () => {
      const connector = window.xBullSDK || window.xbull || window.xBull;
      const result = await connector.connect();
      return result.publicKey;
    },
  },
];

const getInstallUrl = (wallet) => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return wallet.installUrl.android;
  if (/iphone|ipad/i.test(ua)) return wallet.installUrl.ios;
  return wallet.installUrl.desktop;
};

const isMobileDevice = () => /android|iphone|ipad/i.test(navigator.userAgent);

export default function WalletModal({ onClose, onConnect }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState(null);
  
  const [detectedWallets, setDetectedWallets] = useState({ albedo: true }); // Default albedo to true
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 8; // 4 seconds total
    let isMounted = true;

    const checkWallets = async () => {
      const results = {};
      
      // Run detections in parallel
      await Promise.all(WALLETS.map(async (w) => {
        results[w.id] = await w.detect();
      }));
      
      if (!isMounted) return;
      
      setDetectedWallets(results);

      // If Freighter is found, or we reached max attempts
      if (results.freighter || attempts >= maxAttempts) {
        setIsDetecting(false);
        return true; 
      }
      return false;
    };

    // Initial check
    checkWallets();

    // Retry logic
    const interval = setInterval(async () => {
      attempts++;
      if (await checkWallets()) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleWalletClick = async (wallet) => {
    setError("");
    setSelected(wallet.id);

    // Final "Just in Case" check before showing install page
    let isInstalled = detectedWallets[wallet.id];
    if (!isInstalled) {
       isInstalled = await wallet.detect();
       if (isInstalled) {
         setDetectedWallets(prev => ({ ...prev, [wallet.id]: true }));
       }
    }

    if (!isInstalled) {
      setInstalling(wallet.id);
      const url = getInstallUrl(wallet);
      setTimeout(() => {
        window.open(url, "_blank");
        setInstalling(null);
        setSelected(null);
      }, 800);
      return;
    }

    try {
      setLoading(true);
      const address = await wallet.connect();
      if (address) {
        onConnect && onConnect({ wallet: wallet.id, address });
        onClose && onClose();
      }
    } catch (err) {
      setError(`${wallet.name} connection failed. Check if extension is unlocked.`);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wm-modal">
        <div className="wm-header">
          <h2 className="wm-title">Connect Wallet</h2>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        <p className="wm-subtitle">Select Wallet</p>

        <div className="wm-list">
          {WALLETS.map((wallet) => {
            const isInstalled = detectedWallets[wallet.id];
            const isSelected = selected === wallet.id;
            const isInstalling = installing === wallet.id;
            const isMobile = isMobileDevice();
            const showDetecting = isDetecting && !isInstalled && wallet.id === "freighter";

            return (
              <button
                key={wallet.id}
                className={`wm-item ${isSelected ? "wm-item--selected" : ""}`}
                onClick={() => handleWalletClick(wallet)}
                disabled={loading || showDetecting}
              >
                <div className="wm-icon" style={{ background: wallet.color }}>
                  {wallet.letter}
                </div>

                <div className="wm-info">
                  <div className="wm-name">{wallet.name}</div>
                  <div className="wm-desc">
                    {showDetecting 
                      ? "Detecting extension..." 
                      : isInstalling
                      ? "Opening install page..."
                      : !isInstalled && !isMobile
                      ? "Click to install extension"
                      : !isInstalled && isMobile
                      ? "Click to install app"
                      : wallet.subtitle}
                  </div>
                </div>

                <div className="wm-right">
                  {showDetecting ? (
                    <div className="wm-spinner" />
                  ) : isInstalling ? (
                    <div className="wm-spinner" />
                  ) : isSelected && isInstalled ? (
                    <div className="wm-check">✓</div>
                  ) : !isInstalled ? (
                    <span className="wm-install-badge">
                      {isMobile ? "📱 Install" : "⬇ Install"}
                    </span>
                  ) : (
                    <span className="wm-available">●</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {error && <div className="wm-error">{error}</div>}

        <button className="wm-cancel" onClick={onClose}>
          Cancel
        </button>

        <p className="wm-footer">
          Your keys are stored securely in your wallet extension.
        </p>
      </div>
    </div>
  );
}