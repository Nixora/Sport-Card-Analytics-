# Nixsora — User Documentation

This guide is written for **users** (collectors, investors, and hobby researchers). It explains what each page in Nixsora does, what you should look at on that page, and how to use the product from **sign up** all the way to detailed card analysis and community discussion.

Nixsora is an analytics workspace. It helps you:

- **Browse** cards that have been collected from marketplaces and organized into “card pages”
- **Understand price movement** using a daily time series of median asking prices from the listing sample
- **Compare** signals across sources when cross-market comparison data exists
- **Review sellers** and listing context to reduce mistakes and improve confidence
- **Participate in the community** by reading posts, asking questions, and responding to others

> Important: Nixsora does **not** sell cards directly. When you click “Open listing” you are redirected to the original marketplace page (for example, eBay) to complete the purchase or sale.

---

## 1) Getting started

### What you can do without signing in

Depending on how your Nixsora deployment is configured, you can usually browse a small public set of pages without signing in. This is useful when you want to quickly check market context before committing to an account.

Signed‑out users typically can access:

- **Home**
- **Marketplace** (browse cards)
- **Careers**
- **FAQ**
- **Privacy Policy**
- **Contact**

If you attempt to open a page that requires an account, Nixsora will prompt you to sign in. To post in Community, manage your Profile, or use Admin tools, you must be signed in.

### Create an account (Sign up)

Sign up is designed to be simple and secure. The platform uses an email verification code (OTP) so that accounts cannot be created with an email address you do not control.

To create an account:

1. Open the **Sign up** dialog from the header (or from the sign‑in prompt).
2. Enter your **email**, choose a **password**, and pick a **display name**.
3. Nixsora sends a **6‑digit verification code (OTP)** to your email.
4. Enter the OTP to confirm your email and finish creating the account.
5. After verification, you are signed in automatically.

If the code expires or you cannot find the email, restart sign‑up and request a new code. In some environments, sign‑up email delivery may be limited; contact support if you repeatedly do not receive OTP emails.

### Sign in

To sign in:

1. Open the **Sign in** dialog from the header (or when prompted).
2. Enter the email and password you used at sign up.
3. After sign in, your session is stored as a secure cookie, so you do not need to re‑enter credentials on every page.

You’ll stay signed in via a secure session cookie (your deployment controls security settings).

### Forgot password / reset password

If you forget your password, you can reset it through email.

1. Click **Forgot password** on the sign‑in dialog.
2. Enter your account email address.
3. Nixsora emails you a password reset link (links expire for safety).
4. Open the link and set a new password.
5. Return to sign in with your new password.

For privacy, the system may show a neutral message even if the email is not found. If you are unsure which email you used, contact support.

---

## 2) Home page

The home page is a guided overview of the product and a fast way to understand what Nixsora is built for. The page is designed as a narrative: it explains why the platform exists, which problems it solves, and where to go next.

You will see sections that cover:

- What the platform does (why it exists, how it helps)
- Product areas you can jump into
- Culture / “How we work” and Careers banner

### Careers banner (full-width)

The careers banner is a full‑width section that introduces hiring and team information. It includes imagery and a **View careers** button that opens the Careers page in a new tab.

---

## 3) Marketplace (Browse cards)

**Path:** `/marketplace`

The Marketplace is where most users start. It is the browsing layer where listings are grouped into “card pages.” Each group is identified by a **card key**, which is produced by the data pipeline from listing titles and metadata. The card key is the backbone of the analytics system—trends, comparisons, and samples are all organized around it.

### What you see

Each marketplace item is a card group. You typically see:

- **Card title**
- **Preview image**, taken from a recently fetched listing
- **Last seen**, which indicates when the system last observed listings for this card key
- **Median asking price**, computed from the latest listing sample (ask prices, not sold prices)
- **Listings count (N)**, which tells you how many listings were used in the latest sample
- Optional **flags** that indicate likely autograph or grading/authentication keywords

When you are evaluating a card quickly, the two most important “sanity check” fields are **Listings (N)** and **Last seen**. A small sample or old refresh time means you should verify listings manually before acting on the number.

### Sorting

Marketplace sorting options usually include:

- **Recency**: most recently seen cards first
- **Activity**: cards with more listing activity (sample size / movement)
- **Price**: sort by the latest median asking price

Sorting changes *how the list is ordered*, but it does not change the underlying card key logic. If a card key is too broad (mixed variants), sorting will not fix the grouping—use a cleaner search or contact support with examples.

### Filters (common)

Marketplace filters can include:

- **Autograph**: show only cards whose listing samples suggest autograph/signed content
- **Graded/Auth**: show only cards with grade/auth keywords (PSA/BGS/JSA/Beckett/COA)
- **PSA** / **BGS**: narrower grading filters
- **Compare only**: show cards that have cross-market comparison fields (if enabled in your data)

Filters are designed to reduce noise, but they can also reduce sample size. If your results look unstable, try removing a filter and validate listings first.

### Opening a card

When you click a marketplace item, you open the card detail page for that card key:

- **Card detail path:** `/cards/<cardKey>`

---

## 4) Card detail (Trends + listings)

**Path:** `/cards/:cardKey`

The card detail page is where Nixsora becomes an analytics tool instead of a simple browser. This page combines trend context, sample context, and source links into one place so you can make a decision without switching tabs.

This page is your “single pane of glass” for:

- Trend context (time series)
- Listing sample context (what the median is built from)
- Cross-market comparisons (if available)
- Seller fields (if available)

### Key concepts

#### Median asking price

Nixsora typically shows **median ask** (the middle asking price) from the current listing sample. This is not sold FMV. Sellers may price above or below what actually sells, so the metric is best used as a **directional signal**.

Use it as a **directional baseline**, then validate by checking:

- Listing count (N)
- Latest refresh / last seen
- Listing mix (grade/condition/variant)
- Outliers in the listing sample

If you see an unexpected spike or drop, open the listing sample and identify whether the sample changed (for example, a different parallel or grade entered the group).

#### Listings count (N)

Listings (N) measures liquidity in the *current* sample. Small samples swing more, because a single misclassified listing or one unusually priced listing can move the median.

- **Low N**: treat as a hint; verify by opening listings
- **Higher N**: tends to be more stable, especially within consistent filters

### Listing sample

The listing sample is the best way to “trust but verify.” It shows actual listing snapshots that were used by the system. Each listing commonly includes:

- Image
- Title
- Condition / grade signals (if detected)
- A link to the original marketplace listing

When validating a comp, prefer listings that match the same **year / set / card number / parallel / grade** as the item you care about. If you cannot find consistent matches, treat the trend as uncertain.

---

## 5) Comparison & alerts (Cross-market view)

**Path:** `/comparison-alert`

This page is designed for **side‑by‑side comparison**. When comparison data exists (for example Vinted or Catawiki values), Nixsora can show how the same card key appears across sources.

### What you see

Rows commonly include:

- eBay preview image
- eBay price signal (latest median ask)
- Vinted / Catawiki prices (when available)
- A match score (if provided by your ingestion/enrichment logic)
- Quick links to open each listing/source

Use this view when you want a fast cross-market check, but always confirm that the compared items are the same variant and grade. Cross‑source matching is inherently probabilistic, so a “match score” (when available) should be used as guidance, not a guarantee.

### When it may be empty

If you have not enabled cross-market enrichment or those fields have not been written, the compare view may show no rows.

---

## 6) Seller analysis

### Seller list

**Path:** `/seller-analysis`

Seller analysis helps you understand the supply side. The seller list is built from the seller metadata found in ingested listings.

Typical fields include:

- Seller username
- Feedback percentage / score (when available)
- Activity / listing presence indicators

### Seller profile

**Path:** `/sellers/:sellerUsername`

The seller profile page provides a seller‑centric view. Depending on the available data, you may see recent listings, feedback signals, and activity patterns that help you judge reliability.

---

## 7) Community

**Path:** `/community`

Community is a lightweight forum built into Nixsora. It is useful for sharing research, asking for second opinions, and documenting hobby knowledge.

You can use Community for:

- Reading articles/topics
- Posting new topics (signed-in users)
- Replying (signed-in users)
- Marking posts as **Helpful** (signed-in users; typically once per topic)

### Reading

You can open a topic to read it. Some deployments track view counts so that popular discussions surface naturally over time.

### Posting a new topic

**Path:** `/community/new`

To create a topic, provide a clear title and a detailed message body. After creation, your topic appears in the Community list and other users can reply.

### Replies and helpful votes

Inside a topic you can:

- Reply to the thread
- Mark the topic as **Helpful** (if enabled). Helpful votes are meant to highlight answers or posts that genuinely solve a problem.

---

## 8) Profile

**Path:** `/profile`

Profile is where you manage your account settings and optional identity fields. The exact fields can vary by deployment, but typical capabilities include:

- Set country / preferences
- Mark yourself as an eBay seller and provide a seller username
- Upload an avatar
- Change password (requires your current password)

> Some deployments may restrict changing display name after it is set.

### Public profile

**Path:** `/u/:displayName`

Public profile pages show the public portion of a user’s information (as configured) and their avatar if uploaded. This is commonly used in Community as an identity anchor.

---

## 9) Admin (for admins only)

**Path:** `/admin`

Admin tools are intended for operators and administrators of a Nixsora deployment. If your email is configured as an admin, you will be able to open the Admin page and perform management actions.

Admins can typically:

- Search and list users
- Delete users (with safeguards)
- List cards and delete a card key’s documents (data cleanup)
- Manage community articles

If you are not an admin, you’ll be blocked from admin actions.

---

## 10) FAQ

**Path:** `/faq`

The FAQ page is written like documentation. It is designed for fast scanning and deep reading.

- A **Topics table** (Topic / Content)
- Detailed Q&A sections (document style)
- An “On this page” navigation panel that:
  - scrolls with content
  - highlights the section/question you’re currently reading

---

## 11) Contact

**Path:** `/contact`

The Contact page provides direct support channels. It is the best place to report data issues (wrong grouping, strange comparisons, missing cards) because you can include the details needed to reproduce the problem.

Contact includes:

- Support email address
- Mailing address (placeholder values may exist in some builds)
- A message form that opens your email client with a prepared email draft

---

## 12) Privacy Policy

**Path:** `/privacy-policy`

The Privacy Policy explains what data is collected and how it is used. Depending on your deployment stage, some policy text may be templated and should be reviewed before production use.

---

## 13) Careers

**Path:** `/careers`

Careers provides hiring and contact information. The home page and certain call‑to‑action areas link here so interested users can learn about open roles or contact the team.

---

## Common workflows

### A) Find a card and validate a comp

1. Go to **Marketplace**
2. Search or browse until you find the correct card group
3. Open **Card detail**
4. Review the latest trend point and confirm the sample size (N)
5. Open the listing sample and remove outliers mentally (wrong set, wrong year, wrong parallel)
6. Open one or more listings on the marketplace site to confirm that the comp is truly comparable (grade, condition, authenticity, variant)

### B) Compare eBay to other sources (when enabled)

1. Open **Comparison & alerts**
2. Find rows with Vinted/Catawiki values present
3. Open each source link side by side
4. Verify variant matching; if the match looks off, treat the row as a weak signal and use manual comps

### C) Join the community

1. Sign up / sign in
2. Go to **Community**
3. Read existing topics first to avoid duplicates
4. Post a new topic with clear context (player, set, grade, what you are trying to decide)
5. Reply to others and mark helpful when someone’s answer is genuinely useful

---

## Tips for best results

- Treat median ask trends as **directional** when sample size is small or refresh is old.
- Compare like‑for‑like: same grade company and grade number, same parallel/variant, and similar condition.
- When something looks wrong, rely on the listing sample to understand why.
- If a card key seems to mix different variants, narrow your search terms and report examples through **Contact** so the team can improve normalization.

