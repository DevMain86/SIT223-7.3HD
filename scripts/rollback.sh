set -e

PROJECT="${PROD_PROJECT:-devdeakin-prod}"
PORT="${PROD_PORT:-8000}"

available() {
    echo "Releases available locally:"
    docker image ls --filter "reference=devdeakin-server:v*" \
        --format "  build {{.Tag}}  ({{.CreatedSince}})" | sort -V
}

if [ -z "$1" ]; then
    available
    echo
    echo "Usage: $0 <build-number>"
    exit 1
fi

TARGET="$1"

# Refuse to roll back to something that was never built, rather than failing
# half-way through with a confusing Compose error
for image in devdeakin-server devdeakin-frontend; do
    if ! docker image inspect "${image}:${TARGET}" >/dev/null 2>&1; then
        echo "No image ${image}:${TARGET} on this host."
        echo
        available
        exit 1
    fi
done

CURRENT=$(curl -fsS "http://localhost:${PORT}/api/health" 2>/dev/null \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).version)}catch{console.log("unknown")}})' \
    2>/dev/null || echo "unknown")

echo "Production is running build ${CURRENT}"
echo "Rolling back to build ${TARGET}"
echo

APP_VERSION="${TARGET}" FRONTEND_PORT="${PORT}" \
    docker compose -p "${PROJECT}" up -d --no-build --wait --wait-timeout 120

# Confirm the rollback took effect rather than assuming it did
LIVE=$(curl -fsS "http://localhost:${PORT}/api/health" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).version))')

if [ "${LIVE}" != "${TARGET}" ]; then
    echo "Rollback failed: production reports ${LIVE}, expected ${TARGET}"
    exit 1
fi

echo
echo "Production is now running build ${LIVE} at http://localhost:${PORT}"