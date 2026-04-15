pipeline {
    agent any

    environment {
        REPO_URL = 'https://github.com/projectemern/Course-service.git'
        IMAGE_NAME = 'course-service'
        CONTAINER_NAME = 'course-service'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out source code from private GitHub repo...'
                // Use Jenkins credentials (create one ID: github_credentials)
                git branch: 'main',
                    url: "${REPO_URL}",
                    credentialsId: 'github_credentials'
            }
        }

        stage('Clean Old Containers & Images') {
            steps {
                script {
                    echo 'Cleaning old Docker containers and images...'
                    sh '''
                    docker rm -f ${CONTAINER_NAME} || true
                    docker image rm ${IMAGE_NAME}:latest || true
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building Docker image for Course Service...'
                    sh 'docker build -t ${IMAGE_NAME}:latest .'
                }
            }
        }

        stage('Run with Docker Compose') {
            steps {
                script {
                    echo 'Starting Course Service and dependencies using docker-compose...'
                    sh 'docker-compose down || true'
                    sh 'docker-compose up -d --build'
                }
            }
        }

        stage('Verify Running Container') {
            steps {
                script {
                    echo ' Checking running container status...'
                    sh 'docker ps | grep ${CONTAINER_NAME} || true'
                }
            }
        }
    }

    post {
        success {
            echo 'Course Service deployed successfully via Jenkins!'
        }
        failure {
            echo 'Jenkins pipeline failed. Please check logs.'
        }
    }
}
