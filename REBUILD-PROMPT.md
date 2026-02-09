# Rebuild Prompt — Manny Source Electric Corp. Bid Estimator

Use this prompt with Claude to recreate the entire application from scratch. Copy everything below the line and paste it as your first message.

---

## PROMPT START

I need you to build a complete, production-ready **Bid Estimator Dashboard** web application for **Manny Source Electric Corp.**, an electrical contracting company in Miami, FL. This is a full-stack app that lets the company upload electrical plans (PDFs), have AI analyze them to auto-generate cost estimates, manage materials, and export professional bids.

**IMPORTANT**: Deploy this as a **free public website** — do NOT use Vercel. Use one of these free alternatives:
- **Render.com** (free web service tier) — recommended, simple, supports Next.js
- **Railway.app** (free hobby tier)
- **Fly.io** (free tier)
- **Cloudflare Pages** (free, if using static export + API routes via Workers)

For the database, use **Neon Postgres** (free tier at neon.tech) — provision it via Instagres for instant setup: `curl -s -X POST https://instagres.com/api/v1/database -H "Content-Type: application/json" -d '{"ref": "bid-estimator"}'`

For the AI estimation feature, use **Claude** through my existing Claude subscription — do NOT use an API key. Instead, integrate with the **Claude Code SDK** or **MCP (Model Context Protocol)** so the AI analysis runs through my subscription, not a paid API. If that's not feasible, build the AI analysis as a client-side feature where I paste the PDF text into a chat-like interface that sends it to Claude via my existing session/subscription, or use a simple proxy pattern. The key point: **no separate Anthropic API key billing — use my existing Claude subscription**.

---

### Tech Stack

- **Framework**: Next.js (latest stable, App Router, TypeScript)
- **Styling**: Tailwind CSS v4 with custom glass morphism design system
- **Database**: PostgreSQL via Neon (use `@prisma/adapter-neon` with `PrismaNeon` connectionString API)
- **ORM**: Prisma (latest, with `prisma.config.ts` for connection URL)
- **State Management**: Zustand with Immer middleware + localStorage persistence
- **Forms**: react-hook-form + Zod validation
- **UI Components**: shadcn/ui (new-york style, dark theme)
- **Icons**: lucide-react
- **Charts**: Recharts
- **Animations**: Framer Motion
- **PDF Parsing**: pdf-parse (for extracting text from uploaded PDFs)
- **Excel Export**: ExcelJS (with linked formula cells, not static values)
- **PDF Export**: @react-pdf/renderer (branded company PDFs)
- **File Upload**: react-dropzone
- **Toast**: Sonner

---

### Company Information (Hardcoded Defaults)

```
Company: Manny Source Electric Corp
Address: 3932 SW 160th St, Miami, FL 33177
Phone: (786) 299-2168
License: ER13016064
Website: mannysourceelectric.com
Default Labor Rate: $65/hr
Default Overhead: 15%
Default Profit: 10%
Default Tax Rate: 0%
Default Terms: "Payment terms: Net 30. This estimate is valid for 30 days from the date of issue. All work performed in accordance with the National Electrical Code (NEC) and Florida Building Code (FBC). Permit fees not included unless specified. Manny Source Electric Corp — FL License #22E000394 / ER13016064."
```

---

### Design System — Dark Glass Morphism

The entire app uses a dark, premium glass morphism theme. Here are the exact specs:

**Colors:**
- Background: #060609 (near-black with slight blue)
- Body gradient: layered radial gradients (dark red/purple hints) over linear-gradient(160deg, #030306, #0A0A10, #0E0C16, #0A0910, #040408)
- Primary: #CC0000 (brand red)
- Card backgrounds: rgba(255,255,255,0.04)
- Glass backgrounds: linear-gradient with rgba(255,255,255,0.07) to rgba(255,255,255,0.025)
- Borders: rgba(255,255,255,0.07)
- Text: rgba(255,255,255,0.95) primary, rgba(255,255,255,0.5) muted
- Font: SF Pro Display / system sans-serif

**Glass Effect (every card, panel, sidebar, nav bar):**
```css
.glass {
  background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.04) 100%);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15);
}
```

**Background Atmosphere:**
- 3 floating orbs (fixed position, blur(100px), 0.4 opacity)
- Orb 1: 650px red radial gradient, top-right, 25s animation
- Orb 2: 500px purple radial gradient, bottom-left, 30s animation
- Orb 3: 350px red radial gradient, center, 22s animation
- All orbs slowly drift with `orbFloat` keyframe animation (translate + scale)

**Scrollbar:** 4px thin, rounded, subtle rgba(255,255,255,0.07)

**Animations:** fadeInUp, fadeIn, slideIn, scaleIn, shimmer, orbFloat. Stagger children with 60ms delays. All respect prefers-reduced-motion.

---

### Database Schema (Prisma + PostgreSQL)

5 models:

**Project** — id (cuid), name, clientName, clientCompany?, address, city, state (default "FL"), zip, type (default "commercial"), status (default "draft"), description?, overheadPct (default 0.15), profitPct (default 0.10), laborRate (default 65.0), notes?, terms?, createdAt, updatedAt. Has many LineItems (cascade delete) and Documents (cascade delete).

**LineItem** — id (cuid), projectId (FK), description, category, quantity (Float), unit (default "each"), unitPrice (Float, default 0), laborHours (Float, default 0), laborRate (Float?), sortOrder (Int, default 0), materialId? (FK, onDelete SetNull), createdAt, updatedAt.

**Material** — id (cuid), name, sku?, category, unit, unitPrice (Float), createdAt, updatedAt. Has many LineItems.

**Document** — id (cuid), projectId (FK), fileName, fileSize (Int), fileType (default "application/pdf"), filePath, fileData? (base64 string for cloud storage), tag?, notes?, createdAt.

**Settings** — id (default "default", singleton), companyName, address, phone, license, email, website, defaultLaborRate (Float), defaultOverhead (Float), defaultProfit (Float), taxRate (Float), anthropicApiKey (String, default ""), defaultTerms (String with the legal text above).

---

### Pre-Seeded Materials (69 items)

Seed the database with these electrical materials organized by category:

**Wire (10):** 12/10/8/6 AWG THHN 500ft rolls ($89.97-$329), 4/2 AWG THHN per ft ($1.85-$2.65), 1/0 THHN per ft ($4.25), 14/2 and 12/2 Romex NM-B 250ft ($74.97-$89.97), 10/3 Romex 125ft ($119)

**Conduit (9):** 3/4" through 2" EMT 10ft sticks ($5.48-$22.48), 3/4" and 1" PVC Sch40 ($3.98-$5.48), 3/4" and 1" Liquid Tight Flex 25ft ($24.98-$34.98)

**Panels & Breakers (10):** 200A Main Panel 40-Space ($289), 100A Sub Panel 20-Space ($149), 20A Single Pole ($6.98), 30A/50A/60A/100A Double Pole ($12.98-$42.98), 20A AFCI ($38.98), 20A GFCI ($42.98), 20A Dual Function AFCI/GFCI ($48.98)

**Devices (10):** 20A Duplex Receptacle ($1.28), 20A GFCI ($18.98), Decorator Receptacle ($2.48), Single Pole Switch ($0.98), 3-Way Switch ($3.48), Dimmer ($22.98), Occupancy Sensor ($24.98), USB Receptacle ($24.98), 30A Dryer ($12.98), 50A Range ($14.98)

**Boxes & Fittings (10):** 4" Square Box ($2.18), 4-11/16" Square Box ($3.48), Single/Double Gang Old Work ($2.28/$3.98), 3/4" and 1" EMT Connectors ($0.68/$0.98), 3/4" EMT Coupling ($0.58), PVC Cement ($6.48), 3/4" Conduit Straps 100pk ($12.98), Weatherproof Cover ($8.98)

**Lighting (10):** 2x4 LED Panel 40W ($42.98), 2x2 LED Panel 30W ($36.98), 4ft LED Strip ($32.98), 6" Recessed Downlight ($14.98), Exit Sign ($32.98), Emergency Light ($34.98), Wall Pack 30W ($54.98), Flood Light 50W ($48.98), Under Cabinet 24in ($28.98), Track Light Head ($22.98)

**Miscellaneous (10):** Wire Nuts Yellow/Red 100pk ($5.98/$6.48), Cable Staples 200pk ($4.98), Electrical Tape 3pk ($5.48), Tapcon Anchors 25pk ($12.48), Fire Caulk ($8.98), 5/8"x8ft Ground Rod ($18.98), Ground Rod Clamp ($3.98), #6 Bare Copper per ft ($1.28), Zip Ties 100pk ($3.98)

Also seed a **sample project**: "Office TI - Suite 200 Electrical" for Juan Rivera / Rivera Commercial Group at 8500 NW 36th St, Doral, FL 33166 — commercial type with 16 line items covering sub-panel, breakers, wire, conduit, fittings, receptacles, switches, LED panels, exit signs, emergency lights, old work boxes, and demolition.

---

### Pages & Features

**1. Dashboard (/):**
- 4 metric cards with animated count-up: Active Projects, Pipeline Value, Won Projects, Avg Estimate
- Recent Projects table (8 most recent, with status badges and grand totals)
- Pipeline by Status donut chart (Recharts PieChart)
- Monthly Estimates bar chart (last 6 months)
- Quick action buttons: New Estimate, Manage Materials, View Projects
- Loading skeleton state with glass cards

**2. Projects List (/projects):**
- Search bar (filters by name, client, address) with 300ms debounce
- Status filter pills: All, Draft, Submitted, Won, Lost
- Grid view (mobile) / Table view (desktop) toggle
- Project cards: status/type badges, address, line item count, date, grand total
- Duplicate and Delete actions (delete has 2-step confirmation dialog)

**3. Project Detail (/projects/[id]):**
- 4 tabs: Overview, Estimate, Documents, Export
- **Overview**: 6 metric cards (Materials, Labor, Demo, Overhead, Profit, Grand Total), project details panel
- **Estimate**: Full line item editor table (desktop) / card layout (mobile). Add items from Materials catalog, Custom, or Labor Only. Inline editing of all fields. Totals footer with material/labor/demo subtotals, direct cost, overhead, profit, grand total
- **Documents**: Drag-drop PDF upload, document grid with delete
- **Export**: Excel (.xlsx with formula cells) and PDF export buttons, summary grid
- Material Picker modal: search + filter, select material, set quantity, add to estimate

**4. New Estimate Wizard (/estimates/new):**
- 3-step wizard with progress indicator
- **Step 1 — Project Details**: Name, Client, Company, Address, City, State, ZIP, Type selector (3 buttons), Description textarea
- **Step 2 — Upload & Analyze**: Drag-drop PDF upload area, file list with remove, "Generate AI Estimate" button that extracts PDF text and sends to Claude for analysis, loading state with brain icon, error handling, skip option for manual entry
- **Step 3 — Review & Export**: 3 sub-tabs (Line Items editor, Markup sliders for overhead/profit/labor rate with cost breakdown, Notes/Terms). Save as Draft button. Success state with link to project.

**5. Materials Catalog (/materials):**
- Search + category filter buttons
- Add/Edit dialog (name, SKU, category dropdown, unit dropdown, price)
- Desktop: table with edit/delete. Mobile: card layout
- Delete: 2-click pattern (first click shows "Sure?", 3s timeout resets)

**6. Settings (/settings):**
- Company Information section (6 fields)
- Default Rates section (labor rate, overhead %, profit %, tax %)
- AI Configuration section (API key with show/hide toggle + link to Anthropic console) — **NOTE: Replace this with Claude subscription integration instead of API key**
- Default Terms textarea
- Save button (disabled until form dirty)

---

### Navigation

**Desktop (≥768px):** Fixed left sidebar, 72px collapsed / 260px expanded. Logo + company name at top. 5 nav items: Dashboard, Projects, New Estimate (red highlight), Materials, Settings. Active state: 3px red left border + red icon. Collapse toggle at bottom.

**Mobile (<768px):** Fixed bottom tab bar with glass background (backdrop-filter blur). 5 items with icons + labels. "New" button is a prominent 48px red circle in the center. Touch-friendly 44px minimum heights.

---

### Cost Calculation Engine

```
For each line item:
  materialCost = quantity × unitPrice
  laborCost = laborHours × (laborRate override || project laborRate)
  lineTotal = materialCost + laborCost

For totals:
  materialSubtotal = sum of all non-demolition materialCost
  laborSubtotal = sum of all non-demolition laborCost
  demolitionSubtotal = sum of all "Demolition" category lineTotals
  directCost = materialSubtotal + laborSubtotal + demolitionSubtotal
  overhead = directCost × overheadPct
  subtotalWithOverhead = directCost + overhead
  profit = subtotalWithOverhead × profitPct
  grandTotal = subtotalWithOverhead + profit
```

Demolition items are NOT split into material/labor — they're tallied as a single line.

---

### AI Estimation Feature

When the user uploads PDFs and clicks "Generate AI Estimate":

1. Extract text from each PDF using pdf-parse
2. Build a system prompt that includes: the full materials catalog (with IDs, prices, units), the project labor rate, project type, valid categories, and estimation rules
3. Send to Claude with instructions to return a JSON array of line items
4. Parse the JSON response (handle markdown code blocks, extract arrays)
5. Validate and clean each item (ensure quantity > 0, valid categories, etc.)
6. Populate the estimate wizard's line items

**System prompt includes:**
- Role: "expert electrical estimator for Manny Source Electric Corp"
- Full materials catalog as a formatted list
- Valid categories: Wire, Conduit, Panels & Breakers, Devices, Boxes & Fittings, Lighting, Miscellaneous, Labor Only, Demolition
- Valid units: each, ft, roll, box, pack, lot, set, pair
- Rules: use realistic quantities, match catalog items by materialId, create custom items when no match, include demolition and labor-only tasks
- Output format: JSON array with description, category, quantity, unit, unitPrice, laborHours, materialId

**IMPORTANT**: Instead of using `@anthropic-ai/sdk` with a paid API key, integrate this through my existing Claude subscription. Options:
- Use Claude's MCP server integration
- Build a client-side "paste text" workflow where I copy PDF text and get results through my Claude session
- Use a local Claude Code proxy
- Whatever approach avoids separate API billing

---

### PWA Support

Include a `manifest.json`:
- name: "Manny Source Electric Corp. - Bid Estimator"
- short_name: "MS Estimator"
- display: standalone
- background_color: #0A0A0A
- theme_color: #CC0000
- SVG icons at 192px and 512px

Add apple-mobile-web-app meta tags in the root layout.

---

### Excel Export Details

Use ExcelJS to generate .xlsx files with:
- Company header (name, address, phone, license)
- Project info (name, client, address)
- Itemized table with columns: #, Description, Category, Qty, Unit, Unit Price, Material Cost, Labor Hrs, Labor Rate, Labor Cost, Line Total
- **Use Excel formulas** for Material Cost (=Qty×UnitPrice), Labor Cost (=Hours×Rate), Line Total (=MatCost+LaborCost)
- Summary section: Material Subtotal (SUM formula), Labor Subtotal, Demolition, Direct Cost, Overhead (formula), Profit (formula), Grand Total (formula)
- Professional formatting: alternating row colors, bold headers, currency format, frozen header row

---

### Key Architectural Patterns

1. **All glass UI elements** use the `.glass`, `.glass-card`, `.glass-input` classes with backdrop-filter blur
2. **Responsive**: Mobile-first. Desktop sidebar ↔ Mobile bottom nav at 768px breakpoint
3. **State**: Zustand stores with Immer for mutations, localStorage persistence for draft estimates
4. **Forms**: react-hook-form + Zod schemas for every form
5. **API Routes**: Next.js App Router route handlers with Prisma queries
6. **File Storage**: PDFs stored as base64 in the database `fileData` column (for serverless compatibility)
7. **Animations**: Framer Motion for page transitions, CSS keyframes for orbs/stagger
8. **Touch**: 44px minimum tap targets, safe-area-insets for notched phones

---

### Deployment

Deploy to a **free hosting platform** (NOT Vercel):

1. **Render.com** (recommended):
   - Create a free "Web Service"
   - Connect GitHub repo
   - Build command: `prisma generate && next build`
   - Start command: `next start`
   - Add environment variables: DATABASE_URL, DIRECT_DATABASE_URL

2. **Database**: Use Neon Postgres (free tier)
   - Quick provision: `curl -s -X POST https://instagres.com/api/v1/database -H "Content-Type: application/json" -d '{"ref": "bid-estimator"}'`
   - Claim the database to a free Neon account to make it permanent
   - Push schema: `npx prisma db push`
   - Seed data: `npx tsx prisma/seed.ts`

3. Set `DATABASE_URL` and `DIRECT_DATABASE_URL` environment variables on the hosting platform

Build the complete application, test it locally, push to GitHub, and give me deployment instructions. Make sure the build passes with zero errors before deployment.

## PROMPT END
