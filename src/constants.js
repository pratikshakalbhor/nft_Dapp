import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const CONTRACT_ID = "CBFGZCD2HZK35OAP7MCX3JEEHKGQLUSEOG3SPPCU43PTWEIOGFKEEPVC";
export const ESCROW_CONTRACT_ID = "CBNGQSH743IQE7JMT3YFPC4J4LNO4B73HHP2NAHDGIPD3TVL6WI7A2S3";
// Native XLM Stellar Asset Contract (SAC) on testnet — used by true-escrow to lock/release XLM
export const NATIVE_XLM_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL);