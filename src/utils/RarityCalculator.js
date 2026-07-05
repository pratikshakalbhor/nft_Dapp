/**
 * Rarity Calculator — Computes rarity score and tier based on NFT traits.
 */

/**
 * Generates a deterministic set of traits for an NFT if it doesn't have custom ones.
 * This guarantees all NFTs have visible traits for calculations.
 */
export function getNFTTraits(nft) {
  if (!nft) return [];
  
  // Use existing traits or attributes if defined
  const traits = nft.traits || nft.attributes;
  if (traits && Array.isArray(traits) && traits.length > 0) {
    return traits.map(t => ({
      type: t.type || t.trait_type || "Trait",
      value: t.value || ""
    }));
  }

  const id = nft.nftId || nft.id || 0;
  const name = nft.name || `NFT #${id}`;
  
  // Generate deterministic hash based on NFT name and ID
  let hash = 0;
  const seedString = `${name}:${id}`;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const backgrounds = ["Space Black", "Cyber Neon", "Crimson Red", "Royal Purple", "Solar Gold", "Glacier Blue", "Emerald Green"];
  const eyes = ["Laser Glow", "Cyborg Visor", "Dark Shades", "Heterochromia", "Holographic", "Anime Eyes", "Golden Pupils"];
  const clothes = ["Cyber Jacket", "Hoodie", "Astro Suit", "Ninja Robes", "Steampunk Vest", "Formal Tux", "T-Shirt"];
  const accessories = ["Golden Chain", "Crown", "Wireless Earbuds", "VR Headset", "Angel Halo", "None", "Pet Companion"];

  return [
    { type: "Background", value: backgrounds[hash % backgrounds.length] },
    { type: "Eyes", value: eyes[(hash >> 2) % eyes.length] },
    { type: "Outfit", value: clothes[(hash >> 4) % clothes.length] },
    { type: "Accessory", value: accessories[(hash >> 6) % accessories.length] }
  ];
}

/**
 * Calculates trait frequency based on the active collection,
 * with a deterministic fallback for small/empty collections.
 */
export function getTraitFrequency(trait, allNfts = []) {
  if (!trait || !trait.type || !trait.value) return 1.0;

  const type = trait.type.toLowerCase().trim();
  const value = trait.value.toLowerCase().trim();

  // If we have a collection of NFTs, calculate actual frequency
  if (allNfts && allNfts.length > 0) {
    let matchCount = 0;
    let totalWithTraits = 0;

    allNfts.forEach(nft => {
      const traits = getNFTTraits(nft);
      if (traits && traits.length > 0) {
        totalWithTraits++;
        const hasTrait = traits.some(t => 
          (t.type || "").toLowerCase().trim() === type &&
          (t.value || "").toLowerCase().trim() === value
        );
        if (hasTrait) matchCount++;
      }
    });

    if (totalWithTraits > 0 && matchCount > 0) {
      return matchCount / totalWithTraits;
    }
  }

  // Deterministic fallback based on hashing trait details
  // Generates a mock frequency between 2% and 28% for variety
  const str = `${type}:${value}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const pct = Math.abs(hash % 26) + 2.0; // range: 2% to 28%
  return pct / 100;
}

/**
 * Computes direct rarity score based on the trait list and database frequencies.
 */
export function calculateRarityScore(traits, allNfts = []) {
  if (!traits || !Array.isArray(traits) || traits.length === 0) {
    return 0;
  }

  const score = traits.reduce((acc, trait) => {
    const normalised = {
      type: trait.type || trait.trait_type || "",
      value: trait.value || ""
    };
    const freq = getTraitFrequency(normalised, allNfts);
    
    // rarityScore formula: score + (1 / frequency * 100)
    return acc + (1 / freq * 100);
  }, 0);

  return Math.round(score);
}

/**
 * Determines rarity tier and styling attributes based on score.
 * Tiers:
 *   Score > 300 ➔ 💎 Legendary (red badge)
 *   Score > 200 ➔ ⚡ Epic (purple badge)
 *   Score > 100 ➔ 🔥 Rare (blue badge)
 *   Score > 50  ➔ ✨ Uncommon (green badge)
 *   Score < 50  ➔ ○ Common (grey badge)
 */
export function getRarityTier(score) {
  if (score >= 300) {
    return {
      name: "Legendary",
      badge: "💎 Legendary",
      color: "#ef4444", // red badge
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.35)",
    };
  } else if (score >= 200) {
    return {
      name: "Epic",
      badge: "⚡ Epic",
      color: "#a78bfa", // purple badge
      bg: "rgba(167, 139, 250, 0.15)",
      border: "rgba(167, 139, 250, 0.35)",
    };
  } else if (score >= 100) {
    return {
      name: "Rare",
      badge: "🔥 Rare",
      color: "#3b82f6", // blue badge
      bg: "rgba(59, 130, 246, 0.15)",
      border: "rgba(59, 130, 246, 0.35)",
    };
  } else if (score >= 50) {
    return {
      name: "Uncommon",
      badge: "✨ Uncommon",
      color: "#10b981", // green badge
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.35)",
    };
  } else {
    return {
      name: "Common",
      badge: "○ Common",
      color: "#94a3b8", // grey badge
      bg: "rgba(148, 163, 184, 0.15)",
      border: "rgba(148, 163, 184, 0.35)",
    };
  }
}
