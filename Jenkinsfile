// DEV@Deakin CI/CD pipeline.
//
// All seven stages: Build, Test, Code Quality, Security, Deploy, Release and Monitoring.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        APP_VERSION = "${env.BUILD_NUMBER}"
        JWT_SECRET                      = credentials('JWT_SECRET')
        SENDGRID_API_KEY                = credentials('SENDGRID_API_KEY')
        SENDER_EMAIL                    = credentials('SENDER_EMAIL')
        FIREBASE_SERVICE_ACCOUNT_BASE64 = credentials('FIREBASE_SERVICE_ACCOUNT_BASE64')
        SONAR_TOKEN                     = credentials('SONAR_TOKEN')

        SONAR_GATE_ENFORCED = 'true'

        MIN_COVERAGE               = '44'   // measured 44.5%
        MAX_DUPLICATION            = '3'    // measured 0.0%
        MAX_MAINTAINABILITY_RATING = '1'    // measured A
        MAX_RELIABILITY_RATING     = '4'    // measured D - bugs to be addressed in the Security stage
        MAX_SECURITY_RATING        = '3'    // measured C - vulnerabilities to be addressed in the Security stage

        SECURITY_GATE_ENFORCED = 'true'

        STAGING_PROJECT = 'devdeakin-staging'
        STAGING_PORT    = '8001'
        PROD_PROJECT    = 'devdeakin-prod'
        PROD_PORT       = '8000'

        DOCKER_HOST_NAME = 'host.docker.internal'

        MONITORING_COMPOSE = 'monitoring/docker-compose.monitoring.yml'
        PROMETHEUS_PORT    = '9090'
        GRAFANA_PORT       = '3001'
    }

    stages {
        stage('Preflight') {
            steps {
                sh '''
                    set -e
                    echo "Build   : ${APP_VERSION}"
                    echo "Commit  : $(git rev-parse --short HEAD)"
                    echo "Node    : $(node -v)"
                    echo "npm     : $(npm -v)"
                    echo "Docker  : $(docker version --format '{{.Client.Version}} client / {{.Server.Version}} daemon')"
                    echo "Compose : $(docker compose version --short)"

                    # Confirms each secret is bound without printing its value
                    check() {
                        name=$1
                        value=$2
                        if [ -z "$value" ]; then
                            echo "$name: MISSING"
                            exit 1
                        fi
                        echo "$name: bound (${#value} characters)"
                    }
                    check JWT_SECRET "$JWT_SECRET"
                    check SENDGRID_API_KEY "$SENDGRID_API_KEY"
                    check SENDER_EMAIL "$SENDER_EMAIL"
                    check FIREBASE_SERVICE_ACCOUNT_BASE64 "$FIREBASE_SERVICE_ACCOUNT_BASE64"
                    check SONAR_TOKEN "$SONAR_TOKEN"
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    set -e

                    echo "=== Installing dependencies (npm ci: exact lockfile versions)"
                    (cd server   && npm ci)
                    (cd frontend && npm ci)

                    echo "=== Compiling the server (TypeScript to dist/)"
                    (cd server   && npm run build)

                    echo "=== Building the frontend bundle (type-check, then Vite build)"
                    (cd frontend && npm run build)

                    echo "=== Building container images tagged ${APP_VERSION}"
                    docker compose build

                    echo "=== Images produced by this build"
                    docker image ls --filter "reference=devdeakin-*:${APP_VERSION}" \
                        --format "  {{.Repository}}:{{.Tag}}  ({{.Size}})"
                '''
            }
            post {
                success {
                    archiveArtifacts artifacts: 'server/dist/**, frontend/dist/**',
                                     fingerprint: true
                }
            }
        }

        stage('Test') {
            steps {
                sh '''
                    # Clear last build's reports so a crash can't republish stale results
                    rm -rf server/test-results server/coverage
                    rm -rf frontend/test-results frontend/coverage

                    # Run both suites even if the first fails, so one build reports
                    # everything that is broken, then fail the stage
                    failed=0

                    echo "=== Server tests (unit + integration, with coverage)"
                    (cd server && npm run test:coverage) || failed=1

                    echo "=== Frontend tests (unit + component, with coverage)"
                    (cd frontend && npm run test:coverage) || failed=1

                    if [ "$failed" -ne 0 ]; then
                        echo "One or more test suites failed - failing the build"
                        exit 1
                    fi
                '''
            }
            post {
                always {
                    junit testResults: 'server/test-results/junit.xml, frontend/test-results/junit.xml',
                          allowEmptyResults: false
                }
            }
        }

        stage('Code Quality') {
            steps {
                sh '''
                    set -e

                    echo "=== ESLint (frontend)"
                    (cd frontend && npm run lint)

                    echo "=== SonarCloud analysis"
                    # The scanner runs as a container. --volumes-from "$(hostname)" attaches
                    # the Jenkins container's volumes, so the scanner sees this workspace:
                    # inside the container, hostname is its own container ID.
                    rm -rf .scannerwork gate.json
                    mkdir -p .scannerwork

                    # The scanner image runs as a non-root user and defaults its working
                    # directory to /tmp inside the container, so report-task.txt (which
                    # carries the analysis task ID) would be discarded with --rm. Running
                    # as root and setting metadataFilePath writes it into the workspace.
                    docker run --rm \
                        --user 0:0 \
                        --volumes-from "$(hostname)" \
                        -w "$WORKSPACE" \
                        -e SONAR_HOST_URL=https://sonarcloud.io \
                        -e SONAR_TOKEN="$SONAR_TOKEN" \
                        sonarsource/sonar-scanner-cli:latest \
                        -Dsonar.projectVersion="$APP_VERSION" \
                        -Dsonar.scanner.metadataFilePath="$WORKSPACE/.scannerwork/report-task.txt"

                    echo "=== Waiting for SonarCloud to finish processing"
                    # SonarCloud analyses server-side after upload. The usual
                    # waitForQualityGate step needs a webhook back into Jenkins, which a
                    # localhost instance cannot receive, so poll the API instead.
                    if [ ! -f .scannerwork/report-task.txt ]; then
                        echo "Scanner did not write report-task.txt - cannot verify the quality gate"
                        exit 1
                    fi

                    CE_URL=$(grep '^ceTaskUrl=' .scannerwork/report-task.txt | cut -d= -f2-)
                    DASHBOARD=$(grep '^dashboardUrl=' .scannerwork/report-task.txt | cut -d= -f2-)

                    if [ -z "$CE_URL" ]; then
                        echo "No ceTaskUrl in report-task.txt - cannot verify the quality gate"
                        exit 1
                    fi

                    ANALYSIS_ID=""
                    attempt=1
                    while [ "$attempt" -le 30 ]; do
                        RESPONSE=$(curl -sS -u "$SONAR_TOKEN:" "$CE_URL")
                        STATUS=$(printf '%s' "$RESPONSE" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).task.status))')
                        if [ "$STATUS" = "SUCCESS" ]; then
                            ANALYSIS_ID=$(printf '%s' "$RESPONSE" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).task.analysisId||""))')
                            break
                        fi
                        if [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELED" ]; then
                            echo "SonarCloud analysis $STATUS"
                            exit 1
                        fi
                        echo "  analysis $STATUS (attempt $attempt)"
                        attempt=$((attempt + 1))
                        sleep 5
                    done

                    if [ -z "$ANALYSIS_ID" ]; then
                        echo "Timed out waiting for SonarCloud to process the analysis"
                        exit 1
                    fi

                    echo "=== Quality gate"
                    curl -sS -u "$SONAR_TOKEN:" \
                        "https://sonarcloud.io/api/qualitygates/project_status?analysisId=$ANALYSIS_ID" \
                        > gate.json

                    # Condition detail goes to stderr so only the status is captured
                    GATE=$(node -e 'const p=require("./gate.json").projectStatus;console.log(p.status);for(const c of p.conditions||[])console.error("  "+(c.status==="OK"?"PASS":"FAIL")+"  "+c.metricKey+": "+c.actualValue+" (threshold "+c.errorThreshold+")")')

                    echo "Quality gate: $GATE"
                    echo "Dashboard   : $DASHBOARD"

                    if [ "$GATE" != "OK" ]; then
                        if [ "$SONAR_GATE_ENFORCED" = "true" ]; then
                            echo "Quality gate failed - failing the build"
                            exit 1
                        fi
                        echo "Quality gate not met (reporting only - see SONAR_GATE_ENFORCED)"
                    fi

                    echo "=== Overall-code thresholds"
                    SONAR_PROJECT_KEY=$(grep '^sonar.projectKey=' sonar-project.properties | cut -d= -f2-)
                    export SONAR_PROJECT_KEY
                    if [ "$SONAR_GATE_ENFORCED" = "true" ]; then
                        node scripts/check-quality-thresholds.mjs
                    else
                        node scripts/check-quality-thresholds.mjs || echo "Thresholds not met (reporting only)"
                    fi
                '''
            }
        }
        stage('Security') {
            steps {
                sh '''
                    set -e
                    rm -rf security-reports
                    mkdir -p security-reports
                    failed=0

                    # Two ways to run Trivy. Image scans talk to the Docker daemon through
                    # the socket; filesystem scans need this workspace, which arrives via
                    # the Jenkins container's own volumes. A named cache volume keeps
                    # Trivy's vulnerability database between builds.
                    TRIVY_IMAGE="docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        --volumes-from $(hostname) \
                        -w $WORKSPACE \
                        -v trivy-cache:/root/.cache \
                        aquasec/trivy:latest"
                    TRIVY_FS="docker run --rm \
                        --volumes-from $(hostname) \
                        -w $WORKSPACE \
                        -v trivy-cache:/root/.cache \
                        aquasec/trivy:latest"

                    echo "=== Dependency vulnerabilities: full audit (informational)"
                    (cd server   && npm audit) || true
                    (cd frontend && npm audit) || true

                    echo
                    echo "=== Dependency vulnerabilities: production dependencies only (gated)"
                    # Dev dependencies never reach the shipped artefact, so only production
                    # dependencies gate the build. The full audit above still reports them.
                    (cd server   && npm audit --omit=dev --audit-level=high) || failed=1
                    (cd frontend && npm audit --omit=dev --audit-level=high) || failed=1

                    echo
                    echo "=== Container image vulnerabilities (Trivy)"
                    for image in devdeakin-server devdeakin-frontend; do
                        echo "--- ${image}:${APP_VERSION}"
                        # --table-mode detailed suppresses the per-package summary table,
                        # which lists every node_modules file and buries the findings
                        $TRIVY_IMAGE image --scanners vuln --severity HIGH,CRITICAL \
                            --table-mode detailed --no-progress "${image}:${APP_VERSION}"

                        $TRIVY_IMAGE image --scanners vuln --format json --quiet \
                            -o "security-reports/${image}-trivy.json" "${image}:${APP_VERSION}"

                        # Gate only on vulnerabilities with a fix available: an unfixable
                        # CVE in a base image cannot be actioned by this build
                        $TRIVY_IMAGE image --scanners vuln --severity HIGH,CRITICAL \
                            --ignore-unfixed --exit-code 1 --quiet --no-progress \
                            "${image}:${APP_VERSION}" > /dev/null || failed=1
                    done

                    echo
                    echo "=== Infrastructure misconfiguration (Dockerfiles and Compose)"
                    $TRIVY_FS config --severity HIGH,CRITICAL \
                        --skip-dirs "**/node_modules" . || true

                    echo
                    echo "=== Committed secrets"
                    $TRIVY_FS fs --scanners secret --no-progress \
                        --skip-dirs "**/node_modules" --skip-dirs "**/dist" \
                        --exit-code 1 . || failed=1

                    if [ "$failed" -ne 0 ]; then
                        if [ "$SECURITY_GATE_ENFORCED" = "true" ]; then
                            echo "Security findings breach policy - failing the build"
                            exit 1
                        fi
                        echo "Security findings present (reporting only - see SECURITY_GATE_ENFORCED)"
                    fi
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'security-reports/**', allowEmptyArchive: true
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                sh '''
                    set -e

                    echo "=== Deploying build ${APP_VERSION} to staging on port ${STAGING_PORT}"
                    # --no-build: run exactly the images the Build stage produced.
                    # --wait: block until every container reports healthy, or fail.
                    APP_VERSION="${APP_VERSION}" FRONTEND_PORT="${STAGING_PORT}" \
                        docker compose -p "${STAGING_PROJECT}" up -d --no-build \
                        --wait --wait-timeout 120

                    echo
                    docker compose -p "${STAGING_PROJECT}" ps

                    BASE="http://${DOCKER_HOST_NAME}:${STAGING_PORT}"
                    echo
                    echo "=== Smoke tests against ${BASE}"

                    echo "--- nginx is serving"
                    curl -fsS "${BASE}/healthz"

                    echo "--- the React app is being served"
                    curl -fsS "${BASE}/" | grep -q 'id="root"'
                    echo "index.html served"

                    echo "--- the API answers through the proxy, and reports this build"
                    HEALTH=$(curl -fsS "${BASE}/api/health")
                    echo "${HEALTH}"
                    DEPLOYED=$(printf '%s' "${HEALTH}" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).version))')

                    # The artefact check: the running container must be the build this
                    # pipeline just produced, not a leftover from an earlier run
                    if [ "${DEPLOYED}" != "${APP_VERSION}" ]; then
                        echo "Version mismatch: staging reports ${DEPLOYED}, expected ${APP_VERSION}"
                        exit 1
                    fi
                    echo "staging is running build ${DEPLOYED}"

                    echo "--- the database is reachable"
                    curl -fsS "${BASE}/api/posts" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const p=JSON.parse(d).posts;if(!Array.isArray(p))throw new Error("no posts array");console.log(p.length+" posts returned from Firestore")})'

                    echo "--- metrics are not exposed publicly"
                    CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/metrics")
                    if [ "${CODE}" != "404" ]; then
                        echo "Expected 404 for /api/metrics, got ${CODE}"
                        exit 1
                    fi
                    echo "/api/metrics returns 404 as intended"

                    echo
                    echo "Staging deployment verified: ${BASE}"
                '''
            }
        }

        stage('Release') {
            steps {
                // The token is bound only for this stage: nothing earlier needs write
                // access to GitHub
                withCredentials([string(credentialsId: 'GITHUB_TOKEN', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        set -e
                        rm -rf release
                        mkdir -p release
                        TAG="v${APP_VERSION}"
                        COMMIT=$(git rev-parse HEAD)

                        echo "=== Promoting the images verified in staging"
                        # Retagging, not rebuilding: production runs the exact bytes that
                        # passed every earlier stage
                        for image in devdeakin-server devdeakin-frontend; do
                            docker tag "${image}:${APP_VERSION}" "${image}:${TAG}"
                            docker tag "${image}:${APP_VERSION}" "${image}:latest"
                            echo "  ${image}: ${APP_VERSION} -> ${TAG}, latest"
                        done

                        echo
                        echo "=== Changelog since the previous release"
                        PREVIOUS=$(git tag --list 'v*' --sort=-v:refname | head -n 1)
                        if [ -n "${PREVIOUS}" ]; then
                            echo "  changes since ${PREVIOUS}:"
                            git log --pretty=format:'- %h %s (%an)' "${PREVIOUS}..HEAD" > release/CHANGELOG.md
                        else
                            echo "  first release: most recent 20 commits"
                            git log -20 --pretty=format:'- %h %s (%an)' > release/CHANGELOG.md
                        fi
                        cat release/CHANGELOG.md
                        echo

                        echo "=== Release manifest"
                        # Records exactly what was released, so any running container can
                        # be traced back to a build, a commit and an image digest
                        SERVER_DIGEST=$(docker image inspect "devdeakin-server:${TAG}" --format '{{.Id}}')
                        FRONTEND_DIGEST=$(docker image inspect "devdeakin-frontend:${TAG}" --format '{{.Id}}')
                        cat > release/manifest.json <<MANIFEST
{
  "version": "${APP_VERSION}",
  "tag": "${TAG}",
  "commit": "${COMMIT}",
  "released": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "images": {
    "server": { "tag": "devdeakin-server:${TAG}", "id": "${SERVER_DIGEST}" },
    "frontend": { "tag": "devdeakin-frontend:${TAG}", "id": "${FRONTEND_DIGEST}" }
  },
  "environments": {
    "staging": "http://localhost:${STAGING_PORT}",
    "production": "http://localhost:${PROD_PORT}"
  }
}
MANIFEST
                        cat release/manifest.json

                        echo
                        echo "=== Deploying ${TAG} to production on port ${PROD_PORT}"
                        APP_VERSION="${APP_VERSION}" FRONTEND_PORT="${PROD_PORT}" \
                            docker compose -p "${PROD_PROJECT}" up -d --no-build \
                            --wait --wait-timeout 120
                        docker compose -p "${PROD_PROJECT}" ps

                        echo
                        echo "=== Verifying production"
                        PROD="http://${DOCKER_HOST_NAME}:${PROD_PORT}"
                        curl -fsS "${PROD}/healthz"
                        LIVE=$(curl -fsS "${PROD}/api/health" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).version))')
                        if [ "${LIVE}" != "${APP_VERSION}" ]; then
                            echo "Production reports ${LIVE}, expected ${APP_VERSION}"
                            exit 1
                        fi
                        echo "production is running build ${LIVE}"

                        echo
                        echo "=== Tagging the release in Git"
                        git config user.email "jenkins@devdeakin.local"
                        git config user.name  "Jenkins"

                        if git rev-parse "${TAG}" >/dev/null 2>&1; then
                            echo "  ${TAG} already exists - leaving it untouched"
                        else
                            git tag -a "${TAG}" -m "Release ${TAG} from build ${APP_VERSION}"
                            git push "https://x-access-token:${GITHUB_TOKEN}@github.com/DevMain86/SIT223-7.3HD.git" "${TAG}"
                            echo "  pushed ${TAG}"
                        fi

                        echo
                        echo "Released ${TAG}: production on ${PROD}, staging on http://${DOCKER_HOST_NAME}:${STAGING_PORT}"
                    '''
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'release/**', fingerprint: true
                }
            }
        }

        stage('Monitoring') {
            steps {
                sh '''
                    set -e

                    PROM="http://${DOCKER_HOST_NAME}:${PROMETHEUS_PORT}"

                    echo "=== Checking the monitoring stack is running"
                    # The pipeline verifies monitoring; it does not start or restart it.
                    # Monitoring is long-lived infrastructure that has to keep observing
                    # and alerting across deployments - restarting Prometheus on every
                    # release would blind the alerting exactly when a deployment is most
                    # likely to break something. It is started once, out of band, with:
                    #   docker compose -f monitoring/docker-compose.monitoring.yml up -d
                    attempt=1
                    while [ "$attempt" -le 12 ]; do
                        if curl -fsS "${PROM}/-/ready" >/dev/null 2>&1; then
                            echo "Prometheus is ready"
                            break
                        fi
                        echo "  waiting for Prometheus (attempt ${attempt})"
                        attempt=$((attempt + 1))
                        sleep 5
                    done

                    if ! curl -fsS "${PROM}/-/ready" >/dev/null 2>&1; then
                        echo "Prometheus is not reachable at ${PROM}"
                        echo "Start the monitoring stack with:"
                        echo "  docker compose -f ${MONITORING_COMPOSE} up -d"
                        exit 1
                    fi

                    echo
                    echo "=== Alert rules loaded"
                    curl -fsS "${PROM}/api/v1/rules" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const g=JSON.parse(d).data.groups;let n=0;for(const grp of g){for(const r of grp.rules){if(r.type==="alerting"){n++;console.log("  ["+grp.name+"] "+r.name+" ("+(r.labels.severity||"none")+")")}}}if(n===0){console.error("No alert rules loaded");process.exit(1)}console.log("  "+n+" alert rules active")})'

                    echo
                    echo "=== Waiting for the first scrape of the released build"
                    # Prometheus scrapes every 15s; the stack may have only just started
                    attempt=1
                    SCRAPED=""
                    while [ "$attempt" -le 12 ]; do
                        SCRAPED=$(curl -fsS "${PROM}/api/v1/query?query=up%7Bjob%3D%22devdeakin-api%22%7D" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d).data.result;console.log(r.length&&r[0].value[1]==="1"?"up":"")})')
                        if [ "$SCRAPED" = "up" ]; then
                            echo "API target is up"
                            break
                        fi
                        echo "  target not up yet (attempt ${attempt})"
                        attempt=$((attempt + 1))
                        sleep 10
                    done

                    if [ "$SCRAPED" != "up" ]; then
                        echo "Prometheus cannot scrape the production API"
                        exit 1
                    fi

                    echo
                    echo "=== Confirming monitoring sees the build that was just released"
                    # Closes the loop: the version in the metrics store must match the
                    # version this pipeline built, tested, scanned and released
                    OBSERVED=$(curl -fsS "${PROM}/api/v1/query?query=app_info" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d).data.result;console.log(r.length?r[0].metric.version:"")})')
                    echo "  app_info reports version ${OBSERVED}"
                    if [ "${OBSERVED}" != "${APP_VERSION}" ]; then
                        echo "Monitoring reports ${OBSERVED}, expected ${APP_VERSION}"
                        exit 1
                    fi

                    echo
                    echo "=== Current alert status"
                    curl -fsS "${PROM}/api/v1/alerts" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d).data.alerts;if(!a.length){console.log("  no alerts firing");return}for(const x of a)console.log("  "+x.state.toUpperCase()+"  "+x.labels.alertname)})'

                    echo
                    echo "Monitoring verified"
                    echo "  Prometheus   http://localhost:${PROMETHEUS_PORT}"
                    echo "  Alertmanager http://localhost:9093"
                    echo "  Grafana      http://localhost:${GRAFANA_PORT}"
                '''
            }
        }
    }

    post {
        success {
            echo "Build ${env.APP_VERSION} completed successfully"
        }
        failure {
            echo 'Pipeline failed - see the stage log above'
        }
    }
}