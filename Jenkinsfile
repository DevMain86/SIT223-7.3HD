

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
    }

    stages {

        stage('Environment') {
            steps {
                sh '''
                    set -e
                    echo "Build   : ${APP_VERSION}"
                    echo "Commit  : $(git rev-parse --short HEAD)"
                    echo "Node    : $(node -v)"
                    echo "npm     : $(npm -v)"
                    echo "Docker  : $(docker version --format '{{.Client.Version}} client / {{.Server.Version}} daemon')"
                    echo "Compose : $(docker compose version --short)"
                '''
            }
        }

        stage('Workspace') {
            steps {
                sh '''
                    set -e
                    ls -1
                    test -f docker-compose.yml
                    test -f server/Dockerfile
                    test -f frontend/Dockerfile
                    test -f server/package.json
                    test -f frontend/package.json
                    echo "Repository checked out and project layout verified"
                '''
            }
        }

        stage('Credentials') {
            steps {
                withCredentials([
                    string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET'),
                    string(credentialsId: 'SENDGRID_API_KEY', variable: 'SENDGRID_API_KEY'),
                    string(credentialsId: 'SENDER_EMAIL', variable: 'SENDER_EMAIL'),
                    string(credentialsId: 'FIREBASE_SERVICE_ACCOUNT_BASE64', variable: 'FIREBASE_SERVICE_ACCOUNT_BASE64')
                ]) {

                    sh '''
                        set -e
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
        }
    }

    post {
        success {
            echo "Pipeline completed successfully for build ${env.APP_VERSION}"
        }
        failure {
            echo 'Pipeline failed - see the stage log above'
        }
    }
}