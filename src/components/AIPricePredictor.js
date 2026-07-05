import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import { callClaude } from "../services/aiService";
import "./AIPricePredictor.css";

/**
 * AIPricePredictor — Full card for NFT Detail Page
 * 
 * Props:
 *   nft        — { name, id, image, owner, traits?, collection? }
 *   price      — current price string (e.g. "15")
 *   currency   — "XLM" (default)
 *   priceHistory — optional array of past prices [{price: 10}, ...]
 *   isDark     — theme flag
 */
export default function AIPricePredictor({ nft, price, currency = "XLM", priceHistory = [], isDark = true }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPrediction = useCallback(async () => {
    if (!nft) return;
    setLoading(true);
    setError(null);
    setPrediction(null);

    // Build traits string
    const traitsStr = nft.traits && Array.isArray(nft.traits)
      ? nft.traits.map(t => `${t.trait_type || t.type}: ${t.value}`).join(", ")
      : nft.attributes && Array.isArray(nft.attributes)
        ? nft.attributes.map(a => `${a.trait_type}: ${a.value}`).join(", ")
        : "Standard digital artwork traits";

    // Build recent sales from price history
    const recentSales = priceHistory.length > 0
      ? priceHistory.slice(-5).map(p => `${p.price} ${currency}`).join(", ")
      : `${price || "10"} ${currency}`;

    const rarityScore = nft.rarityScore || Math.floor(Math.random() * 300 + 50);

    const prompt = `You are an NFT price analyst. Analyze this NFT and predict its market value.

NFT Name: ${nft.name || "Unknown NFT"}
Collection: ${nft.collection || "Verified Assets"}
Rarity Score: ${rarityScore}
Current Price: ${price || "10"} ${currency}
Recent Sales: ${recentSales}
Traits: ${traitsStr}

Reply JSON only — no markdown, no extra text. Just the JSON object:
{
  "predictedPrice": 250,
  "priceRange": {"min": 200, "max": 300},
  "trend": "bullish",
  "confidence": 85,
  "reasoning": "2-3 line explanation of your analysis",
  "recommendation": "buy"
}

Rules for your analysis:
- predictedPrice should be a realistic number relative to the current price
- trend must be one of: "bullish", "bearish", "stable"  
- confidence is 0-100 integer
- recommendation must be one of: "buy", "sell", "hold"
- reasoning should be insightful and specific to this NFT`;

    try {
      const result = await callClaude(prompt, 500);
      setPrediction(result);
    } catch (err) {
      console.error("AI Prediction error:", err);
      setError(err.message || "Failed to get AI prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [nft, price, currency, priceHistory]);

  const getTrendEmoji = (trend) => {
    switch (trend?.toLowerCase()) {
      case "bullish": return "📈";
      case "bearish": return "📉";
      case "stable": return "➡️";
      default: return "📊";
    }
  };

  const getTrendClass = (trend) => {
    switch (trend?.toLowerCase()) {
      case "bullish": return "trend-bullish";
      case "bearish": return "trend-bearish";
      case "stable": return "trend-stable";
      default: return "";
    }
  };

  const getConfidenceClass = (conf) => {
    if (conf >= 70) return "high";
    if (conf >= 40) return "medium";
    return "low";
  };

  const getRecommendationClass = (rec) => {
    switch (rec?.toLowerCase()) {
      case "buy": return "recommendation-buy";
      case "sell": return "recommendation-sell";
      case "hold": return "recommendation-hold";
      default: return "";
    }
  };

  const getRecommendationEmoji = (rec) => {
    switch (rec?.toLowerCase()) {
      case "buy": return "✅";
      case "sell": return "🔴";
      case "hold": return "⏸️";
      default: return "";
    }
  };

  // If no prediction yet, show trigger button
  if (!prediction && !loading && !error) {
    return (
      <button className="ai-predict-btn" onClick={getPrediction}>
        <span className="ai-icon">🤖</span>
        <span>Predict Price with AI</span>
        <Sparkles size={16} style={{ opacity: 0.6 }} />
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* Loading State */}
      {loading && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="ai-prediction-card"
        >
          <div className="ai-loading-overlay">
            <div className="ai-brain-animation">🤖</div>
            <div className="ai-loading-text">AI Analyzing NFT Data...</div>
            <div className="ai-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="ai-prediction-card"
        >
          <div className="ai-error">
            <div className="ai-error-icon">⚠️</div>
            <div className="ai-error-title">Prediction Failed</div>
            <div className="ai-error-msg">{error}</div>
            <button className="ai-retry-btn" onClick={getPrediction}>
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              Try Again
            </button>
          </div>
        </motion.div>
      )}

      {/* Prediction Result */}
      {prediction && !loading && (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="ai-prediction-card"
        >
          {/* Header */}
          <div className="ai-card-header">
            <div className="ai-card-header-left">
              <div className="ai-badge">
                <span className="ai-badge-icon">🤖</span>
                AI Prediction
              </div>
            </div>
            <button className="ai-refresh-btn" onClick={getPrediction} title="Re-analyze">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Main Price */}
          <div className="ai-main-prediction">
            <div className="ai-predicted-label">Predicted Value</div>
            <div className="ai-predicted-price">
              {prediction.predictedPrice}
              <span className="ai-predicted-currency"> {currency}</span>
            </div>

            {/* Price Range Bar */}
            {prediction.priceRange && (
              <div className="ai-price-range">
                <span>{prediction.priceRange.min} {currency}</span>
                <div className="ai-price-range-bar">
                  <div
                    className="ai-price-range-fill"
                    style={{
                      width: `${Math.min(
                        ((prediction.predictedPrice - prediction.priceRange.min) /
                          (prediction.priceRange.max - prediction.priceRange.min)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span>{prediction.priceRange.max} {currency}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="ai-metrics-grid">
            {/* Trend */}
            <div className="ai-metric">
              <div className="ai-metric-icon">{getTrendEmoji(prediction.trend)}</div>
              <div className={`ai-metric-value ${getTrendClass(prediction.trend)}`}>
                {prediction.trend?.charAt(0).toUpperCase() + prediction.trend?.slice(1)}
              </div>
              <div className="ai-metric-label">Trend</div>
            </div>

            {/* Confidence */}
            <div className="ai-metric">
              <div className="ai-metric-icon">🎯</div>
              <div className={`ai-metric-value confidence-${getConfidenceClass(prediction.confidence)}`}>
                {prediction.confidence}%
              </div>
              <div className="ai-metric-label">Confidence</div>
              <div className="ai-confidence-bar-bg">
                <div
                  className={`ai-confidence-bar-fill ${getConfidenceClass(prediction.confidence)}`}
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
            </div>

            {/* Recommendation */}
            <div className="ai-metric">
              <div className="ai-metric-icon">{getRecommendationEmoji(prediction.recommendation)}</div>
              <div className="ai-metric-value">
                <span className={`ai-recommendation ${getRecommendationClass(prediction.recommendation)}`}>
                  {prediction.recommendation?.toUpperCase()}
                </span>
              </div>
              <div className="ai-metric-label">Action</div>
            </div>
          </div>

          {/* Reasoning */}
          {prediction.reasoning && (
            <div className="ai-reasoning">
              <div className="ai-reasoning-title">
                <Sparkles size={12} /> AI Analysis
              </div>
              <div className="ai-reasoning-text">{prediction.reasoning}</div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="ai-disclaimer">
            <AlertTriangle size={12} />
            AI predictions are for educational purposes only. Not financial advice.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * AIPricePredictorMini — Small button + inline result for NFT cards on Marketplace
 */
export function AIPricePredictorMini({ nft, price, currency = "XLM" }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPrediction = async (e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (loading) return;
    setLoading(true);

    const traitsStr = nft.traits && Array.isArray(nft.traits)
      ? nft.traits.map(t => `${t.trait_type || t.type}: ${t.value}`).join(", ")
      : "Standard digital artwork";

    const prompt = `You are an NFT price analyst. Quickly predict this NFT's value.

NFT Name: ${nft.name || "Unknown NFT"}
Current Price: ${price || "10"} ${currency}
Traits: ${traitsStr}

Reply JSON only — no markdown:
{
  "predictedPrice": 250,
  "trend": "bullish",
  "confidence": 85,
  "recommendation": "buy"
}`;

    try {
      const result = await callClaude(prompt, 200);
      setPrediction(result);
    } catch (err) {
      console.error("Mini prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-mini-loading" onClick={e => e.stopPropagation()}>
        <span>🤖</span> Analyzing...
      </div>
    );
  }

  if (prediction) {
    const trendEmoji = prediction.trend === "bullish" ? "📈" : prediction.trend === "bearish" ? "📉" : "➡️";
    return (
      <div className="ai-mini-result" onClick={e => e.stopPropagation()} title={`AI: ${prediction.recommendation?.toUpperCase()} | Confidence: ${prediction.confidence}%`}>
        <span className="ai-mini-icon">🤖</span>
        <span className="ai-mini-price">{prediction.predictedPrice} {currency}</span>
        <span className="ai-mini-trend">{trendEmoji}</span>
      </div>
    );
  }

  return (
    <button className="ai-mini-predict-btn" onClick={getPrediction}>
      <span className="ai-mini-icon">🤖</span>
      Predict
    </button>
  );
}
