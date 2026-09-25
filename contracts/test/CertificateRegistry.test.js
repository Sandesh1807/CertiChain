import { expect } from "chai";
import { keccak256, toUtf8Bytes, ZeroHash } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.create();

const NOW = () => Math.floor(Date.now() / 1000);
const hashId = (s) => keccak256(toUtf8Bytes(s));
const STUDENT_HASH = hashId("student:ada-lovelace:roll-42");
const CERT_HASH = hashId("doc:ada-lovelace-btech-cse-v1");

async function deployFixture() {
  const [owner, issuer, other, stranger] = await ethers.getSigners();
  const registry = await ethers.deployContract("CertificateRegistry");
  await registry.waitForDeployment();

  // Register one institution and whitelist `issuer` for it.
  await registry.connect(owner).registerInstitution("National Institute of Technology");
  const institutionId = await registry.institutionCount();
  await registry.connect(owner).addIssuer(issuer.address, institutionId);

  return { registry, owner, issuer, other, stranger, institutionId };
}

async function issueSample(registry, issuer, certId = "CERT-2026-0001", overrides = {}) {
  const tx = await registry.connect(issuer).issueCertificate(
    certId,
    overrides.studentHash ?? STUDENT_HASH,
    overrides.certHash ?? CERT_HASH,
    overrides.issueDate ?? NOW()
  );
  return tx.wait();
}

describe("CertificateRegistry", function () {
  describe("deployment", function () {
    it("sets the deployer as owner and reserves institution index 0", async function () {
      const [owner] = await ethers.getSigners();
      const fresh = await ethers.deployContract("CertificateRegistry");
      await fresh.waitForDeployment();
      expect(await fresh.owner()).to.equal(owner.address);
      expect(await fresh.institutionCount()).to.equal(0n);
      await expect(fresh.getInstitution(0)).to.be.revertedWithCustomError(fresh, "InstitutionNotFound");
    });
  });

  describe("institution & issuer management", function () {
    it("owner can register institutions; duplicate names are idempotent", async function () {
      const { registry, owner } = await deployFixture();
      // The fixture already registered "National Institute of Technology" (id 1).
      expect(await registry.institutionCount()).to.equal(1n);

      const tx = await registry.connect(owner).registerInstitution("IIT Delhi");
      await expect(tx).to.emit(registry, "InstitutionRegistered");
      expect(await registry.institutionCount()).to.equal(2n);

      await registry.connect(owner).registerInstitution("IIT Delhi"); // duplicate ignored
      await registry.connect(owner).registerInstitution("National Institute of Technology");
      expect(await registry.institutionCount()).to.equal(2n);
      expect(await registry.getInstitution(2)).to.equal("IIT Delhi");
    });

    it("reverts when a non-owner registers an institution or adds an issuer", async function () {
      const { registry, issuer, stranger } = await deployFixture();
      await expect(registry.connect(issuer).registerInstitution("Fake U")).to.be.revertedWithCustomError(
        registry,
        "NotOwner"
      );
      await expect(
        registry.connect(issuer).addIssuer(stranger.address, 1)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("reverts on empty/too-long institution names", async function () {
      const { registry, owner } = await deployFixture();
      await expect(registry.connect(owner).registerInstitution("")).to.be.revertedWithCustomError(
        registry,
        "EmptyInput"
      );
      await expect(
        registry.connect(owner).registerInstitution("N".repeat(97))
      ).to.be.revertedWithCustomError(registry, "TooLong");
    });

    it("owner can add issuers bound to an institution, and remove them", async function () {
      const { registry, owner, issuer, institutionId } = await deployFixture();
      expect(await registry.isIssuer(issuer.address)).to.equal(true);
      expect(await registry.issuerInstitutionId(issuer.address)).to.equal(institutionId);

      await expect(registry.connect(owner).addIssuer(issuer.address, institutionId))
        .to.emit(registry, "IssuerAdded")
        .withArgs(issuer.address, institutionId, owner.address);

      await registry.connect(owner).removeIssuer(issuer.address);
      expect(await registry.isIssuer(issuer.address)).to.equal(false);
    });

    it("reverts when adding an issuer for an unknown institution", async function () {
      const { registry, owner, stranger } = await deployFixture();
      await expect(registry.connect(owner).addIssuer(stranger.address, 99)).to.be.revertedWithCustomError(
        registry,
        "InstitutionNotFound"
      );
      await expect(registry.connect(owner).addIssuer(stranger.address, 0)).to.be.revertedWithCustomError(
        registry,
        "InstitutionNotFound"
      );
    });
  });

  describe("issuing certificates", function () {
    it("an authorized issuer can issue and the record is readable", async function () {
      const { registry, issuer, institutionId } = await deployFixture();
      const issueDate = NOW();

      const tx = registry.connect(issuer).issueCertificate("CERT-2026-0001", STUDENT_HASH, CERT_HASH, issueDate);
      await expect(tx)
        .to.emit(registry, "CertificateIssued")
        .withArgs(
          "CERT-2026-0001", // indexed-string topic (hashed, matched by value)
          "CERT-2026-0001", // raw data copy
          issuer.address,
          institutionId,
          STUDENT_HASH,
          CERT_HASH,
          BigInt(issueDate),
          (v) => v > 0n
        );

      const cert = await registry.getCertificate("CERT-2026-0001");
      expect(cert.studentHash).to.equal(STUDENT_HASH);
      expect(cert.certHash).to.equal(CERT_HASH);
      expect(cert.issuer).to.equal(issuer.address);
      expect(cert.institutionId).to.equal(institutionId);
      expect(cert.issueDate).to.equal(BigInt(issueDate));
      expect(cert.exists).to.equal(true);
      expect(cert.revoked).to.equal(false);
      expect(cert.issuedAt).to.be.greaterThan(0n);
    });

    it("stores the raw certificate ID only in events, not in storage keys", async function () {
      const { registry, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-PRIVACY-CHECK");
      // The public getter keyed by the raw ID still resolves the record —
      // internally the mapping is keyed by keccak256(certId).
      const cert = await registry.getCertificate("CERT-PRIVACY-CHECK");
      expect(cert.exists).to.equal(true);
    });

    it("reverts when a non-issuer tries to issue", async function () {
      const { registry, stranger } = await deployFixture();
      await expect(
        registry.connect(stranger).issueCertificate("CERT-X", STUDENT_HASH, CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("a removed issuer can no longer issue", async function () {
      const { registry, owner, issuer } = await deployFixture();
      await registry.connect(owner).removeIssuer(issuer.address);
      await expect(
        registry.connect(issuer).issueCertificate("CERT-Y", STUDENT_HASH, CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("reverts on duplicate certificate IDs — even across issuers", async function () {
      const { registry, owner, issuer, other, institutionId } = await deployFixture();
      await registry.connect(owner).addIssuer(other.address, institutionId);
      await issueSample(registry, issuer, "CERT-DUP");
      await expect(
        registry.connect(other).issueCertificate("CERT-DUP", hashId("student:2"), CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "DuplicateCertId");
    });

    it("reverts on empty inputs (certId, studentHash, certHash)", async function () {
      const { registry, issuer } = await deployFixture();
      await expect(
        registry.connect(issuer).issueCertificate("", STUDENT_HASH, CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "EmptyInput");
      await expect(
        registry.connect(issuer).issueCertificate("CERT-E", ZeroHash, CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "EmptyInput");
      await expect(
        registry.connect(issuer).issueCertificate("CERT-E", STUDENT_HASH, ZeroHash, NOW())
      ).to.be.revertedWithCustomError(registry, "EmptyInput");
    });

    it("reverts when certId exceeds the length cap", async function () {
      const { registry, issuer } = await deployFixture();
      await expect(
        registry.connect(issuer).issueCertificate("X".repeat(65), STUDENT_HASH, CERT_HASH, NOW())
      ).to.be.revertedWithCustomError(registry, "TooLong");
    });

    it("reverts when issueDate is more than a year in the future", async function () {
      const { registry, issuer } = await deployFixture();
      const farFuture = BigInt(NOW() + 366 * 24 * 60 * 60);
      await expect(
        registry.connect(issuer).issueCertificate("CERT-F", STUDENT_HASH, CERT_HASH, farFuture)
      ).to.be.revertedWithCustomError(registry, "FutureIssueDate");
    });

    it("reverts when getting a non-existent certificate", async function () {
      const { registry } = await deployFixture();
      await expect(registry.getCertificate("MISSING")).to.be.revertedWithCustomError(registry, "NotFound");
    });
  });

  describe("revocation", function () {
    it("the issuing issuer can revoke with a public reason", async function () {
      const { registry, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-R1");

      // Receipt-based assertion: indexed string topics are emitted as hashes,
      // so we decode the log and compare the non-hashed args directly.
      const tx = await registry.connect(issuer).revokeCertificate("CERT-R1", "forgery reported");
      const receipt = await tx.wait();
      const parsed = receipt.logs
        .map((l) => registry.interface.parseLog(l))
        .find((p) => p?.name === "CertificateRevoked");
      expect(parsed, "CertificateRevoked event should be emitted").to.exist;
      expect(parsed.args.by).to.equal(issuer.address);
      expect(parsed.args.reason).to.equal("forgery reported");
      expect(parsed.args.revokedAt).to.be.greaterThan(0n);

      const cert = await registry.getCertificate("CERT-R1");
      expect(cert.revoked).to.equal(true);
      // NOTE: revocation time/actor live ONLY in the event (minimum storage),
      // asserted above via the decoded CertificateRevoked log.
    });

    it("the platform owner can revoke any certificate", async function () {
      const { registry, owner, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-R2");
      await registry.connect(owner).revokeCertificate("CERT-R2", "dispute resolved: invalid");
      expect((await registry.getCertificate("CERT-R2")).revoked).to.equal(true);
    });

    it("a different issuer cannot revoke someone else's certificate", async function () {
      const { registry, owner, issuer, other, institutionId } = await deployFixture();
      await registry.connect(owner).addIssuer(other.address, institutionId);
      await issueSample(registry, issuer, "CERT-R3");
      await expect(
        registry.connect(other).revokeCertificate("CERT-R3", "not mine")
      ).to.be.revertedWithCustomError(registry, "NotIssuer");
    });

    it("revoking a non-existent certificate reverts", async function () {
      const { registry } = await deployFixture();
      await expect(registry.revokeCertificate("GHOST", "nope")).to.be.revertedWithCustomError(
        registry,
        "NotFound"
      );
    });

    it("revoking twice reverts instead of double-emitting", async function () {
      const { registry, owner, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-R4");
      await registry.connect(issuer).revokeCertificate("CERT-R4", "first");
      await expect(
        registry.connect(issuer).revokeCertificate("CERT-R4", "second")
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
      expect((await registry.getCertificate("CERT-R4")).revoked).to.equal(true);
    });

    it("reverts on over-long revocation reasons", async function () {
      const { registry, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-R5");
      await expect(
        registry.connect(issuer).revokeCertificate("CERT-R5", "R".repeat(97))
      ).to.be.revertedWithCustomError(registry, "TooLong");
    });
  });

  describe("verification views", function () {
    it("isCertificateValid reports VALID / REVOKED / NOT_FOUND", async function () {
      const { registry, issuer } = await deployFixture();
      await issueSample(registry, issuer, "CERT-V1");
      await issueSample(registry, issuer, "CERT-V2");

      expect(await registry.isCertificateValid("CERT-V1")).to.deep.equal([true, "VALID"]);
      await registry.connect(issuer).revokeCertificate("CERT-V2", "revoked");
      expect(await registry.isCertificateValid("CERT-V2")).to.deep.equal([false, "REVOKED"]);
      expect(await registry.isCertificateValid("CERT-V3")).to.deep.equal([false, "NOT_FOUND"]);
    });

    it("verifyCertificate returns status plus institution and both hashes", async function () {
      const { registry, issuer, institutionId } = await deployFixture();
      await issueSample(registry, issuer, "CERT-W1");

      const [ok, status, issuerAddr, instId, studentHash, certHash] = await registry.verifyCertificate(
        "CERT-W1"
      );
      expect(ok).to.equal(true);
      expect(status).to.equal("VALID");
      expect(issuerAddr).to.equal(issuer.address);
      expect(instId).to.equal(institutionId);
      expect(studentHash).to.equal(STUDENT_HASH);
      expect(certHash).to.equal(CERT_HASH);

      const [okNF, statusNF] = await registry.verifyCertificate("NOPE");
      expect(okNF).to.equal(false);
      expect(statusNF).to.equal("NOT_FOUND");
    });

    it("getInstitution resolves the public name; unknown ids revert", async function () {
      const { registry, institutionId } = await deployFixture();
      expect(await registry.getInstitution(institutionId)).to.equal("National Institute of Technology");
      await expect(registry.getInstitution(42)).to.be.revertedWithCustomError(registry, "InstitutionNotFound");
    });
  });
});
