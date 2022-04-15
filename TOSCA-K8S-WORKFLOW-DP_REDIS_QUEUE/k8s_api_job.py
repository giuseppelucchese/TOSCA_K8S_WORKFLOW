from flask import Flask,request,abort
from os import path
from time import sleep
import yaml
import json
import time

from kubernetes import client, config



app = Flask(__name__)

def get_template_spec(taskname):
    
    with open('workflow_k8s.yaml','r') as yaml_in, open("workflow_k8s.json","w") as json_out:
        yaml_object = list(yaml.safe_load_all(yaml_in))
        json.dump(yaml_object,json_out)

    wf_json = open("workflow_k8s.json")

    workflow = json.load(wf_json)
    taskname_idx = 0
    app_name= taskname.split("-")
    for i in range(0,len(workflow)):
        if workflow[i]['metadata']['labels']['app'] == "task-"+app_name[0]:
           taskname_idx = i

    image = workflow[taskname_idx]['spec']['template']['spec']['containers'][0]['image']
    command = workflow[taskname_idx]['spec']['template']['spec']['containers'][0]['command']

    return image,command


def create_job_object(taskname):
    # Configureate Pod template container
    image,command = get_template_spec(taskname)
    container = client.V1Container(
        name=taskname,
        image=image,
        command=command)
    # Create and configure a spec section
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"app": taskname}),
        spec=client.V1PodSpec(restart_policy="Never", containers=[container]))
    # Create the specification of deployment
    spec = client.V1JobSpec(
        template=template,
        backoff_limit=4)
    # Instantiate the job object
    job = client.V1Job(
        api_version="batch/v1",
        kind="Job",
        metadata=client.V1ObjectMeta(name=taskname),
        spec=spec)

    return job


def create_job(api_instance, job):
    config.load_kube_config()
    api_response = api_instance.create_namespaced_job(
        body=job,
        namespace="default")
 


def get_job_status(api_instance,taskname):
    job_completed = False
  
    api_response = api_instance.read_namespaced_job_status(
        name=taskname,
        namespace="default")
    if api_response.status.succeeded is not None or \
        api_response.status.failed is not None:
        job_completed = True
	
    return job_completed




def delete_job(api_instance,taskname):
    config.load_kube_config()
    api_response = api_instance.delete_namespaced_job(
        name=taskname,
        namespace="default",
        body=client.V1DeleteOptions(
            propagation_policy='Foreground',
            grace_period_seconds=5))
    print("Job deleted. status='%s'" % str(api_response.status))


#/create_task?jobname=nome_del_job

@app.route('/create_task', methods=['GET'])
def create_task():
    
    taskname = request.args.get('taskname')
    print(taskname)
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()
    job = create_job_object(taskname)
    create_job(batch_v1, job)
    return "<p>Create Succefully!</p>"


@app.route('/check_task', methods=['GET'])
def check_task():
    config.load_kube_config()
    taskname = request.args.get('taskname')
    batch_v1 = client.BatchV1Api()
    job_status = get_job_status(batch_v1,taskname)
    
    while(job_status != True):
    	time.sleep(3)
    	job_status = get_job_status(batch_v1,taskname)
    return "<p>Completed!</p>"
    


@app.route('/delete_task', methods=['GET'])
def delete_task():
    config.load_kube_config()
    taskname = request.args.get('taskname')
    batch_v1 = client.BatchV1Api()
    delete_job(batch_v1,taskname)
    return "<p>Task deleted! </p>"


