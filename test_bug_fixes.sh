#!/bin/bash
# Tests for bug fixes #8 + #9 (touchUpdated / last_row_id)
# Usage: ./test_bug_fixes.sh <your-api-token>

BASE="https://boss-api.mehtahouse.cc"
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./test_bug_fixes.sh <api-token>"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; }
check() { echo "$1" | grep -q "$2" && pass "$3" || (echo "  Got: $1" && fail "$3"); }

echo "Testing bug fixes — assets, documents, job-cards"
echo "---"

# ── ASSETS ──────────────────────────────────────────────────
echo "[Assets]"

# POST — should return a real id (not undefined/null)
RES=$(curl -s -X POST "$BASE/api/assets" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"Test Asset","type":"whitepaper","status":"active"}')
check "$RES" '"id":[0-9]' "POST returns numeric id"

ASSET_ID=$(echo "$RES" | sed 's/.*"id":\([0-9]*\).*/\1/')

# PUT — should actually update the record
RES=$(curl -s -X PUT "$BASE/api/assets/$ASSET_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"Updated Asset","type":"whitepaper","status":"active"}')
check "$RES" '"success":true' "PUT returns success"

# Verify the update took effect
RES=$(curl -s "$BASE/api/assets/$ASSET_ID" -H "$AUTH")
check "$RES" 'Updated Asset' "PUT actually updated the record"

# Cleanup
curl -s -X DELETE "$BASE/api/assets/$ASSET_ID" -H "$AUTH" > /dev/null

echo ""
echo "[Documents]"

# POST
RES=$(curl -s -X POST "$BASE/api/documents" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"type":"msa","title":"Test Doc","status":"draft"}')
check "$RES" '"id":[0-9]' "POST returns numeric id"

DOC_ID=$(echo "$RES" | sed 's/.*"id":\([0-9]*\).*/\1/')

# PUT
RES=$(curl -s -X PUT "$BASE/api/documents/$DOC_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Updated Doc","status":"draft"}')
check "$RES" '"success":true' "PUT returns success"

RES=$(curl -s "$BASE/api/documents/$DOC_ID" -H "$AUTH")
check "$RES" 'Updated Doc' "PUT actually updated the record"

curl -s -X DELETE "$BASE/api/documents/$DOC_ID" -H "$AUTH" > /dev/null

echo ""
echo "[Job Cards]"

# POST
RES=$(curl -s -X POST "$BASE/api/job-cards" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Test Job Card","target_leads":100,"cpl":5,"status":"draft"}')
check "$RES" '"id":[0-9]' "POST returns numeric id"

JC_ID=$(echo "$RES" | sed 's/.*"id":\([0-9]*\).*/\1/')

# PUT
RES=$(curl -s -X PUT "$BASE/api/job-cards/$JC_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Updated Job Card","target_leads":200,"cpl":5,"status":"draft"}')
check "$RES" '"success":true' "PUT returns success"

RES=$(curl -s "$BASE/api/job-cards/$JC_ID" -H "$AUTH")
check "$RES" 'Updated Job Card' "PUT actually updated the record"

curl -s -X DELETE "$BASE/api/job-cards/$JC_ID" -H "$AUTH" > /dev/null

echo ""
echo "---"
echo "Done."
