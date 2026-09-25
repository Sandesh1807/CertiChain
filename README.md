# CertiChain 🎓

**Issue tamper-proof academic certificates on Ethereum and let anyone verify them in seconds — with a QR code, no wallet, and no backend to trust.**

[![CI](https://img.shields.io/badge/CI-compile%20%2B%20tests%20%2B%20build-10b981)](.github/workflows/ci.yml) [![Tests](https://img.shields.io/badge/contract%20tests-24%20passing-10b981)](contracts/test/CertificateRegistry.test.js) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 📖 Contents

1. [Problem statement](#-problem-statement) · 2. [Our solution](#-our-solution) · 3. [Why blockchain is necessary](#-why-blockchain-is-necessary) · 4. [Key features](#-key-features) · 5. [Architecture](#-architecture) · 6. [Technology stack](#-technology-stack) · 7. [Smart contract explanation](#-smart-contract-explanation) · 8. [User flow](#-user-flow) · 9. [Installation](#-installation) · 10. [Environment variables](#-environment-variables) · 11. [Local development](#-local-development) · 12. [Smart contract deployment](#-smart-contract-deployment) · 13. [Testnet configuration](#-testnet-configuration) · 14. [Testing issuance](#-how-to-test-certificate-issuance) · 15. [Verifying a certificate](#-how-to-verify-a-certificate) · 16. [Security considerations](#-security-considerations) · 17. [Future improvements](#-future-improvements) · 18. [Hackathon information](#-hackathon-information)

---

## 🔴 Problem statement

Fake degrees and doctored certificates are trivial to produce. Employers, universities and
scholarship boards verify credentials through slow, manual processes — phone calls, registrar
emails, signed letters — that take days or weeks. Centralized digital-credential platforms only
move the problem: their databases can be edited, their companies can shut down, and verifiers
must simply trust them.

## 🟢 Our solution

CertiChain is a **self-verifying credential registry** that runs entirely on the Ethereum
Sepolia testnet:

- **Colleges issue** certificates from their own whitelisted wallet — one transaction per
  certificate, permanent and public.
- **Anyone verifies** by typing the certificate ID or scanning the printed QR code. The app
  reads the blockchain directly through a free public RPC: **no account, no wallet, no middleman**.
- **Revocation** follows a real-world dispute flow — the issuing institution or the platform
  owner can publicly revoke, and that revocation is permanent.
- **Privacy by design**: student identities never touch the chain, not even in transaction
  calldata. Only keccak256 commitments do (see below).

## ⛓️ Why blockchain is necessary

| Property | Central database | CertiChain |
|---|---|---|
| Can records be edited retroactively? | Yes, silently | No — only a visible revocation can change status |
| Who must be trusted? | The company running the server | Nobody — verifiers read the chain themselves |
| Verification latency | Days (calls/emails) | Seconds (one RPC read) |
| If the vendor disappears | Records lost | Chain history remains, independently readable |
| Tamper evidence | None (soft-delete logs at best) | Cryptographic: every issuance/revocation is a signed, timestamped event |

A blockchain is not decoration here — the certificate's existence, content commitment, issuer
and revocation state live in a smart contract that any third party can query **without asking
CertiChain for permission**. That is the entire point.

## ✨ Key features

- 🏛️ **Issue from a college wallet** — whitelisted issuers record ID, student commit, course
  commit and issue date in one transaction, with an honest pending → mined → confirmed lifecycle
- 🔍 **Verify in seconds** — by ID, camera QR scan, or QR screenshot upload; instant
  **✓ Verified / ⚠ Revoked / ✕ Not found** verdict read live from the contract
- 📄 **Certificate page + printable QR** — shareable preview with a downloadable PNG certificate
- 🛡️ **Public revocation** with a short reason, permanently on-chain
- 👥 **Multi-college registry** — the owner whitelists institutional wallets, each bound to
  its institution's public name
- 🕵️ **Privacy-first** — plaintext student/course labels stay in the issuer's browser only;
  the chain holds keccak256 commits, and the UI labels any locally-sourced plaintext as
  "locally stored"
- 🧪 **24 contract unit tests**, CI on every push, production build verified

## 🏗️ Architecture

```
┌──────────────┐  issue / revoke (signed txs)  ┌────────────────────────────┐
│   College    │ ────────────────────────────▶ │  MetaMask (browser wallet) │
│   (browser)  │ ◀──────────────────────────── └────────────────────────────┘
└──────────────┘         tx status lifecycle
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ CertificateRegistry.sol  │  owner → institutions → issuers
                    │  on Sepolia / local node │  storage keyed by keccak256(certId)
                    └──────────────────────────┘  events: CertificateIssued / Revoked
                               ▲
┌──────────────┐  verifyCertificate()     ┌────────────────────────────┐
│   Verifier   │ ───────────────────────▶ │  free public RPC (keyless) │
│ (any device) │ ◀── VALID/REVOKED/ ───── └────────────────────────────┘
└──────────────┘      NOT_FOUND
        ▲
        └── scans QR → https://…/#/verify/CERT-2026-0001
```

- **Writes** always go through the user's own browser wallet; the app never holds keys.
- **Reads** are keyless and wallet-free, so a recruiter's phone can verify anything.
- The deploy pipeline syncs the compiled **ABI + address + deploy block** into
  `client/src/contract/deployments.registry.json` — the frontend never hard-codes contract data.

## 🧰 Technology stack

| Layer | Tools |
|---|---|
| Smart contract | Solidity 0.8.28, custom errors, packed storage |
| Chain tooling | Hardhat 3, ethers v6, 24 mocha/chai tests |
| Frontend | React 19, Vite 7, Tailwind CSS v4, lucide-react icons |
| Wallet | EIP-1193 (MetaMask & friends), EIP-6963 provider discovery |
| QR | `qrcode` (generation, PNG export) · `html5-qrcode` (camera + file scanning) |
| Hosting | GitHub Pages via GitHub Actions; CI runs compile + tests + build |

## 📜 Smart contract explanation

`contracts/contracts/CertificateRegistry.sol` — one contract is the whole system.

**Roles**
- `owner` (deployer): registers institutions, whitelists/removes issuer wallets.
- `issuers`: whitelisted wallets, each bound to one institution id; only they can issue.
- `public`: can read everything and verify, permissionlessly.

**Core functions**

```solidity
registerInstitution(name)                                    // onlyOwner, idempotent
addIssuer(issuer, institutionId) / removeIssuer(issuer)      // onlyOwner
issueCertificate(certId, studentHash, certHash, issueDate)   // onlyIssuer
revokeCertificate(certId, reason)                            // issuing issuer or owner
verifyCertificate(certId) → (ok, status, issuer, institutionId, studentHash, certHash)
isCertificateValid(certId) → (bool, "VALID" | "REVOKED" | "NOT_FOUND")
getInstitution(id) · institutionCount()
```

**Design decisions**

- **Storage keyed by `keccak256(certId)`** — guessable IDs like `CERT-2026-0001` never become
  storage keys; the raw ID appears only in event data for off-chain indexing.
- **Privacy commitments**: `studentHash` and `certHash` arrive as pre-computed `bytes32`
  keccak256 commits. The raw student identifier is *never* in calldata, storage or events.
- **Duplicate protection**: a second issuance of the same ID reverts with `DuplicateCertId` —
  uniqueness is enforced by the chain, not by the UI.
- **Honest revocation**: sets a flag, emits `CertificateRevoked(certId, revokedAt, by, reason)`;
  revoking twice reverts with `AlreadyRevoked`.
- **Input validation**: empty/oversized IDs (≤ 64) and strings (≤ 96), zero hashes, and
  absurdly future issue dates (> 1 year) all revert with specific custom errors
  (`EmptyInput`, `TooLong`, `FutureIssueDate`, …) that the UI decodes into friendly messages.
- **No owner upgrade path, no pausing, no proxy** — deliberately minimal for a trust product.

## 🚶 User flow

**Issuer (college)**
1. Connect wallet → the app detects the network (Sepolia or local dev chain).
2. Fill Certificate ID (auto-generated, unique), student identifier, course, issue date.
3. Confirm in the wallet → live lifecycle: *sign → mining → confirmed*, with tx hash.
4. Download the printable QR / certificate; the dashboard lists everything issued by that
   wallet, read back from on-chain events, with one-click revoke.

**Verifier (recruiter, anyone)**
1. Scan the QR (or open the link, or type the ID) at `/#/verify/<ID>`.
2. The page reads `verifyCertificate()` from the contract via a public RPC — no wallet needed.
3. Verdict card shows status, institution, issue date, issuer wallet, on-chain hashes and the
   issuing transaction. A revoked certificate shows its public reason.

## 📦 Installation

Prerequisites: **Node.js ≥ 22** and MetaMask (or any EVM browser wallet).

```bash
git clone <your-repo-url> certichain
cd certichain
npm run install:all        # installs ./contracts and ./client
```

## 🔐 Environment variables

No secrets are committed or needed to run locally. Copy the provided templates:

```bash
cp contracts/.env.example contracts/.env   # only needed for Sepolia deployment
cp client/.env.example client/.env         # optional — sensible defaults built in
```

| Variable | Where | Purpose | Secret? |
|---|---|---|---|
| `SEPOLIA_PRIVATE_KEY` | contracts | Deployer/issuer wallet key for testnet deploys. **Use a burner.** | ⚠️ Yes — never commit |
| `SEPOLIA_RPC_URL` | contracts | Optional private RPC (Alchemy/Infura) | No |
| `ETHERSCAN_API_KEY` | contracts | Optional source verification | No |
| `REGISTRY_INSTITUTION` | contracts | Institution name registered at deploy | No |
| `REGISTRY_EXTRA_ISSUERS` | contracts | Comma-separated wallets to whitelist at deploy | No |
| `VITE_SEPOLIA_RPC_URL` | client | Public read RPC for verification | No |
| `VITE_LOCAL_RPC_URL` | client | Local node RPC (default `http://127.0.0.1:8545`) | No |
| `VITE_SEPOLIA_EXPLORER` | client | Explorer base URL for links | No |
| `VITE_REGISTRY_ADDRESS_SEPOLIA` / `_LOCAL` | client | Optional address overrides | No |

Every client `VITE_*` value is **public by nature** — it ends up in the browser bundle. The
repository contains no private keys and no API secrets.

## 💻 Local development

```bash
# Terminal 1 — local chain (10000 funded test accounts, no faucet needed)
npm run chain

# Terminal 2 — deploy the registry + seed demo data
npm run deploy:registry:local
npm run seed:local          # mints CERT-2026-0001…0003 and revokes 0003 for the demo

# Terminal 3 — the app
npm run dev                 # http://localhost:5173
```

In MetaMask: import a test account using one of the **local node's printed private keys**
(those keys only exist on your ephemeral local chain), add network `http://127.0.0.1:8545`
(chain id `31337`), then open the Dashboard.

## 🚀 Smart contract deployment

```bash
cd contracts
npm run deploy:registry:local     # local node
npm run deploy:registry:sepolia   # Sepolia (needs SEPOLIA_PRIVATE_KEY in contracts/.env)
npm run sync:registry:sepolia     # copy ABI + address into the client
```

The deploy script registers the institution (default "CertiChain Demo University",
override with `REGISTRY_INSTITUTION`), whitelists the deployer as its first issuer
(plus any `REGISTRY_EXTRA_ISSUERS`), and records `{ address, fromBlock, institutionId }`
for the client and event indexing.

## 🌐 Testnet configuration

- **Network**: Ethereum Sepolia (chain id `11155111`). The local dev chain is `31337`.
- **Faucets** (free test ETH): [Google Cloud Web3](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) · [Alchemy](https://www.alchemy.com/faucets/ethereum-sepolia) · [PoW faucet](https://sepolia-faucet.pk910.de/)
- **Explorer**: [sepolia.etherscan.io](https://sepolia.etherscan.io) — every issuance/revocation
  in the UI deep-links to its transaction.
- **GitHub Pages**: `.github/workflows/deploy-pages.yml` builds and publishes the client on
  push to `main`. Set the repository variable `CERTICHAIN_ADDRESS_SEPOLIA` to bake your
  deployed address into the public build.

## 🧾 How to test certificate issuance

1. Open `/#/dashboard` and connect a **whitelisted** wallet (the deployer works out of the box).
2. The Certificate ID is pre-generated and unique; fill student identifier + course + date.
3. Confirm in your wallet and watch the honest lifecycle: *pending → confirming → success* —
   success appears **only after the chain reports a mined receipt with status 1**.
4. Expected results:
   - **Success card** with the tx hash and links to the certificate page + QR.
   - **Duplicate ID** (e.g. `CERT-2026-0001`): friendly *"already exists on-chain"* error with a
     one-click "generate a fresh ID" recovery — no funds wasted on a reverting tx if the wallet
     estimates first.
   - **Wallet rejection** (press Reject in MetaMask): *"Transaction was rejected in your wallet.
     Nothing was sent on-chain."* — and no traces left in the UI or storage.
   - **Empty form**: blocked by native validation before any transaction is created.

## 🔍 How to verify a certificate

1. Open `/#/verify` — no wallet needed.
2. Enter an ID (e.g. the seeded `CERT-2026-0001`) or scan/upload a certificate's QR code.
3. Expected results:
   - `CERT-2026-0001` → **✓ Certificate Verified** with all nine fields (ID, student,
     certificate/course, institution, issue date, issuer wallet, certificate hash, blockchain
     transaction, network) read live from the contract.
   - `CERT-2026-0003` → **⚠ Certificate Revoked** with the public reason ("forgery reported").
   - Any unknown ID → **✕ Certificate Not Found** with no fabricated data.
   - Chain unreachable → a friendly "Can't reach the blockchain network…" error with a Retry button.
4. Independent check: paste the Certificate Hash preimage rule from
   `client/src/lib/hashing.js` into any keccak tool and compare against the on-chain commit.

## 🛡️ Security considerations

- **No keys in the repo** — CI and manual sweeps scan for key patterns; the Sepolia deploy key
  lives only in a gitignored `.env` and must be a burner. The client holds no keys at all;
  every write is signed by the user's own wallet.
- **Privacy by architecture** — student identifiers are hashed in the browser before they are
  ever submitted; only 32-byte commits are on-chain; plaintext labels stay in localStorage and
  are visibly marked "locally stored" wherever they appear.
- **Contract-level guarantees** — issuer whitelist, per-issuer institution binding, duplicate
  ID reversion, revocation restricted to the issuing issuer or owner, bounded inputs,
  custom errors for precise client handling, no delegatecalls or upgrade hooks.
- **Reads are trustless** — verification uses keyless public RPCs; the verdict is the
  contract's own answer, never data stored by this app.
- **Known MVP limits** — the owner key is a single point of administrative control (issuer
  whitelist, revocation override); a production system would use a multisig. Local records are
  per-browser convenience data and are never trusted for verification.

## 🔮 Future improvements

- IPFS/off-chain metadata anchored by the on-chain commit (rich certificates, still private)
- Soulbound ERC-721 variant for wallet-portable credentials
- Batch/CSV issuing and a full organization registry with multiple admins (multisig owner)
- Event indexer (subgraph) for analytics and public search
- Etherscan source verification in CI; Sepolia main-demo deployment script

## 🏆 Hackathon information

- **Project**: CertiChain — blockchain certificate verification
- **Category / track**: Web3 / identity & credentials (hackathon MVP)
- **What's working end-to-end**: issuance with honest tx lifecycle, verification by ID/QR
  (camera + upload), revocation flow, multi-college whitelist admin, downloadable certificate,
  24 contract tests, CI + Pages deployment pipeline.
- **Demo script (3 minutes)**:
  1. *Problem* (30s) — forged PDFs, days-long verification.
  2. *Issue* (60s) — connect wallet → issue a certificate live → show the tx and QR.
  3. *Verify* (60s) — scan the QR on a phone → green ✓ Verified, all fields from the chain.
  4. *Tamper story* (30s) — "edit the PDF" → nothing on-chain changed.
  5. *Revoke* (30s) — revoke from the dashboard → verify again → ⚠ Revoked with reason.

Built as an open hackathon MVP. **License**: MIT — see [LICENSE](./LICENSE).
