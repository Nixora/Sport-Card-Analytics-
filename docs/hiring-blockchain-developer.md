# Hiring spec — Blockchain Developer

**Handing off the `nixsora-next` repo for provenance UI, BFF routes, and wallet flows?** Use **[`hiring-nixsora-next-provenance.md`](./hiring-nixsora-next-provenance.md)** for the repo map, phase plan, take-home, and provenance-specific interview questions.

This document is the **long-horizon** spec: product intent, **CardIdentity**, contracts, NFT certificates, security, and deliverables—aligned with how the **main Nixsora app** and **`nixsora-next`** evolve together.

---

## 1) Main project today (Nixsora — Sports Card Analytics)

**Nixsora** is a web product for **comparing sports-card listings across marketplaces**, with analytics, alerts, seller views, community, and accounts. In this repository, production today is a **MERN-style** stack: **Express** API (`/api`), **MongoDB**, and a **Vite + React** client (dev proxy to the API; production build served from `client/dist`).

Blockchain work is **additive**. It must **not** disrupt core compare/analytics flows: ship behind **feature flags** or a **dedicated `/chain/*` area**, and degrade gracefully when RPC or chain features are unavailable.

Alongside the legacy client, the team runs **`nixsora-next`**: a **Next.js 15 (App Router)** app that acts as a **BFF** to the same main backend (no ledger database inside Next). That app is where **chain-facing UX** and **provenance read paths** are concentrated today.

---

## 2) What you do with `nixsora-next` (and how it relates to this repo)

You are not “only” a contracts author. You are expected to **coordinate** with the Next monolith so on-chain and off-chain designs match what users see and verify.

**In `nixsora-next`, you will typically:**

- Own or co-own **`/chain/provenance`**: timeline, empty states, hash copy, explorer links, and verification affordances as the API returns real `events` instead of placeholders.
- Work with **BFF routes** (e.g. `GET /api/v1/cards/[cardKey]/provenance`) that **proxy** the main API—extend types and payloads **carefully** so the UI and auditors get a stable contract.
- Align **wallet connect** (`/chain/wallets`, EIP-1193) with **when signing is actually required** (writes, mints, attestations)—not for every read.
- Respect the **split of responsibility**: **authoritative event storage and integrity rules** live in the **Express + Mongo** service; Next does **not** become a second source of truth for ledger rows.

**Practical detail** (routes, code paths, suggested phases): **[`hiring-nixsora-next-provenance.md`](./hiring-nixsora-next-provenance.md)**.

---

## 3) Provenance: a bit of context (today → target)

**Today (baseline):** the main API can expose provenance read models such as `card_key`, a **`fingerprint`** (hash of a small catalog/snapshot JSON), **`events: []`**, and a short ledger description. The Next app surfaces that through its BFF—enough to ship UI skeletons, not yet a full tamper-evident story.

**Target:** an **append-only, hash-linked** event log off-chain (`payload_hash`, `prev_hash`, ordered by append), with **optional on-chain anchors** (hashes or Merkle roots only—no heavy media on-chain), plus UI that lets a reviewer **recompute hashes** from returned payloads and see that tampering breaks the chain. NFT-based certificates remain **optional** and layered on top of that story—not a prerequisite for credible read-only provenance.

---

## 4) Project goal (business / product)

Build trust and shareability for sports-card ownership and history by adding:

- **Provenance timeline**: Immutable record of important events (e.g., graded, purchased, sold, transferred, verified snapshot).
- **Certificate NFT**: A token that references a card identity and its provenance root, enabling users to share/verify externally.

Non-goals for this phase:

- Building a full marketplace / payments / token economy.
- Storing heavy data (images, listings, price series) on-chain.

---

## 5) High-level feature scope

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

## 6) Card identity model (must be deterministic)

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

## 7) Chain + standards (preferences)

Preferred: **EVM-compatible** chain (best tooling ecosystem).

Candidate networks (choose one):
- Polygon
- Base
- Arbitrum

Token standard:
- ERC-721 (simple) or ERC-1155 (if bundling makes sense)

---

## 8) Smart contract requirements

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

## 9) Off-chain backend responsibilities

Backend tasks the blockchain developer will work with (or implement if full-stack):

- Store provenance event JSON in DB and/or object storage.
- Generate canonical payload + compute hash before writing on-chain.
- Provide API endpoints for:
  - create provenance event (off-chain)
  - submit on-chain tx (or provide calldata for client to submit)
  - verify event by recomputing hash and checking chain data

---

## 10) Frontend responsibilities

- Add an “Ownership / Provenance” panel on card detail (or a dedicated page)—in the **Vite client** and/or **`nixsora-next`** `/chain/*` surfaces, depending on where the feature ships first.
- Wallet connect UI (optional workflow).
- Mint certificate flow.
- Display:
  - provenance timeline
  - verification status (hash match on-chain)
  - links to block explorer

---

## 11) Security + privacy constraints

- **Never store private user data on-chain.**
- Treat on-chain records as permanent and public.
- For off-chain storage:
  - avoid embedding personal info in URIs
  - signed URLs if needed
- Consider:
  - spam resistance (rate limits, allowlists)
  - moderation strategy (bad data can be immutably referenced)

---

## 12) Deliverables (what “done” means)

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

## 13) Required experience (candidate requirements)

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
- **Next.js App Router** + BFF patterns (especially if they will own `nixsora-next` workstreams)

---

## 14) Interview questions (suggested)

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

## 15) Notes for the developer

This is a **next version** feature. The primary constraint is to keep the current product stable:

- blockchain features must be isolated behind a feature flag / separate UI section
- if chain RPC is down, the app must still function (graceful degradation)

**Doc split:** **[`hiring-nixsora-next-provenance.md`](./hiring-nixsora-next-provenance.md)** = hire who **starts in `nixsora-next`** and owns provenance UX + BFF coordination. **This file** = contracts, identity, hybrid architecture, NFTs, and long-term security expectations.
