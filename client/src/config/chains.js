import { env } from "./env";

/**
 * Chain metadata. Sepolia is the public testnet target; 31337 is the local
 * Hardhat node used in development. Both are free, fake-money networks —
 * no mainnet configuration is provided anywhere in this app.
 */
export const SEPOLIA = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  name: "Sepolia",
  label: "Ethereum Sepolia Testnet",
  rpcUrl: env.sepoliaRpcUrl,
  explorer: env.sepoliaExplorer,
  explorerName: "Sepolia Etherscan",
  faucetHint: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
};

export const LOCAL = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  name: "Hardhat Local",
  label: "Hardhat Local Node (dev)",
  rpcUrl: env.localRpcUrl,
  explorer: "",
  explorerName: "",
  faucetHint: "",
};

/** Fallback read RPCs for Sepolia, tried in order if the first fails. */
export const READ_RPC_URLS = [
  env.sepoliaRpcUrl,
  "https://rpc.sepolia.org",
  "https://1rpc.io/sepolia",
];

/** Chains this build can talk to (writes go through the browser wallet). */
export const KNOWN_CHAINS = { [SEPOLIA.chainId]: SEPOLIA, [LOCAL.chainId]: LOCAL };
