pipeline {
    agent any

    environment {
        SONARQUBE  = "sonar-local"
        IMAGE_NAME = "course-service"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        HARBOR_URL = "harbor-node1.com"
        PROJECT    = "courseserviceproject"
        KUBE_NAMESPACE      = "course-service"
        HELM_RELEASE        = "course-service"
        HELM_CHART_PATH     = "./helm/course-service"
        KUBE_CONFIG_CRED    = "kubeconfig-cred"          
        MONITORING_NAMESPACE = "monitoring"
        GRAFANA_DASHBOARD_DIR = "./grafana/dashboards"
    }

    stages {


        // 1. SOURCE

        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'git-cred-akjus',
                    url: 'https://github.com/Kameshjustin/courseservice.git'
            }
        }


        // 2. CODE QUALITY

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


        // 3. BUILD & PUSH IMAGE

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

        stage('Login and Push to Harbor') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'harbor-credd',
                        passwordVariable: 'HARBOR_PASSWORD',
                        usernameVariable: 'HARBOR_USERNAME'
                    )
                ]) {
                    sh '''
                        echo "${HARBOR_PASSWORD}" | docker login ${HARBOR_URL} \
                            -u "${HARBOR_USERNAME}" --password-stdin

                        docker push ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
                    '''
                }
            }
        }


        // 4. KUBERNETES – NAMESPACE & MONITORING SETUP

        stage('K8s – Prepare Namespaces') {
            steps {
                withCredentials([file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG')]) {
                    sh '''
                        # App namespace
                        kubectl get namespace ${KUBE_NAMESPACE} 2>/dev/null || \
                            kubectl create namespace ${KUBE_NAMESPACE}

                        # Monitoring namespace for Prometheus + Grafana
                        kubectl get namespace ${MONITORING_NAMESPACE} 2>/dev/null || \
                            kubectl create namespace ${MONITORING_NAMESPACE}
                    '''
                }
            }
        }


        // 5. PROMETHEUS & GRAFANA (kube-prometheus-stack)

        stage('Deploy Prometheus & Grafana') {
            steps {
                withCredentials([file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG')]) {
                    sh '''
                        # Add / update Prometheus community Helm repo
                        helm repo add prometheus-community \
                            https://prometheus-community.github.io/helm-charts 2>/dev/null || true
                        helm repo update

                        # Install or upgrade kube-prometheus-stack
                        helm upgrade --install kube-prometheus-stack \
                            prometheus-community/kube-prometheus-stack \
                            --namespace ${MONITORING_NAMESPACE} \
                            --create-namespace \
                            --values ./helm/monitoring/prometheus-values.yaml \
                            --wait \
                            --timeout 10m

                        echo "Prometheus & Grafana deployed in ${MONITORING_NAMESPACE}"
                    '''
                }
            }
        }


        // 6. DEPLOY APPLICATION VIA HELM

        stage('Helm Deploy – course-service') {
            steps {
                withCredentials([
                    file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG'),
                    usernamePassword(
                        credentialsId: 'harbor-credd',
                        passwordVariable: 'HARBOR_PASSWORD',
                        usernameVariable: 'HARBOR_USERNAME'
                    )
                ]) {
                    sh '''
                        # Create / update Harbor image-pull secret
                        kubectl create secret docker-registry harbor-pull-secret \
                            --docker-server=${HARBOR_URL} \
                            --docker-username=${HARBOR_USERNAME} \
                            --docker-password=${HARBOR_PASSWORD} \
                            --namespace ${KUBE_NAMESPACE} \
                            --dry-run=client -o yaml | kubectl apply -f -

                        # Helm upgrade / install
                        helm upgrade --install ${HELM_RELEASE} ${HELM_CHART_PATH} \
                            --namespace ${KUBE_NAMESPACE} \
                            --create-namespace \
                            --set image.repository=${HARBOR_URL}/${PROJECT}/${IMAGE_NAME} \
                            --set image.tag=${IMAGE_TAG} \
                            --set imagePullSecrets[0].name=harbor-pull-secret \
                            --set serviceMonitor.enabled=true \
                            --set serviceMonitor.namespace=${MONITORING_NAMESPACE} \
                            --wait \
                            --timeout 5m

                        echo "Helm release ${HELM_RELEASE} deployed – image tag: ${IMAGE_TAG}"
                    '''
                }
            }
        }


        // 7. VERIFY ROLLOUT

        stage('Verify Deployment') {
            steps {
                withCredentials([file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG')]) {
                    sh '''
                        echo "Rollout status"
                        kubectl rollout status deployment/${HELM_RELEASE} \
                            --namespace ${KUBE_NAMESPACE} \
                            --timeout=3m

                        echo "Running pods"
                        kubectl get pods -n ${KUBE_NAMESPACE} -l app.kubernetes.io/name=course-service

                        echo "Service"
                        kubectl get svc  -n ${KUBE_NAMESPACE}
                    '''
                }
            }
        }


        // 8. APPLY GRAFANA DASHBOARD

        stage('Apply Grafana Dashboard') {
            steps {
                withCredentials([file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG')]) {
                    sh '''
                        # Apply ConfigMap-based dashboard for auto-import by Grafana sidecar
                        kubectl apply -f ${GRAFANA_DASHBOARD_DIR}/course-service-dashboard-configmap.yaml \
                            --namespace ${MONITORING_NAMESPACE}

                        echo "Grafana dashboard ConfigMap applied."
                    '''
                }
            }
        }

    } // end stages


    // POST

    post {

        success {
            echo """
              Pipeline SUCCESS
            Image   : ${HARBOR_URL}/${PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
            Release : ${HELM_RELEASE}  →  namespace: ${KUBE_NAMESPACE}
            Monitor : Prometheus & Grafana in namespace: ${MONITORING_NAMESPACE}
            """
        }

        failure {
            echo " Pipeline FAILED — check logs above"
        }

        always {
            withCredentials([file(credentialsId: "${KUBE_CONFIG_CRED}", variable: 'KUBECONFIG')]) {
                sh """
                    echo "Cleaning old local Docker images of ${IMAGE_NAME}"

                    docker images ${IMAGE_NAME} --format '{{.Tag}}' | grep -v '${IMAGE_TAG}' | while read tag; do
                        echo "Removing ${IMAGE_NAME}:\$tag"
                        docker rmi ${IMAGE_NAME}:\$tag || true
                    done

                    docker logout ${HARBOR_URL} || true

                    echo "Pod events (last 10 lines)"
                    kubectl get events -n ${KUBE_NAMESPACE} \
                        --sort-by='.lastTimestamp' 2>/dev/null | tail -10 || true
                """
            }
        }
    }
}
