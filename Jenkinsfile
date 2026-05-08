pipeline {
    agent any
 
    environment {
        SCANNER_HOME = tool 'sonar-scanner'
        IMAGE_NAME = "my-app"
        IMAGE_TAG = "${BUILD_NUMBER}"
        HARBOR_URL = "192.168.1.44"
        PROJECT    = "library"
 
    }
 
    stages {
 
        stage('Git checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'git-cred',
                    url: 'https://github.com/peakyblinder0509/crm-backend-gatewayservice.git'
            }
        }
 
        stage('Sonar Scan') {
            steps {
                withSonarQubeEnv('sonar') {
                    sh """
                    ${SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.projectKey=gatewayservice \
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
                dir('gatewayservice') {
                    sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                }
            }
        }
        stage('Tag Docker Image') {
            steps {
                sh """
                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
     
                    """
                   }
                 }
        stage('Docker Login Harbor') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'harbor-creds',
                    usernameVariable: 'HARBOR_USER',
                    passwordVariable: 'HARBOR_PASS'
                )]) {
 
                    sh '''
                    docker login $HARBOR_URL \
                    -u $HARBOR_USER \
                    -p $HARBOR_PASS
                    '''
                }
            }
        }
 
        stage('Push To Harbor') {
            steps {
                sh 'docker push ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}'
            }
        }     
    }
 
    post {
        always {
            sh '''
            echo "Removing only old images of my-app..."
            docker images my-app --format "{{.Tag}}" | grep -v "${BUILD_NUMBER}" | while read tag; do
                echo "Removing my-app:$tag"
                docker rmi my-app:$tag || true
            done
            '''
        }
    }
}
