pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'sonar-scanner'
        IMAGE_NAME   = "course-service"
        IMAGE_TAG    = "${BUILD_NUMBER}"
        HARBOR_URL   = "16.171.210.247"
        PROJECT      = "library"
    }

    stages {

        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'git-cred-akjus',
                    url: 'https://github.com/peakyblinder0509/crm-backend-gatewayservice.git'
            }
        }

        stage('Sonar Scan') {
            steps {
                withSonarQubeEnv('sonar') {
                    sh """
                    ${SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.projectKey=course-service \
                    -Dsonar.sources=.
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Image Build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Tag Docker Image') {
            steps {
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Docker Login Harbor') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'harbor-cred',
                    usernameVariable: 'admin',
                    passwordVariable: 'Harbor@123'
                )]) {
                    sh "docker login ${HARBOR_URL} -u $HARBOR_USER -p $HARBOR_PASS"
                }
            }
        }

        stage('Push To Harbor') {
            steps {
                sh "docker push ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }
    }

    post {
        always {
            sh """
            echo "Cleaning old images of ${IMAGE_NAME}..."
            docker images ${IMAGE_NAME} --format '{{.Tag}}' | grep -v "${IMAGE_TAG}" | while read tag; do
                echo "Removing ${IMAGE_NAME}:\$tag"
                docker rmi ${IMAGE_NAME}:\$tag || true
            done
            """
        }
    }
} 
