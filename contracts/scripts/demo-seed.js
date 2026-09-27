import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

/**
 * Seeds the local CertificateRegistry with demo certificates for the Verify
 * page, then revokes one so the ⚠ revoked verdict can be demonstrated.
 *
 *   npm run seed:verify:local
 *
 * Certificates (all issued by the deployer = whitelisted issuer):
 *   CERT-2026-0001  student:ada:roll-42    B.Tech Computer Science
 *   CERT-2026-0002  student:grace:roll-17  M.Sc Mathematics
 *   CERT-2026-0003  student:alan:roll-03   B.Sc Physics   (then REVOKED)
 *
 * Hashes follow the canonical client formats in client/src/lib/hashing.js:
 *   studentHash = keccak256("certichain:student:v1:" + identifier)
 *   certHash    = keccak256("certichain:cert:v1:" + course + "|" + institution
 *                             + "|" + yyyy-mm-dd)
 */
const { ethers } = await network.create();
const IS_SEPOLIA =
  Number((await ethers.provider.getNetwork()).chainId) === 11155111;
const INSTITUTION = "CertiChain Demo University";
const ISSUE_DATE = 1787000000n; // matches the canonical demo issue date
const ISSUE_DATE_ISO = "2026-09-23";

const certs = [
  { certId: "CERT-2026-0001", student: "student:ada:roll-42", course: "B.Tech Computer Science" },
  { certId: "CERT-2026-0002", student: "student:grace:roll-17", course: "M.Sc Mathematics" },
  { certId: "CERT-2026-0003", student: "student:alan:roll-03", course: "B.Sc Physics" },
];

const studentCommit = (id) => ethers.keccak256(ethers.toUtf8Bytes(`certichain:student:v1:${id.trim()}`));
const certCommit = (course) =>
  ethers.keccak256(ethers.toUtf8Bytes(`certichain:cert:v1:${course.trim()}|${INSTITUTION}|${ISSUE_DATE_ISO}`));

const [deployer] = await ethers.getSigners();
if (!deployer) {
  console.error(
    "\nNo signer available for network " +
      (IS_SEPOLIA ? "11155111 (sepolia)" : "31337 (local)") +
      ".\nSet SEPOLIA_PRIVATE_KEY in contracts/.env (burner wallet only) and re-run."
  );
  process.exit(1);
}
const deploymentFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  IS_SEPOLIA ? "deployments.registry.sepolia.json" : "deployments.registry.local.json"
);
if (!existsSync(deploymentFile)) {
  console.error(
    `\nDeployment record not found: ${deploymentFile}\n` +
      `Deploy first (npm run deploy:registry:${IS_SEPOLIA ? "sepolia" : "local"}) or set REGISTRY_ADDRESS.`
  );
  process.exit(1);
}
const registryAddress =
  process.env.REGISTRY_ADDRESS || JSON.parse(readFileSync(deploymentFile, "utf8")).CertificateRegistry.address;
const registry = await ethers.getContractAt("CertificateRegistry", registryAddress);

const myNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
let i = 0;
const sent = [];
for (const c of certs) {
  const tx = await registry
    .connect(deployer)
    .issueCertificate(c.certId, studentCommit(c.student), certCommit(c.course), ISSUE_DATE, { nonce: myNonce + i });
  sent.push({ certId: c.certId, tx });
  i++;
}
for (const { certId, tx } of sent) {
  const receipt = await tx.wait(1);
  if (receipt.status !== 1) throw new Error(`issue ${certId} failed`);
  console.log(`issued ${certId}  tx=${receipt.hash}`);
}

// Revoke the third one so the revoked verdict has a real on-chain example.
const revTx = await registry
  .connect(deployer)
  .revokeCertificate("CERT-2026-0003", "forgery reported", { nonce: myNonce + i });
const revReceipt = await revTx.wait(1);
if (revReceipt.status !== 1) throw new Error("revoke failed");
console.log(`revoked CERT-2026-0003  tx=${revReceipt.hash}`);

for (const c of certs) {
  const [ok, status, issuer, instId] = await registry.verifyCertificate(c.certId);
  console.log(`verify ${c.certId}: ok=${ok} status=${status} issuer=${issuer} institution=${instId}`);
}
console.log("done");
