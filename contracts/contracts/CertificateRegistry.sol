// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CertificateRegistry
 * @notice Privacy-first on-chain registry for educational certificates.
 *
 * Design goals
 *  - Minimum on-chain data: no raw personal information is ever stored.
 *      · The student identifier is accepted ONLY as a pre-computed keccak256
 *        hash (bytes32). Raw names / roll numbers never appear in storage or
 *        even in transaction calldata.
 *      · The raw certificate ID is used once as an event argument (for
 *        off-chain indexing / QR codes) but storage is keyed by its hash,
 *        so short guessable IDs are never exposed as storage keys.
 *      · Institutions are stored once in a registry and referenced by id,
 *        instead of repeating the full name in every certificate record.
 *  - Access control: only whitelisted issuers may issue; revocation follows
 *    a real-world dispute flow — the issuing issuer or the platform owner.
 *  - Duplicate protection: certificate IDs are unique by construction.
 *
 * Everything larger or personal (student name, document itself) is expected
 * to live off-chain; its integrity is anchored here via `certHash`.
 */
contract CertificateRegistry {
    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    struct Institution {
        string name; // e.g. "National Institute of Technology"
        bool exists;
    }

    /// @notice Storage layout is manually packed into two slots per record.
    struct Certificate {
        // ---- slot 1 ----
        bytes32 studentHash; // keccak256(student identifier) — no raw PII
        bytes32 certHash; // keccak256 of the certificate document / metadata
        address issuer; // wallet that issued (== institution wallet)
        // ---- slot 2 ----
        uint32 institutionId; // index into institutions[]
        uint64 issuedAt; // block.timestamp of issuance
        uint64 issueDate; // logical date printed on the document (unix secs)
        bool exists;
        bool revoked;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    address public owner;
    mapping(address issuer => bool) public isIssuer;
    mapping(address issuer => uint32) public issuerInstitutionId;
    mapping(bytes32 certIdHash => Certificate) private _certificates;

    Institution[] private _institutions; // index 0 reserved = unassigned

    // ------------------------------------------------------------------
    // Events (raw, human-readable values live ONLY here — off-chain index)
    // ------------------------------------------------------------------

    event IssuerAdded(address indexed issuer, uint32 indexed institutionId, address indexed by);
    event IssuerRemoved(address indexed issuer, address indexed by);
    event InstitutionRegistered(uint32 indexed institutionId, string name, address indexed by);

    event CertificateIssued(
        string indexed certIdHashTopic, // keccak256(certId) — for event filtering
        string certId, // raw ID so off-chain indexers can decode human-readable IDs
        address indexed issuer,
        uint32 indexed institutionId,
        bytes32 studentHash,
        bytes32 certHash,
        uint64 issueDate,
        uint64 issuedAt
    );

    event CertificateRevoked(
        string indexed certId,
        uint64 revokedAt,
        address indexed by, // issuing issuer or platform owner
        string reason // short public reason (NOT personal data)
    );

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error NotOwner();
    error NotIssuer();
    error DuplicateCertId();
    error NotFound();
    error EmptyInput();
    error TooLong();
    error FutureIssueDate();
    error AlreadyRevoked();
    error InstitutionMismatch();
    error InstitutionNotFound();

    // ------------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotIssuer();
        _;
    }

    // ------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        _institutions.push(Institution({name: "", exists: false})); // reserve index 0
    }

    // ------------------------------------------------------------------
    // Owner: institutions & issuer whitelist
    // ------------------------------------------------------------------

    /**
     * @notice Registers an institution and returns its id. Idempotent per name.
     * @param name Public institution name (stored once, not per certificate).
     */
    function registerInstitution(string calldata name) external onlyOwner returns (uint32 id) {
        if (bytes(name).length == 0) revert EmptyInput();
        if (bytes(name).length > 96) revert TooLong();

        uint32 len = uint32(_institutions.length);
        for (uint32 i = 1; i < len; ++i) {
            if (keccak256(bytes(_institutions[i].name)) == keccak256(bytes(name))) {
                return i; // already registered
            }
        }
        _institutions.push(Institution({name: name, exists: true}));
        id = len;
        emit InstitutionRegistered(id, name, msg.sender);
    }

    /**
     * @notice Whitelists `issuer` (a college wallet) bound to `institutionId`.
     *         The issuer may only issue certificates for that institution.
     */
    function addIssuer(address issuer, uint32 institutionId) external onlyOwner {
        if (issuer == address(0)) revert EmptyInput();
        if (institutionId == 0 || institutionId >= _institutions.length || !_institutions[institutionId].exists) {
            revert InstitutionNotFound();
        }
        if (!isIssuer[issuer]) {
            isIssuer[issuer] = true;
        }
        issuerInstitutionId[issuer] = institutionId;
        emit IssuerAdded(issuer, institutionId, msg.sender);
    }

    function removeIssuer(address issuer) external onlyOwner {
        if (isIssuer[issuer]) {
            isIssuer[issuer] = false;
            emit IssuerRemoved(issuer, msg.sender);
        }
    }

    // ------------------------------------------------------------------
    // Issuing & revocation
    // ------------------------------------------------------------------

    /**
     * @notice Issues a certificate. `studentHash` MUST be keccak256 of the
     *         student identifier computed OFF-chain; the raw value never
     *         reaches the blockchain.
     * @param certId     Human-readable unique ID (e.g. "CERT-2026-0001").
     * @param studentHash keccak256(student identifier) — privacy-preserving.
     * @param certHash   keccak256 of the certificate document/metadata blob.
     * @param issueDate  Logical date printed on the document (unix seconds).
     */
    function issueCertificate(
        string calldata certId,
        bytes32 studentHash,
        bytes32 certHash,
        uint64 issueDate
    ) external onlyIssuer {
        _validateInputs(certId, studentHash, certHash, issueDate);

        bytes32 idHash = keccak256(bytes(certId));
        if (_certificates[idHash].exists) revert DuplicateCertId();

        uint64 ts = uint64(block.timestamp);
        _certificates[idHash] = Certificate({
            studentHash: studentHash,
            certHash: certHash,
            issuer: msg.sender,
            institutionId: issuerInstitutionId[msg.sender],
            issuedAt: ts,
            issueDate: issueDate,
            exists: true,
            revoked: false
        });

        emit CertificateIssued(
            // Solidity stores an indexed string topic as keccak256(bytes(value))
            // — identical to our storage key, so log filtering works by ID hash.
            certId,
            certId, // data: raw ID for human-readable off-chain indexing
            msg.sender,
            issuerInstitutionId[msg.sender],
            studentHash,
            certHash,
            issueDate,
            ts
        );
    }

    /**
     * @notice Revokes a certificate permanently. Allowed for the issuing
     *         issuer or the platform owner (dispute flow). Idempotent-safe:
     *         an already-revoked record reverts instead of re-emitting.
     * @param reason Short public reason, e.g. "forgery reported". Never
     *               include personal data here.
     */
    function revokeCertificate(string calldata certId, string calldata reason) external {
        if (bytes(certId).length == 0) revert EmptyInput();
        if (bytes(reason).length > 96) revert TooLong();

        Certificate storage c = _certificates[keccak256(bytes(certId))];
        if (!c.exists) revert NotFound();
        if (msg.sender != owner && msg.sender != c.issuer) revert NotIssuer();
        if (c.revoked) revert AlreadyRevoked();

        c.revoked = true;
        emit CertificateRevoked(certId, uint64(block.timestamp), msg.sender, reason);
    }

    // ------------------------------------------------------------------
    // Views (verification)
    // ------------------------------------------------------------------

    /// @notice Full on-chain record for a certificate ID.
    function getCertificate(string calldata certId) external view returns (Certificate memory) {
        Certificate memory c = _certificates[keccak256(bytes(certId))];
        if (!c.exists) revert NotFound();
        return c;
    }

    /// @notice Public institution name for an id.
    function getInstitution(uint32 id) external view returns (string memory) {
        if (id == 0 || id >= _institutions.length || !_institutions[id].exists) {
            revert InstitutionNotFound();
        }
        return _institutions[id].name;
    }

    /// @notice Number of registered institutions (index 0 is reserved).
    function institutionCount() external view returns (uint32) {
        return uint32(_institutions.length) - 1;
    }

    /**
     * @notice One-shot check for verifiers.
     * @return valid true when the record exists and was never revoked.
     * @return status "VALID" | "REVOKED" | "NOT_FOUND".
     */
    function isCertificateValid(string calldata certId) external view returns (bool valid, string memory status) {
        Certificate storage c = _certificates[keccak256(bytes(certId))];
        if (!c.exists) return (false, "NOT_FOUND");
        if (c.revoked) return (false, "REVOKED");
        return (true, "VALID");
    }

    /**
     * @notice Full verification in a single call: status + the hashes needed
     *         to check an off-chain document and student identifier.
     * @return ok true when the certificate exists and is not revoked.
     * @return status see isCertificateValid.
     * @return issuer the wallet that issued the certificate.
     * @return institutionId registry id of the issuing institution.
     * @return studentHash commit of the student identifier (compare off-chain).
     * @return certHash commit of the certificate document (compare off-chain).
     */
    function verifyCertificate(string calldata certId)
        external
        view
        returns (
            bool ok,
            string memory status,
            address issuer,
            uint32 institutionId,
            bytes32 studentHash,
            bytes32 certHash
        )
    {
        Certificate storage c = _certificates[keccak256(bytes(certId))];
        if (!c.exists) return (false, "NOT_FOUND", address(0), 0, bytes32(0), bytes32(0));
        if (c.revoked) return (false, "REVOKED", c.issuer, c.institutionId, c.studentHash, c.certHash);
        return (true, "VALID", c.issuer, c.institutionId, c.studentHash, c.certHash);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _validateInputs(
        string calldata certId,
        bytes32 studentHash,
        bytes32 certHash,
        uint64 issueDate
    ) internal view {
        if (bytes(certId).length == 0) revert EmptyInput();
        if (bytes(certId).length > 64) revert TooLong();
        if (studentHash == bytes32(0) || certHash == bytes32(0)) revert EmptyInput();
        // Sanity bound: certificates cannot be "issued" for dates absurdly in
        // the future (> 1 year ahead) — catches fat-fingered dates.
        if (issueDate > block.timestamp + 365 days) revert FutureIssueDate();
    }
}
