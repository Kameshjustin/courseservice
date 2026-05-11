
pipeline {
    agent any

    environment {
        SONARQUBE  = "sonar-local"
        IMAGE_NAME = "course-service"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        HARBOR_URL = "16.171.210.247"
        PROJECT    = "library"
    }

    stages {

        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'git-cred-akjus',
                    url: 'https://github.com/Kameshjustin/courseservice.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE}") {
                    sh '''
                        sonar-scanner \
                        -Dsonar.projectKey=course-service \
                        -Dsonar.projectName=course-service \
                        -Dsonar.projectVersion=1.0 \
                        -Dsonar.sources=. \
                        -Dsonar.exclusions=node_modules/,build/
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
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
                    usernameVariable: 'HARBOR_USER',  
                    passwordVariable: 'HARBOR_PASS'   
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
