/**
 * User Feedback: Reducing load times - Parallel NFT fetching
 * Optimization: Promise.all() used for parallel data fetching
 * - All NFT owner/name/image calls run simultaneously
 * - Reduces load time from O(n) sequential to O(1) parallel
 * - Significant improvement for wallets with 10+ NFTs
 */


import {
  rpc,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
  Account,
} from "@stellar/stellar-sdk";

import { signTransaction } from "@stellar/freighter-api";

import {
  CONTRACT_ID,
  NETWORK,
  NETWORK_PASSPHRASE,
  SOROBAN_SERVER,
} from "../constants";

export const mintNFT = async (walletAddress, name, imageId) => {
  try {
    if (!walletAddress) {
      return { status: "FAILED", error: "Wallet not connected." };
    }
    // Symbols in Soroban are case-sensitive and have length limits.
    const cleanName =
      name?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32) || "";
    const cleanImage =
      imageId?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32) || "";

    if (!cleanName || !cleanImage) {
      return { status: "FAILED", error: "Invalid name or image ID." };
    }

    const sourceAccount = await SOROBAN_SERVER.getAccount(walletAddress);
    const contract = new Contract(CONTRACT_ID);

    // Based on the MismatchingParameterLen error, it's likely the deployed
    // contract expects 3 arguments, assuming the owner is the minter.
    const operation = contract.call(
      "mint_nft",
      new Address(walletAddress).toScVal(), // minter
      nativeToScVal(cleanName, { type: "symbol" }),
      nativeToScVal(cleanImage, { type: "symbol" })
    );
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    const simulation = await SOROBAN_SERVER.simulateTransaction(tx);

    if (!simulation || rpc.Api.isSimulationError(simulation)) {
      console.error("Simulation error:", simulation);
      const errorDetail = simulation.error || "Simulation failed.";
      return { status: "FAILED", error: `Transaction simulation failed: ${errorDetail}` };
    }

    // Assemble the transaction with the simulation results.
    const preparedTx = rpc.assembleTransaction(tx, simulation).build();



    const signedXdr = await signTransaction(preparedTx.toXDR(), {
      network: NETWORK,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    // Freighter might return object
    const signedXdrString =
      typeof signedXdr === "object" && signedXdr.signedTxXdr
        ? signedXdr.signedTxXdr
        : signedXdr;

    // Convert back to Transaction
    const signedTx = TransactionBuilder.fromXDR(
      signedXdrString,
      NETWORK_PASSPHRASE
    );

    // NOW send transaction object
    const sendResponse = await SOROBAN_SERVER.sendTransaction(
      signedTx
    );


    // Poll the network to wait for the transaction to be confirmed.
    let getResponse = await SOROBAN_SERVER.getTransaction(sendResponse.hash);
    while (getResponse.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getResponse = await SOROBAN_SERVER.getTransaction(sendResponse.hash);
    }

    if (getResponse.status === "SUCCESS") {
      return { status: "SUCCESS", hash: sendResponse.hash };
    } else {
      console.error("Transaction failed after submission:", getResponse);
      return { status: "FAILED", error: "Transaction failed after submission." };
    }
  } catch (error) {
    console.error("Mint error:", error);
    if (error?.message?.includes("denied by the user")) {
      return { status: "CANCELLED", error: "Transaction rejected by user." };
    }
    return { status: "FAILED", error: error.message || "An unknown error occurred." };
  }
};

/**
 * Performs a read-only contract call simulation.
 * @param {string} sourceAddress - A valid Stellar address for the dummy source account.
 * @param {import("@stellar/stellar-sdk").Operation.InvokeHostFunction} operation - The contract call operation.
 * @returns {Promise<any>} The native value of the simulation result, or null on failure.
 */
const performReadOnlyCall = async (sourceAddress, operation) => {
  const dummyAccount = new Account(sourceAddress, "0");

  const tx = new TransactionBuilder(dummyAccount, {
    fee: "0",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simulation = await SOROBAN_SERVER.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation) || !simulation.result?.retval) {
    return null;
  }

  return scValToNative(simulation.result.retval);
};

/**
 * For production apps, consider a more efficient contract design (e.g., a `get_nfts_by_owner` function).
 * @param {string} walletAddress - The address of the owner.
 * @returns {Promise<Array<{id: number, owner: string, name: string, image: string}>>}
 */
export const fetchNFTs = async (walletAddress) => {
  if (!walletAddress) return [];

  const contract = new Contract(CONTRACT_ID);
  try {
    // 1. Get total number of NFTs ever minted.
    const totalNum = await performReadOnlyCall(
      walletAddress,
      contract.call("get_total")
    );

    if (totalNum === null || totalNum === 0) {
      return [];
    }

    const nftPromises = [];
    for (let i = 1; i <= totalNum; i++) {
      // For each ID, create a promise to fetch its owner.
      const nftPromise = (async () => {
        const ownerResult = await performReadOnlyCall(
          walletAddress,
          contract.call("get_owner", nativeToScVal(i, { type: "u32" }))
        );

        const ownerAddress = ownerResult ? new Address(ownerResult).toString() : null;

        // If the owner matches, fetch the name and image for this NFT.
        if (ownerAddress === walletAddress) {
          const [name, image] = await Promise.all([
            performReadOnlyCall(
              walletAddress,
              contract.call("get_name", nativeToScVal(i, { type: "u32" }))
            ),
            performReadOnlyCall(
              walletAddress,
              contract.call("get_image", nativeToScVal(i, { type: "u32" }))
            ),
          ]);
          return { id: i, owner: ownerAddress, name, image };
        }
        return null;
      })();
      nftPromises.push(nftPromise);
    }

    // 2. Wait for all fetches to complete.
    const allNfts = await Promise.all(nftPromises);

    // 3. Filter out nulls (NFTs not owned by the user or errors) and return.
    return allNfts.filter((nft) => nft !== null);
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return []; // Return an empty array on failure.
  }
};

/**
 * Fetch ALL NFTs from contract (for Marketplace — all owners)
 * @param {string} walletAddress - Any valid address for simulation
 * @returns {Promise<Array<{id, owner, name, image}>>}
 */
export const fetchAllNFTs = async (walletAddress) => {
  if (!walletAddress) return [];

  const contract = new Contract(CONTRACT_ID);
  try {
    const totalNum = await performReadOnlyCall(
      walletAddress,
      contract.call("get_total")
    );

    if (totalNum === null || totalNum === 0) return [];

    // Fetch all NFTs in parallel (no owner filter)
    const nftPromises = Array.from({ length: totalNum }, (_, i) => {
      const id = i + 1;
      return (async () => {
        try {
          const ownerResult = await performReadOnlyCall(
            walletAddress,
            contract.call("get_owner", nativeToScVal(id, { type: "u32" }))
          );
          const ownerAddress = ownerResult
            ? new Address(ownerResult).toString()
            : null;
          if (!ownerAddress) return null;

          const [name, image] = await Promise.all([
            performReadOnlyCall(
              walletAddress,
              contract.call("get_name", nativeToScVal(id, { type: "u32" }))
            ),
            performReadOnlyCall(
              walletAddress,
              contract.call("get_image", nativeToScVal(id, { type: "u32" }))
            ),
          ]);
          return { id, owner: ownerAddress, name, image };
        } catch {
          return null;
        }
      })();
    });

    const allNfts = await Promise.all(nftPromises);
    return allNfts.filter(Boolean);
  } catch (error) {
    console.error("Error fetching all NFTs:", error);
    return [];
  }
};
