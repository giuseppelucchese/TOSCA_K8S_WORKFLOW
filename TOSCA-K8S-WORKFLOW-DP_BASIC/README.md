# TOSCA-K8S-WORKFLOW-DP
Master's Degree Thesis Project

- Execute the following command in order to parse the TOSCA service template into K8S format:

```
puccini-tosca compile ./Examples/example_workflow.yaml --exec=https://raw.githubusercontent.com/tliron/turandot/main/assets/tosca/profiles/kubernetes/1.0/js/resources/get.js --output=./Examples/workflow-k8s.yaml
```

- Execute the following command  to generate bpmn:

```
 puccini-tosca compile task_workflow.yaml | puccini-clout scriptlet exec bpmn.generate -o task_workflow.bpmn2
```
