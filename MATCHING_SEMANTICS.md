# CSV Lead Search & ICP Matching Semantics
## Issue #10: Unified Matching Policy

This document defines the canonical matching behavior for CSV lead search and ICP (Ideal Customer Profile) filtering across the frontend and backend.

---

## Overview

When a user uploads a CSV file and clicks "Search Raw Data," the system filters contacts against campaign ICP criteria using a **per-row, best-effort matching policy**.

---

## Matching Policy

### Core Principle
- **Matches are INCLUSIVE, not exclusive**: A contact matches if it meets the applied filters.
- **Missing data is forgiving**: If a CSV row lacks a field (e.g., no industry column), that filter is skipped for that row rather than failing it.
- **Text matching is case-insensitive and whitespace-tolerant**: "DIRECTOR" matches "director", "Director of Operations" matches filter "director".

### Filter Application Rules

#### 1. **Title Filter** (Always applied if provided)
- **Logic**: Contact title substring-matches any filter keyword (case-insensitive)
- **Example**:
  - Filter: `["Chief Financial Officer", "CFO"]`
  - Contact: `"CFO"` → **MATCH** (exact)
  - Contact: `"Chief Financial Officer"` → **MATCH** (exact)
  - Contact: `"Chief Operating Officer"` → **NO MATCH**
  - Contact: `"Director of Finance"` → **NO MATCH**

#### 2. **Geography Filter** (Always applied if provided)
- **Logic**: Contact country substring-matches any filter keyword
- **Example**:
  - Filter: `["United States"]`
  - Contact: `"United States"` → **MATCH**
  - Contact: `"US"` → **NO MATCH** (must be full match)
  - Contact: `"United Kingdom"` → **NO MATCH**

#### 3. **Industry Filter** (Best-effort: skipped if CSV has no industry data)
- **Logic**: If CSV has industry data in ANY row, filter applies to ALL rows with industry data; rows without industry data are **NOT penalized**
- **Detection**: Presence check scans all normalized rows; if all are empty/null, filter is skipped
- **Example**:
  - CSV has industry column: filter applies
  - CSV has NO industry column: filter is silently skipped (with UI warning)
  - Row 1: has industry "Technology" → checked against filter
  - Row 2: has empty industry → **considered matching** (not failing on missing data)

#### 4. **Company Size Filter** (Best-effort: skipped if CSV has no company_size data)
- **Logic**: Same as industry filter
- **Standard Buckets**: `"1-50"`, `"51-200"`, `"201-500"`, `"501-1000"`, `"1001-5000"`, `"5000+"`
- **Normalization**: Sizes are normalized to lowercase before matching

---

## Text Normalization

All text values are normalized **identically** on both frontend and backend:

```
normalizeForMatch(value) =
  String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim()
```

### Examples:
- `"CHIEF  FINANCIAL   OFFICER"` → `"chief financial officer"`
- `"CFO"` → `"cfo"`
- `"  United   States  "` → `"united states"`
- `"Technology & AI"` → `"technology & ai"`

---

## Field Name Mapping

### Frontend (CSV Ingest)
The system supports multiple field name variations:

| Canonical Name | Supported Variations |
|---|---|
| `first_name` | first_name, first name, firstname |
| `last_name` | last_name, last name, lastname |
| `title` | job title, title |
| `company` | company_name, company name, company |
| `email` | business_email, business email, email |
| `country` | country |
| `industry` | industry |
| `company_size` | company_size, company size |

### Backend (Assignment)
When assigning contacts to campaigns, the backend accepts the same variations and normalizes to canonical fields:

```typescript
// Backend fallback mapping (Issue #6)
email = contact.email || contact.business_email
firstName = contact.first_name || contact.first_name_alt
title = contact.title || contact.job_title
```

---

## Filter Parsing

### Frontend: CSV-Aware Filter Parsing
Filter inputs accept comma-separated values with CSV-safe quote handling:

```javascript
// Examples of valid inputs:
"Director, VP, Manager"                    // 3 filters
"Chief Financial Officer, CFO"             // 2 filters
"\"Director, Head of Ops\", Manager"       // Quoted commas are preserved
```

### Backend: Parameterized Queries
All SQL queries use parameterized placeholders (`?`) to prevent injection:

```sql
-- GOOD (parameterized)
SELECT * FROM global_leads WHERE country LIKE ?

-- BAD (interpolated) ❌
SELECT * FROM global_leads WHERE country LIKE '${country}'
```

---

## Data Quality & Skipped Filters

### User Feedback
When a filter is skipped due to missing CSV data:

```
⚠️ Filters skipped (no CSV data): Industry, Company Size
```

This toast appears in the UI so non-technical users understand why results may differ.

### Debug Logging
Console logs show normalized values and per-row matching:

```javascript
DEBUG - First contact normalized: {
  titleText: "chief financial officer",
  geoText: "united states",
  industryText: "",
  sizeText: ""
}
DEBUG - Match results: {
  titleMatch: true,
  geoMatch: true,
  industryMatch: true,  // Passes (empty industry)
  sizeMatch: true       // Passes (empty size)
}
```

---

## Frontend vs Backend Semantic Differences

### CSV Raw Search (Frontend)
- **Location**: `searchUploadedContacts()` in `campaigns.js`
- **Scope**: User-uploaded CSV file only
- **Matching**: Substring-based with `includes()`
- **Filter Application**: Per-row best-effort mode

### Global Leads Search (Backend)
- **Location**: `globalLeadsSearch()` in `sourcing.ts`
- **Scope**: Database `global_leads` table
- **Matching**: SQL `LIKE` (pattern matching)
- **Filter Application**: Exact equality for `company_size` bucket matching

### Unification Strategy
To ensure consistency:
1. **Titles**: Both use substring matching (case-insensitive)
2. **Geos**: Both use substring matching (case-insensitive)
3. **Industries**: Both use substring matching (case-insensitive)
4. **Company Size**: Normalize to standard buckets (`"1-50"`, `"51-200"`, etc.) on both sides before comparison

---

## Examples: Complete Filtering

### Scenario 1: Director Role Search
```
Filters: titles=["Director"]
CSV Row: {
  first_name: "John",
  job title: "Director of Operations",
  country: "United States",
  industry: null
}

Matching:
- titleMatch: true ("director" includes "director")
- geoMatch: true (no geo filter)
- industryMatch: true (no industry filter)
✅ MATCH
```

### Scenario 2: Technology CFO in US
```
Filters: titles=["CFO"], industries=["Technology"], geos=["United States"]
CSV Row: {
  first_name: "Jane",
  job title: "Chief Financial Officer",
  company name: "Tech Corp",
  country: "United States",
  industry: "Technology Consulting"
}

Matching:
- titleMatch: false ("chief financial officer" does NOT include "cfo")
- (other filters irrelevant)
❌ NO MATCH

Note: "CFO" should be in titles filter if you want to match "Chief Financial Officer"
```

### Scenario 3: Missing Industry Data
```
Filters: titles=["Manager"], industries=["Financial Services"]
CSV: Has NO industry column

Behavior:
- Industry filter is DETECTED as missing
- All rows are evaluated with industryMatch = true (not penalized)
- Toast shows: "⚠️ Filters skipped: Industry"
- Rows matching "Manager" title filter are returned regardless of industry
```

---

## Performance Considerations

- **CSV Search**: O(n) per-contact filtering with string normalization
- **Batch Size**: Frontend processes up to 100 results in modal; backend supports 10K+
- **Parameterized Queries**: Prevent SQL injection; slight overhead acceptable for security

---

## Future Improvements

1. **Fuzzy Matching**: For typo tolerance (e.g., "Direcor" → "Director")
2. **Phonetic Matching**: For name variations (e.g., "Jonathon" → "Jonathan")
3. **Synonym Mapping**: Define title synonyms (e.g., "SVP" = "Senior Vice President")
4. **Weighted Scoring**: Multi-criteria scoring instead of binary matching
5. **Configuration UI**: Allow users to create custom matching rules per campaign

---

## Related Issues

- **Issue #4**: Per-row best-effort filtering (implemented)
- **Issue #6**: Canonical field mapping (implemented)
- **Issue #7**: SQL injection prevention (implemented)
- **Issue #9**: User feedback for skipped filters (implemented)
- **Issue #10**: This document (unified semantics)

