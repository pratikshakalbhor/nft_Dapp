import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSignTx,
} from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";

export const WALLET_TYPES = {
  FREIGHTER: "FREIGHTER",
  ALBEDO: "ALBEDO",
  XBULL: "XBULL",
};

// ── Detect installed wallets ──────────────────────────────────────────────────
export const checkConnection = async () => {
  try {
    const result = await isConnected();
    // v2+: returns { isConnected: boolean }, v1: returns boolean directly
    const freighterInstalled =
      typeof result === "boolean" ? result : result?.isConnected === true;
    const isXBullInstalled = !!(window.xBull || window.xbull);
    return { freighter: freighterInstalled, xbull: isXBullInstalled };
  } catch {
    return { freighter: false, xbull: false };
  }
};

// ── Freighter ─────────────────────────────────────────────────────────────────
export const connectFreighter = async () => {
  const connCheck = await isConnected();
  const installed =
    typeof connCheck === "boolean" ? connCheck : connCheck?.isConnected === true;

  if (!installed) throw new Error("Freighter not installed");

  // requestAccess prompts the user to allow access
  await requestAccess();

  // getAddress returns { address: string } in v6
  const addrResult = await getAddress();
  const address =
    typeof addrResult === "string" ? addrResult : addrResult?.address;

  if (!address) throw new Error("Could not retrieve public key from Freighter");
  return { address, type: WALLET_TYPES.FREIGHTER };
};

// ── Albedo ────────────────────────────────────────────────────────────────────
export const connectAlbedo = async () => {
  const res = await albedo.publicKey({});
  if (!res.pubkey) throw new Error("Albedo connection rejected");
  return { address: res.pubkey, type: WALLET_TYPES.ALBEDO };
};

// ── xBull ─────────────────────────────────────────────────────────────────────
export const connectXBull = async () => {
  const connector = window.xBull || window.xbull;
  if (!connector) throw new Error("xBull not installed");
  const address = await connector.getPublicKey();
  return { address, type: WALLET_TYPES.XBULL };
};

// ── Sign transaction ──────────────────────────────────────────────────────────
// ✅ NAVA — both positional and object args support:
// Style 1: signTransaction(xdr, walletType, network, passphrase)
// Style 2: signTransaction(xdr, { walletType, network, networkPassphrase })
export const signTransaction = async (xdr, optsOrWalletType = {}, networkArg, networkPassphraseArg) => {
  let walletType, network, networkPassphrase, address;

  if (typeof optsOrWalletType === "string") {
    // Positional args style
    walletType = optsOrWalletType;
    network = networkArg;
    networkPassphrase = networkPassphraseArg;
  } else {
    // Object args style
    walletType = optsOrWalletType.walletType;
    network = optsOrWalletType.network || networkArg;
    networkPassphrase = optsOrWalletType.networkPassphrase || networkPassphraseArg;
    address = optsOrWalletType.address;
  }

  switch (walletType) {
    case WALLET_TYPES.FREIGHTER: {
      const result = await freighterSignTx(xdr, { 
        networkPassphrase: networkPassphrase || network 
      });
      return typeof result === "string" ? result : result?.signedTxXdr;
    }
    case WALLET_TYPES.ALBEDO: {
      const albedoRes = await albedo.tx({
        xdr,
        network: (network || "testnet").toLowerCase(),
      });
      return albedoRes.signed_envelope_xdr || albedoRes.signed_envelope;
    }
    case WALLET_TYPES.XBULL: {
      const xbull = window.xBull || window.xbull;
      if (!xbull) throw new Error("xBull not found");
      return await xbull.signTransaction(xdr, { 
        publicKey: address, 
        network: networkPassphrase || network 
      });
    }
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
};