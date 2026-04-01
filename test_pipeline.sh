#!/bin/bash

BASE="https://boss-api.mehtahouse.cc"
TEST_EMAIL="qa-test-$(date +%s)@example.com"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

check() {
  echo "$1" | grep -q "$2"
  if [ $? -eq 0 ]; then
    pass "$3"
  else
    echo "Response was:"
    echo "$1"
    fail "$3"
  fi
}

echo "Running pipeline tests..."
echo "Test email: $TEST_EMAIL"
echo "----------------------------------"

# TEST 1 — Invoice preview (read-only, always safe)
res=$(curl -s "$BASE/api/campaigns/30/invoice-preview")
check "$res" '"campaign_id":30' "Invoice preview"

# TEST 2 — Generate invoice (resilient: accepts existing invoice or new one)
res=$(curl -s -X POST "$BASE/api/campaigns/30/generate-invoice")
echo "$res" | grep -qE '"invoice_id"|"invoice_number"'
if [ $? -eq 0 ]; then
  pass "Generate invoice (idempotent)"
else
  echo "Response was:"
  echo "$res"
  fail "Generate invoice (idempotent)"
fi

# TEST 3 — Campaign completion (idempotent — safe to call on already-completed campaign)
res=$(curl -s -X POST "$BASE/api/campaigns/30/complete")
check "$res" '"status":"completed"' "Campaign completion"

# TEST 4 — Alerts endpoint (read-only, always safe)
res=$(curl -s "$BASE/api/alerts")
check "$res" '"alerts"' "Alerts endpoint"

# TEST 5 — QA endpoint (state-independent: accepts fresh run or already-completed)
res=$(curl -s -X POST "$BASE/api/campaign-leads/1/qa")
echo "$res" | grep -qE '"qa_status"|"QA already'
if [ $? -eq 0 ]; then
  pass "QA endpoint"
else
  echo "Response was:"
  echo "$res"
  fail "QA endpoint"
fi

# TEST 6 — Duplicate lead blocked (uses unique email per run)
# First insert — creates the lead fresh
curl -s -X POST "$BASE/api/campaigns/30/leads" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"source\":\"manual\"}" > /dev/null

# Second insert — must be blocked
res=$(curl -s -X POST "$BASE/api/campaigns/30/leads" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"source\":\"manual\"}")
check "$res" 'already exists' "Duplicate lead blocked"

echo "----------------------------------"
echo "🎯 All tests passed"
