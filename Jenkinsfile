// DEV@Deakin CI/CD pipeline.
//
// Stage 1 of 7: Build. Installs dependencies, compiles both projects, builds container
// images tagged with the build number, and archives the compiled output.

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