
const traversal = require('tosca.lib.traversal');
const tosca = require('tosca.lib.utils');

traversal.coerce();

let bpmn = puccini.newXMLDocument();

bpmn.createProcInst('xml', 'version="1.0" encoding="UTF-8"');

let definitions = bpmn.createElement('bpmn:definitions');
definitions.createAttr('xmlns:bpmn', 'http://www.omg.org/spec/BPMN/20100524/MODEL');
definitions.createAttr('xmlns:bpmndi', 'http://www.omg.org/spec/BPMN/20100524/DI');
definitions.createAttr('xmlns:dc', 'http://www.omg.org/spec/DD/20100524/DC');
definitions.createAttr('xmlns:camunda', 'http://camunda.org/schema/1.0/bpmn');
definitions.createAttr('xmlns:di', 'http://www.omg.org/spec/DD/20100524/DI');
definitions.createAttr('xmlns:modeler', 'http://camunda.org/schema/modeler/1.0');
definitions.createAttr('id', 'definitions');
definitions.createAttr('targetNamespace', 'http://bpmn.io/schema/bpmn');
definitions.createAttr('exporter', 'Camunda Modeler');
definitions.createAttr('exporterVersion', '4.12.0');
definitions.createAttr('modeler:executionPlatform', 'Camunda Platform');
definitions.createAttr('modeler:executionPlatformVersion', '7.15.0');
//definitions.createAttr('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
//definitions.createAttr('xsi:schemaLocation', 'http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd');





for (let id in clout.vertexes) {
	let vertex = clout.vertexes[id];

	if (tosca.isTosca(vertex, 'Policy') && ('bpmn::Process' in vertex.properties.types))
		createPolicyProcess(id, vertex);

	if (tosca.isTosca(vertex, 'Workflow'))
		createWorkflowProcess(id, vertex);
}

puccini.write(bpmn);

function createPolicyProcess(id, vertex) {
	let policy = vertex.properties;

	let process = createProcess(id, policy.name + ' policy');

	let tasks = [];
	for (let e = 0; e < vertex.edgesOut.length; e++) {
		let edge = vertex.edgesOut[e];
		if (!tosca.isTosca(edge, 'NodeTemplateTarget') && !tosca.isTosca(edge, 'GroupTarget'))
			continue;
		let target = edge.target.properties;

		// Iterate edges
		for (let ee = 0; ee < vertex.edgesOut.length; ee++) {
			edge = vertex.edgesOut[ee];
			if (tosca.isTosca(edge, 'PolicyTriggerOperation')) {
				task = createPolicyTriggerOperationTask(process, target, edge.target.properties);
				tasks.push(task);
			} else if (tosca.isTosca(edge, 'PolicyTriggerWorkflow')) {
				// TODO
			}
		}
	}

	let startGateway, startEvent, endGateway, endEvent, endTask;
	startGateway = startEvent = createEvent(process);
	endEvent = createEvent(process, true);

	let code = puccini.sprintf('\nstartProcess("%s");\n', policy.properties.bpmn_process_id);
	endGateway = endTask = createScriptTask(process, clout.newKey(), 'startProcess', code);
	createSequenceFlow(process, endTask, endEvent);

	if (tasks.length > 1) {
		startGateway = createGateway(process);
		endGateway = createGateway(process, true);
		createSequenceFlow(process, startEvent, startGateway);
		createSequenceFlow(process, endGateway, endTask);
	}

	for (let t = 0; t < tasks.length; t++) {
		let task = tasks[t];
		createSequenceFlow(process, startGateway, task);
		createSequenceFlow(process, task, endGateway);
	}
}

function createPolicyTriggerOperationTask(process, target, operation) {
	// TODO: handle inputs and dependencies
	let code = puccini.sprintf('\ncallOperation("%s", "%s");\n', target.name, operation.implementation);
	let task = createScriptTask(process, clout.newKey(), 'operation on ' + target.name, code);
	return task;
}

function createWorkflowProcess(id, vertex) {
	let workflow = vertex.properties;

	let process = createProcess(id, workflow.name + ' workflow');

	// Iterate steps
	let tasks = {};
	for (let e = 0; e < vertex.edgesOut.length; e++) {
		let edge = vertex.edgesOut[e];
		if (!tosca.isTosca(edge, 'WorkflowStep'))
			continue;

		let step = edge.target;
		let stepID = edge.targetID;

		createWorkflowTask(process, step, stepID, tasks);
	}

	// Link previous tasks in graph
	for (let name in tasks) {
		let task = tasks[name];
		for (let n in task.next) {
			let nextName = task.next[n];
			tasks[nextName].prev.push(name);
		}
	}

	// Count first tasks
	let first = 0;
	for (let name in tasks) {
		let task = tasks[name];
		if (task.prev.length === 0)
			first++;
	}

	// Count last tasks
	let last = 0;
	for (let name in tasks) {
		let task = tasks[name];
		if (task.next.length === 0)
			last++;
	}

	let startGateway, startEvent, endGateway, endEvent;
	startGateway = startEvent = createEvent(process);
	endGateway = endEvent = createEvent(process, true);

	if (first > 1) {
		startGateway = createGateway(process);
		createSequenceFlow(process, startEvent, startGateway);
	}

	if (last > 1) {
		endGateway = createGateway(process, true);
		createSequenceFlow(process, endGateway, endEvent);
	}

	// Incoming
	for (let name in tasks) {
		let task = tasks[name];
		if (task.prev.length === 0)
			createSequenceFlow(process, startGateway, task.task);
		else if (task.prev.length > 1)
			task.incoming = createGateway(process, true);
	}

	// Outgoing
	for (let name in tasks) {
		let task = tasks[name];
		if (task.next.length === 0)
			createSequenceFlow(process, task.task, endGateway);
		else if (task.next.length > 1)
			task.outgoing = createGateway(process);
	}

	// Link incoming to outgoing
	for (let name in tasks) {
		let task = tasks[name];

		if (getAttr(task.task, 'id') != getAttr(task.incoming, 'id'))
			createSequenceFlow(process, task.incoming, task.task);

		if (getAttr(task.task, 'id') != getAttr(task.outgoing, 'id'))
			createSequenceFlow(process, task.task, task.outgoing);

		for (let n = 0; n < task.next.length; n++) {
			let next = tasks[task.next[n]];
			createSequenceFlow(process, task.outgoing, next.incoming);
		}
	}
}

function createWorkflowTask(process, step, stepID, tasks) {
	let name = step.properties.name;

	let next = [];

	let code = ''

	// Iterate edges
	let activities = [];
	for (let ee =- 0; ee < step.edgesOut.length; ee++) {
		let edge = step.edgesOut[ee];
		if (tosca.isTosca(edge, 'NodeTemplateTarget'))
			code += puccini.sprintf('\nnodeTemplates.push("%s");', edge.target.properties.name);
		else if (tosca.isTosca(edge, 'GroupTarget'))
			code += puccini.sprintf('\ngroups.push("%s");', edge.target.properties.name);
		else if (tosca.isTosca(edge, 'WorkflowActivity')) {
			// Put activities in the right sequence
			let sequence = edge.properties.sequence;
			activities[sequence] = edge.target.properties;
		} else if (tosca.isTosca(edge, 'OnSuccess')) {
			next.push(edge.target.properties.name);
		} else if (tosca.isTosca(edge, 'OnFailure')) {
			next.push(edge.target.properties.name);
		}
	}

	// Iterate activities
	/*
	for (let a = 0; a < activities.length; a++) {
		let activity = activities[a];
		if (activity.setNodeState)
			code += puccini.sprintf('\nsetNodeState(nodeTemplates, groups, "%s");', activity.setNodeState);
		else if (activity.callOperation)
			code += puccini.sprintf('\ncallOperation(nodeTemplates, groups, "%s", "%s");', activity.callOperation.interface, activity.callOperation.operation);
	}*/
	
    code = ''
	
	
	let task = createScriptTask(process, stepID, name, code + '\n');
	
	tasks[name] = {
		task: task,
		incoming: task,
		outgoing: task,
		prev: [],
		next: next
	};
}

function createProcess(id, name) {
	let process = definitions.createElement('bpmn:process');
	process.createAttr('id', id);
	process.createAttr('name', name);
	process.createAttr('isExecutable', 'true');
	return process;
}

function createEvent(process, end) {
	let event = process.createElement(end ? 'bpmn:endEvent' : 'bpmn:startEvent');
	event.createAttr('id', clout.newKey());
	event.createAttr('name', end ? 'end' : 'start');
	if (end)
		event.createElement('bpmn:terminateEventDefinition');
	return event;
}

function createScriptTask(process, id, name, code) {
	let task = process.createElement('bpmn:serviceTask');

	task.createAttr('id', id);
	task.createAttr('name', name);
	//task.createAttr('scriptFormat', 'javascript');
	let script = task.createElement('bpmn:extensionElements');

	let connector = script.createElement('camunda:connector');
	let io = connector.createElement('camunda:inputOutput');
	let connectorId = connector.createElement('camunda:connectorId')
	connectorId.setText('http-connector')
	let inputParameterUrl = io.createElement('camunda:inputParameter');
	inputParameterUrl.createAttr('name','url');
	let op = name.split("-");
	let taskname = op[1];
	if(op[0] == 'create_task') inputParameterUrl.setText('http://127.0.0.1:5000/create_task?taskname='+taskname)
	if(op[0] == 'check_task')  inputParameterUrl.setText('http://127.0.0.1:5000/check_task?taskname='+taskname)
	if(op[0] == 'delete_task') inputParameterUrl.setText('http://127.0.0.1:5000/delete_task?taskname='+taskname)
	let inputParameterMethod = io.createElement('camunda:inputParameter');
	inputParameterMethod.createAttr('name','method');
	inputParameterMethod.setText('GET')
	
	//let inputParameterHeaders = io.createElement('camunda:inputParameter');
	//inputParameterHeaders.createAttr('name','headers');
	//let map = inputParameterHeaders.createElement('camunda:map');
	//let entryMap = map.createElement('camunda:entry');
   // entryMap.createAttr('key','Accept');
	//script.setText(code);
	return task;
}

function createGateway(process, converging) {
	let gw = process.createElement('bpmn:parallelGateway');
	gw.createAttr('id', clout.newKey());
	gw.createAttr('name', converging ? 'converge' : 'diverge');
	gw.createAttr('gatewayDirection', converging ? 'Converging' : 'Diverging');
	return gw;
}

function createSequenceFlow(process, source, target) {
	let flow = process.createElement('bpmn:sequenceFlow');
	flow.createAttr('id', clout.newKey());
	flow.createAttr('sourceRef', getAttr(source, 'id'));
	flow.createAttr('targetRef', getAttr(target, 'id'));
}

function getID(element) {
	return getAttr(element, 'id');
}

function getAttr(element, key) {
	let r = null;
	for (let a = 0; a < element.attr.length; a++) {
		let attr = element.attr[a];
		if (attr.key === key)
			r = attr.value;
	}
	return r;
}
