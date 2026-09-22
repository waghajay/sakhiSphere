#!/bin/bash
# test-groups.sh — End-to-end smoke test for Phase 5.1 + 5.2
# Usage: TOKEN=your_jwt_here bash test-groups.sh

BASE="http://localhost:3000/api"

if [ -z "$TOKEN" ]; then
  echo "❌ Set TOKEN env var first: TOKEN=... bash test-groups.sh"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; echo "$2"; exit 1; }

echo "════════ 1. GET categories ════════"
RES=$(curl -s "$BASE/groups/categories")
echo "$RES" | grep -q '"success":true' && pass "categories" || fail "categories" "$RES"

echo ""
echo "════════ 2. CREATE group ════════"
GROUP=$(curl -s -X POST "$BASE/groups" -H "$AUTH" -H "$JSON" \
  -d '{"name":"Smoke Test Group","description":"Testing 5.1","privacy":"public","category":"Technology"}')
GROUP_ID=$(echo "$GROUP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$GROUP_ID" ] && pass "created group id=$GROUP_ID" || fail "create group" "$GROUP"

echo ""
echo "════════ 3. GET group $GROUP_ID ════════"
RES=$(curl -s "$BASE/groups/$GROUP_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "get group" || fail "get group" "$RES"

echo ""
echo "════════ 4. GET groups list (search + filter='all') ════════"
RES=$(curl -s "$BASE/groups?search=Smoke&filter=all" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "search + filter coexist" || fail "search" "$RES"

echo ""
echo "════════ 5. CREATE post in group ════════"
POST=$(curl -s -X POST "$BASE/groups/$GROUP_ID/posts" -H "$AUTH" -H "$JSON" \
  -d '{"content":"First smoke test post!","mediaUrls":[],"mediaTypes":[]}')
POST_ID=$(echo "$POST" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$POST_ID" ] && pass "created post id=$POST_ID" || fail "create post" "$POST"

echo ""
echo "════════ 6. GET group posts ════════"
RES=$(curl -s "$BASE/groups/$GROUP_ID/posts" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "list posts" || fail "list posts" "$RES"

echo ""
echo "════════ 7. GET single post ════════"
RES=$(curl -s "$BASE/groups/posts/$POST_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "get post" || fail "get post" "$RES"

echo ""
echo "════════ 8. LIKE post ════════"
RES=$(curl -s -X POST "$BASE/groups/posts/$POST_ID/like" -H "$AUTH")
echo "$RES" | grep -q '"liked":true' && pass "liked" || fail "like" "$RES"

echo ""
echo "════════ 9. UNLIKE post ════════"
RES=$(curl -s -X POST "$BASE/groups/posts/$POST_ID/like" -H "$AUTH")
echo "$RES" | grep -q '"liked":false' && pass "unliked" || fail "unlike" "$RES"

echo ""
echo "════════ 10. COMMENT on post ════════"
COMMENT=$(curl -s -X POST "$BASE/groups/posts/$POST_ID/comments" -H "$AUTH" -H "$JSON" \
  -d '{"content":"Smoke test comment"}')
COMMENT_ID=$(echo "$COMMENT" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$COMMENT_ID" ] && pass "created comment id=$COMMENT_ID" || fail "comment" "$COMMENT"

echo ""
echo "════════ 11. GET comments ════════"
RES=$(curl -s "$BASE/groups/posts/$POST_ID/comments" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "list comments" || fail "list comments" "$RES"

echo ""
echo "════════ 12. UPDATE post ════════"
RES=$(curl -s -X PUT "$BASE/groups/posts/$POST_ID" -H "$AUTH" -H "$JSON" \
  -d '{"content":"Edited content"}')
echo "$RES" | grep -q '"success":true' && pass "update post" || fail "update post" "$RES"

echo ""
echo "════════ 13. DELETE comment ════════"
RES=$(curl -s -X DELETE "$BASE/groups/comments/$COMMENT_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "delete comment" || fail "delete comment" "$RES"

echo ""
echo "════════ 14. DELETE post ════════"
RES=$(curl -s -X DELETE "$BASE/groups/posts/$POST_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "delete post" || fail "delete post" "$RES"

echo ""
echo "════════ 15. DELETE group ════════"
RES=$(curl -s -X DELETE "$BASE/groups/$GROUP_ID" -H "$AUTH")
echo "$RES" | grep -q '"success":true' && pass "delete group" || fail "delete group" "$RES"

echo ""
echo "🎉 ALL SMOKE TESTS PASSED"


# ──(ajay㉿kali)-[~/Desktop/backend]
# └─$ TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJhamF5QGdtYWlsLmNvbSIsImlhdCI6MTc4OTczMTMxOCwiZXhwIjoxNzkwMzM2MTE4fQ.Ze7shi_3zfIp6oaw5PjjJo7fiy8GUpBo2cQI-fn735M" bash test-groups.sh


eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJhamF5QGdtYWlsLmNvbSIsImlhdCI6MTc4OTczMTMxOCwiZXhwIjoxNzkwMzM2MTE4fQ.Ze7shi_3zfIp6oaw5PjjJo7fiy8GUpBo2cQI-fn735M


TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJhamF5QGdtYWlsLmNvbSIsImlhdCI6MTc4OTczMTMxOCwiZXhwIjoxNzkwMzM2MTE4fQ.Ze7shi_3zfIp6oaw5PjjJo7fiy8GUpBo2cQI-fn735M"
curl -i -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","isInstant":true}'