import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the compiled CertificateRegistry ABI + deployed address into the
 * React client so the frontend never hard-codes contract details.
 *
 *   node scripts/sync-registry.js local
 *   node scripts/sync-registry.js sepolia
 *
 * Reads:
 *   artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json
 *   deployments.registry.local.json  or  deployments.registry.sepolia.json
 *     - .env allows overriding the address via REGISTRY_ADDRESS_<NETWORK>
 *
 * Writes:
 *   ../client/src/contract/deployments.registry.json
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const arg = process.argv[2];
if (arg !== "local" && arg !== "sepolia") {
  console.error("Usage: node scripts/sync-registry.js <local|sepolia>");
  process.exit(1);
}

const chainId = arg === "sepolia" ? 11155111 : 31337;

const artifactPath = resolve(__dirname, "../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json");
if (!existsSync(artifactPath)) {
  console.error("Compiled artifact not found. Run `npm run compile` first.");
  process.exit(1);
}
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

let address = process.env[`REGISTRY_ADDRESS_${arg.toUpperCase()}`] || "";
let fromBlock = undefined;
let institutionId = undefined;
let institutionName = undefined;
const deploymentFile =
  arg === "local"
    ? resolve(__dirname, "../deployments.registry.local.json")
    : resolve(__dirname, "../deployments.registry.sepolia.json");
if (existsSync(deploymentFile)) {
  try {
    const entry = JSON.parse(readFileSync(deploymentFile, "utf8")).CertificateRegistry;
    address = address || entry?.address || "";
    fromBlock = entry?.fromBlock;
    institutionId = entry?.institutionId;
    institutionName = entry?.institutionName;
  } catch {
    /* fall through to address check */
  }
}
if (!address) {
  console.error(
    `No deployed address found for "${arg}".\n` +
      (arg === "local"
        ? "Run `npm run deploy:registry:local` first (with the local node running)."
        : "Run `npm run deploy:registry:sepolia` first, or set REGISTRY_ADDRESS_SEPOLIA in .env.")
  );
  process.exit(1);
}

const outPath = resolve(__dirname, "../../client/src/contract/deployments.registry.json");
let existing = {};
if (existsSync(outPath)) {
  try {
    existing = JSON.parse(readFileSync(outPath, "utf8"));
  } catch {
    existing = {};
  }
}

const output = {
  ...existing,
  CertificateRegistry: {
    ...existing.CertificateRegistry,
    abi: artifact.abi,
    fromBlock: fromBlock ?? existing.CertificateRegistry?.fromBlock,
    defaultInstitution: {
      id: institutionId ?? existing.CertificateRegistry?.defaultInstitution?.id,
      name: institutionName ?? existing.CertificateRegistry?.defaultInstitution?.name,
    },
    addresses: {
      ...(existing.CertificateRegistry?.addresses || {}),
      [chainId]: address,
    },
  },
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

console.log(`Synced CertificateRegistry artifact into the client for network "${arg}"`);
console.log(`  chainId:     ${chainId}`);
console.log(`  address:     ${address}`);
console.log(`  institution: ${institutionName ?? "—"} (id ${institutionId ?? "—"})`);
console.log(`  file:        ${outPath}`);
