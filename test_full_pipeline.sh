#!/bin/bash

BASE="https://boss-api.mehtahouse.cc"
TEST_EMAIL="pipeline-$(date +%s)@example.com"

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

echo "Running full pipeline test..."
echo "Test email: $TEST_EMAIL"
echo "----------------------------------"

# STEP 1 — Ingest lead
res=$(curl -s -X POST "$BASE/api/campaigns/30/leads" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"source\":\"manual\"}")

check "$res" '"campaign_lead_id"' "Lead ingestion"

# Extract campaign_lead_id for subsequent steps
LEAD_ID=$(echo "$res" | sed 's/.*"campaign_lead_id":\([0-9]*\).*/\1/')

if [ -z "$LEAD_ID" ] || [ "$LEAD_ID" = "$res" ]; then
  echo "Failed to extract campaign_lead_id from response:"
  echo "$res"
  fail "campaign_lead_id extraction"
fi

echo "   campaign_lead_id: $LEAD_ID"

# STEP 2 — QA (auto-runs checks on the lead's email)
res=$(curl -s -X POST "$BASE/api/campaign-leads/$LEAD_ID/qa")
check "$res" '"qa_status":"approved"' "QA approval"

# STEP 3 — Deliver
res=$(curl -s -X POST "$BASE/api/campaign-leads/$LEAD_ID/deliver")
check "$res" '"status":"delivered"' "Delivery"

# STEP 4 — Accept
res=$(curl -s -X POST "$BASE/api/campaign-leads/$LEAD_ID/accept" \
  -H "Content-Type: application/json" \
  -d '{"price":50}')
check "$res" '"status":"accepted"' "Acceptance"

# STEP 5 — Billing override
res=$(curl -s -X POST "$BASE/api/campaign-leads/$LEAD_ID/billing" \
  -H "Content-Type: application/json" \
  -d '{"billing_status":"billable","reason":"pipeline test","overridden_by":"test"}')
check "$res" '"billing_status":"billable"' "Billing override"

# STEP 6 — Generate invoice (idempotent — returns existing or creates new)
res=$(curl -s -X POST "$BASE/api/campaigns/30/generate-invoice")
echo "$res" | grep -qE '"invoice_id"|"invoice_number"'
if [ $? -eq 0 ]; then
  pass "Generate invoice"
else
  echo "Response was:"
  echo "$res"
  fail "Generate invoice"
fi

# STEP 7 — Invoice preview
res=$(curl -s "$BASE/api/campaigns/30/invoice-preview")
check "$res" '"total_amount"' "Invoice preview"

# STEP 8 — Complete campaign (idempotent)
res=$(curl -s -X POST "$BASE/api/campaigns/30/complete")
check "$res" '"status":"completed"' "Campaign completion"

# STEP 9 — Alerts
res=$(curl -s "$BASE/api/alerts")
check "$res" '"alerts"' "Alerts check"

echo "----------------------------------"
echo "🚀 Full pipeline test passed"
