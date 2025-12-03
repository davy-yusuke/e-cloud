# register
curl -X POST http://localhost:8080/auth/register -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"pass1234"}'

# login -> get token
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"pass1234"}' | jq -r .token)
echo "Token: $TOKEN"

curl -X POST http://localhost:8080/folders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"photos"}'

curl -X POST http://localhost:8080/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./test.jpg" \
  -F "parent_id="  # optional

curl -X GET "http://localhost:8080/files?parent_id=" -H "Authorization: Bearer $TOKEN"
