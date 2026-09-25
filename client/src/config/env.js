/**
 * Centralized environment configuration (Vite `import.meta.env`).
 * Every VITE_* variable is accessed here and nowhere else.
 *
 * Only PUBLIC, non-secret values belong here: RPC endpoints, explorer URLs
 * and contract addresses. Private keys must never be placed in VITE_*
 * variables — they are compiled into the public JS bundle.
 */
export const env = {
  sepoliaRpcUrl:
    import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  localRpcUrl: import.meta.env.VITE_LOCAL_RPC_URL || "http://127.0.0.1:8545",
  sepoliaExplorer: import.meta.env.VITE_SEPOLIA_EXPLORER || "https://sepolia.etherscan.io",
  registryAddressSepolia: import.meta.env.VITE_REGISTRY_ADDRESS_SEPOLIA || "",
  registryAddressLocal: import.meta.env.VITE_REGISTRY_ADDRESS_LOCAL || "",
};
