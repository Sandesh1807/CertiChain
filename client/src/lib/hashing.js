import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Canonical off-chain hashing for CertificateRegistry.
 *
 * The contract stores ONLY keccak256 commits — these helpers define the
 * single canonical preimage format so issuance and verification always
 * agree. Domain prefixes prevent cross-protocol hash reuse.
 *
 *  studentHash = keccak256("certichain:student:v1:" + trim(identifier))
 *  certHash    = keccak256("certichain:cert:v1:" + course + "|" + institution
 *                            + "|" + issueDate(ISO yyyy-mm-dd))
 *
 * Raw values never leave the browser: only the returned bytes32 is sent.
 */

const STUDENT_DOMAIN = "certichain:student:v1:";
const CERT_DOMAIN = "certichain:cert:v1:";

/** Commit of a student identifier (name, roll number, or any string). */
export function studentCommit(identifier) {
  const id = String(identifier || "").trim();
  if (!id) throw new Error("Student identifier is empty");
  return keccak256(toUtf8Bytes(STUDENT_DOMAIN + id));
}

/** Commit of the certificate's public content. */
export function certificateCommit({ course, institution, issueDate }) {
  const coursePart = String(course || "").trim();
  const instPart = String(institution || "").trim();
  const datePart = String(issueDate || "").slice(0, 10); // ISO yyyy-mm-dd
  if (!coursePart) throw new Error("Course / certificate name is empty");
  const preimage = `${CERT_DOMAIN}${coursePart}|${instPart}|${datePart}`;
  return keccak256(toUtf8Bytes(preimage));
}

/** Recompute the expected certHash when checking a document against chain. */
export function checkCertificateProof({ course, institution, issueDate }, expectedCertHash) {
  return certificateCommit({ course, institution, issueDate }) === expectedCertHash;
}
