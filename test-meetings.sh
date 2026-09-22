#!/bin/bash
BASE="http://localhost:3000/api"
[ -z "$TOKEN" ] && { echo "❌ Set TOKEN first"; exit 1; }

AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; echo "$2"; exit 1; }

echo "════════ 1. CREATE instant meeting ════════"
M=$(curl -s -X POST "$BASE/meetings" -H "$AUTH" -H "$JSON" \
  -d '{"title":"Smoke Meeting","isInstant":true,"maxParticipants":10}')
MID=$(echo "$M" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$MID" ] && pass "created id=$MID" || fail "create" "$M"

echo ""
echo "════════ 2. GET meeting ════════"
R=$(curl -s "$BASE/meetings/$MID" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "get" || fail "get" "$R"

echo ""
echo "════════ 3. GET Agora token ════════"
R=$(curl -s -X POST "$BASE/meetings/$MID/token" -H "$AUTH")
echo "$R" | grep -q '"token"' && pass "token generated" || fail "token" "$R"

echo ""
echo "════════ 4. START meeting ════════"
R=$(curl -s -X POST "$BASE/meetings/$MID/start" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "started" || fail "start" "$R"

echo ""
echo "════════ 5. JOIN meeting ════════"
R=$(curl -s -X POST "$BASE/meetings/$MID/join" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "joined" || fail "join" "$R"

echo ""
echo "════════ 6. GET participants ════════"
R=$(curl -s "$BASE/meetings/$MID/participants" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "participants" || fail "parts" "$R"

echo ""
echo "════════ 7. LIST meetings ════════"
R=$(curl -s "$BASE/meetings?filter=upcoming" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "list" || fail "list" "$R"

echo ""
echo "════════ 8. END meeting ════════"
R=$(curl -s -X POST "$BASE/meetings/$MID/end" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "ended" || fail "end" "$R"

echo ""
echo "════════ 9. LEAVE meeting ════════"
R=$(curl -s -X POST "$BASE/meetings/$MID/leave" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "left" || fail "leave" "$R"

echo ""
echo "════════ 10. DELETE meeting ════════"
R=$(curl -s -X DELETE "$BASE/meetings/$MID" -H "$AUTH")
echo "$R" | grep -q '"success":true' && pass "deleted" || fail "delete" "$R"

echo ""
echo "🎉 ALL MEETING SMOKE TESTS PASSED"

