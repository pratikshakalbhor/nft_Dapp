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

export const checkConnection = async () => {
  try {
    const result = await isConnected();
    const freighterInstalled =
      typeof result === "boolean" ? result : result?.isConnected === true;
    const isXBullInstalled = !!(window.xBull || window.xbull);
    return { freighter: freighterInstalled, xbull: isXBullInstalled };
  } catch {
    return { freighter: false, xbull: false };
  }
};

export const connectFreighter = async () => {
  const connCheck = await isConnected();
  const installed =
    typeof connCheck === "boolean" ? connCheck : connCheck?.isConnected === true;

  if (!installed) throw new Error("Freighter not installed");

  await requestAccess();

  const addrResult = await getAddress();
  const address =
    typeof addrResult === "string" ? addrResult : addrResult?.address;

  if (!address) throw new Error("Could not retrieve public key from Freighter");
  return { address, type: WALLET_TYPES.FREIGHTER };
};

export const connectAlbedo = async () => {
  const res = await albedo.publicKey({});
  if (!res.pubkey) throw new Error("Albedo connection rejected");
  return { address: res.pubkey, type: WALLET_TYPES.ALBEDO };
};

export const connectXBull = async () => {
  const connector = window.xBull || window.xbull;
  if (!connector) throw new Error("xBull not installed");
  const address = await connector.getPublicKey();
  return { address, type: WALLET_TYPES.XBULL };
};

export const signTransaction = async (xdr, optsOrWalletType = {}, networkArg, networkPassphraseArg) => {
  let walletType, network, networkPassphrase, address;

  if (typeof optsOrWalletType === "string") {
    walletType = optsOrWalletType;
    network = networkArg;
    networkPassphrase = networkPassphraseArg;
  } else {
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
