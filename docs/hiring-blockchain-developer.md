# Hiring spec — Blockchain Developer (Next Version)

This document describes the **next version** blockchain work for **Nixsora — Sports Card Analytics**, focused on:

- **Provenance** (tamper-evident event history for a card)
- **NFT-based certificates** (optional, not required for basic app use)

The current product is a MERN-style web app with an Express API, MongoDB, and a React client. Blockchain features must **not** disrupt core analytics features and must be built as **optional** enhancements.

---

## 1) Project goal (business / product)

Build trust and shareability for sports-card ownership and history by adding:

- **Provenance timeline**: Immutable record of important events (e.g., graded, purchased, sold, transferred, verified snapshot).
- **Certificate NFT**: A token that references a card identity and its provenance root, enabling users to share/verify externally.

Non-goals for this phase:

- Building a full marketplace / payments / token economy.
- Storing heavy data (images, listings, price series) on-chain.

---

## 2) High-level feature scope

### A) Provenance (on-chain + off-chain)
- A card has a **stable identifier** (see “Card identity” below).
- Users can append events to a provenance history.
- Each event is stored **off-chain** as structured JSON and optionally attachments (images/PDF).
- On-chain stores only:
  - a **hash** of the canonical event payload (and/or a Merkle root)
  - minimal metadata needed to verify and locate the event off-chain

### B) Certificate NFT (optional)
- Mint a **certificate token** for a card identity:
  - links to card identity and provenance root
  - includes minimal metadata on-chain
  - full metadata off-chain (IPFS/Arweave/S3)
- Support updates:
  - either mint a new token for major provenance changes, or
  - reference a new provenance root (if contract design allows it)

### C) Wallet is optional for the app
- Default user authentication stays **email/password session cookies**.
- Wallet connect is only required when:
  - minting a certificate
  - signing provenance events (if using user signatures)

---

## 3) Card identity model (must be deterministic)

We need a deterministic way to refer to a specific card in blockchain terms.

Minimum fields to represent a “CardIdentity”:

- **Sport**
- **Player**
- **Year**
- **Set**
- **Card number**
- **Variant/parallel** (if any)
- **Grade** (company + grade), optional
- **Certification number** (e.g., PSA cert), optional

The blockchain developer should propose:

- a canonical JSON schema (sorted keys, normalized casing)
- a canonical string representation
- a stable **CardIdentity hash** (e.g., keccak256 of canonical string)

---

## 4) Chain + standards (preferences)

Preferred: **EVM-compatible** chain (best tooling ecosystem).

Candidate networks (choose one):
- Polygon
- Base
- Arbitrum

Token standard:
- ERC-721 (simple) or ERC-1155 (if bundling makes sense)

---

## 5) Smart contract requirements

### A) ProvenanceRegistry contract
Required functions (example interface; developer may propose better):

- `registerCard(bytes32 cardIdHash, bytes32 initialRoot)`
- `appendEvent(bytes32 cardIdHash, bytes32 eventHashOrRoot, string uri)`
- `getLatestRoot(bytes32 cardIdHash) -> bytes32`
- `getEventCount(bytes32 cardIdHash) -> uint256`
- `getEvent(bytes32 cardIdHash, uint256 idx) -> (bytes32 hashOrRoot, string uri, uint64 timestamp, address actor)`

Design requirements:
- Events must be **append-only**.
- Provide a clear **authorization model**:
  - owner-only
  - admin + owner
  - role-based (AccessControl)
- Avoid expensive storage; store short `uri` pointers and hashes.

### B) Certificate NFT contract
Required behaviors:
- Mint certificate referencing `cardIdHash` and provenance root.
- Prevent duplicate certificates for the same card identity (or define rules).
- Expose token metadata URI.

Security requirements:
- Access control for minting (owner/admin, allowlist, paid mint, etc.).
- Reentrancy safety and upgrade policy (if upgradeable).
- Events emitted for all critical state changes.

---

## 6) Off-chain backend responsibilities

Backend tasks the blockchain developer will work with (or implement if full-stack):

- Store provenance event JSON in DB and/or object storage.
- Generate canonical payload + compute hash before writing on-chain.
- Provide API endpoints for:
  - create provenance event (off-chain)
  - submit on-chain tx (or provide calldata for client to submit)
  - verify event by recomputing hash and checking chain data

---

## 7) Frontend responsibilities

- Add an “Ownership / Provenance” panel on card detail (or a dedicated page).
- Wallet connect UI (optional workflow).
- Mint certificate flow.
- Display:
  - provenance timeline
  - verification status (hash match on-chain)
  - links to block explorer

---

## 8) Security + privacy constraints

- **Never store private user data on-chain.**
- Treat on-chain records as permanent and public.
- For off-chain storage:
  - avoid embedding personal info in URIs
  - signed URLs if needed
- Consider:
  - spam resistance (rate limits, allowlists)
  - moderation strategy (bad data can be immutably referenced)

---

## 9) Deliverables (what “done” means)

1. Smart contracts (registry + certificate) with:
   - tests
   - deployment scripts
   - documentation
2. Off-chain schema + hashing rules + verification tool
3. Minimal UI for:
   - viewing provenance timeline
   - minting a certificate NFT
4. Security review checklist + threat model notes

---

## 10) Required experience (candidate requirements)

Must have:
- Solidity + EVM experience
- ERC-721/1155 familiarity
- Smart contract testing (Foundry or Hardhat)
- Security awareness (common vulnerabilities, safe patterns)
- Ability to design hybrid on-chain/off-chain systems

Nice to have:
- Wallet UX experience (RainbowKit / wagmi / viem)
- Indexing (The Graph) or event ingestion pipelines
- Prior work with provenance / attestations

---

## 11) Interview questions (suggested)

Architecture:
- How would you model a provenance timeline so it’s cheap on-chain but verifiable?
- Would you use per-event hashes or a Merkle root approach? Trade-offs?
- How would you prevent duplicate certificates for the same card identity?

Security:
- What are the top 5 Solidity issues you watch for in code review?
- How do you handle access control for writes to provenance?

Implementation:
- Show how you’d implement canonical JSON hashing.
- How would you design the mint flow so the app can work without wallet for non-chain users?

---

## 12) Notes for the developer

This is a **next version** feature. The primary constraint is to keep the current product stable:

- blockchain features must be isolated behind a feature flag / separate UI section
- if chain RPC is down, the app must still function (graceful degradation)

