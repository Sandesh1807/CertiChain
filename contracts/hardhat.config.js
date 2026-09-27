import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import dotenv from "dotenv";

// Load contracts/.env (gitignored) so SEPOLIA_* never appear in this file or
// in the repo. Precedence: real environment variables win over .env values.
// (Hardhat 3 also injects .env natively; explicit dotenv keeps this true
// regardless of Hardhat version.)
dotenv.config();

// Never commit a real key: SEPOLIA_PRIVATE_KEY lives only in contracts/.env
// (gitignored). Use a burner wallet funded with testnet ETH from a faucet.
const SEPOLIA_PRIVATE_KEY = (process.env.SEPOLIA_PRIVATE_KEY || "").trim();
const SEPOLIA_RPC_URL =
  (process.env.SEPOLIA_RPC_URL || "").trim() || "https://ethereum-sepolia-rpc.publicnode.com";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local node for faucet-free development: `npm run chain`, then
    // `npm run deploy:local` in a second terminal.
    localhost: {
      type: "http",
      chainType: "l1",
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
      // Empty when unset: `getSigners()` returns [] and the deploy script
      // exits with a clear setup message instead of a cryptic TypeError.
      accounts: SEPOLIA_PRIVATE_KEY ? [SEPOLIA_PRIVATE_KEY] : [],
    },
  },
  test: {
    mocha: {
      timeout: 30_000,
    },
  },
});
