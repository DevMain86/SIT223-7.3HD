set -e

PROJECT="${PROD_PROJECT:-devdeakin-prod}"
PORT="${PROD_PORT:-8000}"
PROMETHEUS="${PROMETHEUS_URL:-http://localhost:9090}"
DURATION="${1:-120}"

# Reads the state of one alert from Prometheus: firing, pending, or inactive
alert_state() {
    curl -fsS "${PROMETHEUS}/api/v1/alerts" 2>/dev/null \
        | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
            try{
              const a=JSON.parse(d).data.alerts.find(x=>x.labels.alertname==="APIDown");
              console.log(a ? a.state : "inactive");
            }catch{console.log("unknown")}
          })' 2>/dev/null || echo "unreachable"
}

echo "=== Before the incident"
echo "  production:  $(curl -fsS "http://localhost:${PORT}/api/health" 2>/dev/null || echo 'not responding')"
echo "  APIDown:     $(alert_state)"
echo

echo "=== Stopping the production API for ${DURATION}s"
docker compose -p "${PROJECT}" stop server
echo

echo "=== Watching the alert (checking every 15s)"
elapsed=0
while [ "${elapsed}" -lt "${DURATION}" ]; do
    sleep 15
    elapsed=$((elapsed + 15))
    printf '  %3ss  APIDown: %s\n' "${elapsed}" "$(alert_state)"
done
echo

echo "=== Restoring the service"
docker compose -p "${PROJECT}" start server

sleep 20
echo
echo "=== After recovery"
echo "  production:  $(curl -fsS "http://localhost:${PORT}/api/health" 2>/dev/null || echo 'still not responding')"
echo "  APIDown:     $(alert_state)"
echo
echo "Alertmanager will have sent a firing email, then a resolved one."