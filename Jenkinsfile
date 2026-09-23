// DEV@Deakin CI/CD pipeline.
//
// Stages 1-3 of 7: Build, Test and Code Quality.

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

        SONAR_GATE_ENFORCED = 'false'
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
                    docker run --rm \
                        --volumes-from "$(hostname)" \
                        -w "$WORKSPACE" \
                        -e SONAR_HOST_URL=https://sonarcloud.io \
                        -e SONAR_TOKEN="$SONAR_TOKEN" \
                        sonarsource/sonar-scanner-cli:latest \
                        -Dsonar.projectVersion="$APP_VERSION"

                    echo "=== Waiting for SonarCloud to finish processing"
                    # SonarCloud analyses server-side after upload. The usual
                    # waitForQualityGate step needs a webhook back into Jenkins, which a
                    # localhost instance cannot receive, so poll the API instead.
                    CE_URL=$(grep '^ceTaskUrl=' .scannerwork/report-task.txt | cut -d= -f2-)
                    DASHBOARD=$(grep '^dashboardUrl=' .scannerwork/report-task.txt | cut -d= -f2-)

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