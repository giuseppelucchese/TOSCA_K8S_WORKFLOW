# TOSCA_K8S_WORKFLOW
Master's Degree Thesis Project: Usage of the TOSCA Standard for data pipeline orchestration on kubernetes


this project uses modified dependencies of the Puccini / Turandot project

References: 

Puccini: https://github.com/tliron/puccini

Turandot: https://github.com/tliron/turandot


generate.js :  https://github.com/tliron/puccini/tree/main/examples/bpmn/profile/js

nodes.yaml and interfaces.yaml : https://github.com/tliron/turandot/tree/main/assets/tosca/profiles/kubernetes/1.0

Staring Steps:

1. Start Camunda Platform
2. Start Flask App 
3. Start Kubernetes cluster
4. Istantiate redis pod and service 
5. Generate BPMN_PLAN.bpmn
6. Parsing TOSCA TEMPLATE into k8s format
7. Upload BPMN into Camunda Platform
8. Start BPMN Plan
