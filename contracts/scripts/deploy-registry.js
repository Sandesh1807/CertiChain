import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

/**
 * Deploys CertificateRegistry and records { address, fromBlock } for tooling.
 *
 * Optional env vars:
 *   REGISTRY_INSTITUTION   — public institution name to register at deploy
 *                            time (default: "CertiChain Demo University").
 *   REGISTRY_EXTRA_ISSUERS — comma-separated wallets to whitelist as issuers
 *                            bound to the institution above,
 *                            e.g. REGISTRY_EXTRA_ISSUERS=0xabc...,0xdef...
 *
 * Usage:
 *   npm run deploy:registry:local
 *   npm run deploy:registry:sepolia
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

const { ethers } = await network.create();

const institutionName = process.env.REGISTRY_INSTITUTION || "CertiChain Demo University";
const extraIssuers = (process.env.REGISTRY_EXTRA_ISSUERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const [deployer] = await ethers.getSigners();

if (!deployer) {
  console.error(
    "\nNo deployer account is configured for this network.\n" +
      "The `sepolia` network in hardhat.config.js reads SEPOLIA_PRIVATE_KEY from contracts/.env\n" +
      "(see .env.example). Fill it with a BURNER wallet key funded with Sepolia ETH from a faucet,\n" +
      "then re-run the deploy command. Nothing was sent on-chain.\n"
  );
  process.exit(1);
}

console.log("Deploying CertificateRegistry with deployer:", deployer.address);

const registry = await ethers.deployContract("CertificateRegistry");
await registry.waitForDeployment();

const address = await registry.getAddress();
console.log("CertificateRegistry deployed to:", address);

// Register the institution and whitelist the deployer as its first issuer.
const tx1 = await registry.registerInstitution(institutionName);
await tx1.wait(1);
// Institution ids are sequential starting at 1, so the count after a fresh
// registration is exactly the id we just created.
const id = await registry.institutionCount();
console.log(`Institution registered: "${institutionName}" (id ${id})`);

const addTx = await registry.addIssuer(deployer.address, id);
await addTx.wait(1);
console.log("Deployer whitelisted as issuer for institution", id);

for (const issuer of extraIssuers) {
  const tx = await registry.addIssuer(issuer, id);
  await tx.wait(1);
  console.log("  issuer added:", issuer);
}

// Record deployment info so sync scripts and the client can use it.
const chainId = Number((await ethers.provider.getNetwork()).chainId);
const isSepolia = chainId === 11155111;
const fileName = isSepolia ? "deployments.registry.sepolia.json" : "deployments.registry.local.json";
const outFile = resolve(__dirname, "..", fileName);
const fromBlock = await ethers.provider.getBlockNumber();
writeFileSync(
  outFile,
  JSON.stringify(
    {
      CertificateRegistry: { address, fromBlock, chainId, institutionId: Number(id), institutionName },
    },
    null,
    2
  ) + "\n"
);
console.log("Recorded deployment in", fileName);
console.log("\nNext: run the tests against a live node or wire the frontend (not yet).");
