#!/bin/bash
BASE="http://localhost:3000/api"
[ -z "$TOKEN" ] && { echo "❌ Set TOKEN first"; exit 1; }

AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; echo "$2"; exit 1; }

echo "════════ 1. CREATE event ════════"
EVENT=$(curl -s -X POST "$BASE/events" -H "$AUTH" -H "$JSON" \
  -d '{"title":"Smoke Test Event","description":"Testing 5.3","startAt":"2027-01-15T18:00:00.000Z","location":"Mumbai","capacity":50}')
EVENT_ID=$(echo "$EVENT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$EVENT_ID" ] && pass "created event id=$EVENT_ID" || fail "create" "$EVENT"

echo ""
echo "════════ 2. GET event ════════"
RES=$(curl -s "$BASE/events/$EVENT_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "get event" || fail "get" "$RES"

echo ""
echo "════════ 3. LIST events ════════"
RES=$(curl -s "$BASE/events?filter=upcoming" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "list upcoming" || fail "list" "$RES"

echo ""
echo "════════ 4. RSVP going ════════"
RES=$(curl -s -X POST "$BASE/events/$EVENT_ID/rsvp" -H "$AUTH" -H "$JSON" \
  -d '{"status":"going"}')
echo "$RES" | grep -q '"status":"going"' && pass "rsvp going" || fail "rsvp" "$RES"

echo ""
echo "════════ 5. RSVP maybe ════════"
RES=$(curl -s -X POST "$BASE/events/$EVENT_ID/rsvp" -H "$AUTH" -H "$JSON" \
  -d '{"status":"maybe"}')
echo "$RES" | grep -q '"status":"maybe"' && pass "rsvp maybe" || fail "rsvp maybe" "$RES"

echo ""
echo "════════ 6. GET attendees ════════"
RES=$(curl -s "$BASE/events/$EVENT_ID/attendees?status=maybe" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "attendees" || fail "attendees" "$RES"

echo ""
echo "════════ 7. CANCEL RSVP ════════"
RES=$(curl -s -X DELETE "$BASE/events/$EVENT_ID/rsvp" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "cancel rsvp" || fail "cancel" "$RES"

echo ""
echo "════════ 8. UPDATE event ════════"
RES=$(curl -s -X PUT "$BASE/events/$EVENT_ID" -H "$AUTH" -H "$JSON" \
  -d '{"title":"Updated Smoke Event"}')
echo "$RES" | grep -q '"success":true' && pass "update" || fail "update" "$RES"

echo ""
echo "════════ 9. MY events ════════"
RES=$(curl -s "$BASE/events?filter=my" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "my events" || fail "my" "$RES"

echo ""
echo "════════ 10. DELETE event ════════"
RES=$(curl -s -X DELETE "$BASE/events/$EVENT_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "delete" || fail "delete" "$RES"

echo ""
echo "🎉 ALL EVENT SMOKE TESTS PASSED"