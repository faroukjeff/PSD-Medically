const { Client, logger, Variables } = require('camunda-external-task-client-js');
// configuration for the Client:
//  - 'baseUrl': url to the Process Engine
//  - 'logger': utility to automatically log important events
//  - 'asyncResponseTimeout': long polling timeout (then a new request will be issued)
const config = { baseUrl: 'http://localhost:8080/engine-rest', use: logger, asyncResponseTimeout: 10000 };

// create a Client instance with custom configuration
const client = new Client(config);

var RESTClient = require("node-rest-client").Client;
var restclient = new RESTClient();


  client.subscribe('part_request', async function({ task, taskService }) {
      console.log("Requesting parts to external supplier")
      const parts_list = task.variables.get("parts_list")
      const parts = parts_list.split(";")
      const req_json={}
      for(part in parts){
        const id = parts[part].split(":")[0]
        const qte = parts[part].split(":")[1]
        req_json[id] = {qte:parseInt(qte)}
    }

    const args = {
      data: req_json,
      headers: { "Content-Type": "application/json" },
    };
    restclient.post("http://localhost:3000/partsService",args,function (data, response) {
    console.log("Parts order data:")  
    console.log(data)
    })
    await taskService.complete(task) 
    
});

client.subscribe('certification', async function({ task, taskService }) {
  console.log("Requesting Certification")
  const type = task.variables.get("type-of-machine")
  const location = task.variables.get("location")
  const technician = task.variables.get("technician")

  const processVariables  = new Variables();
  const localVariables = new Variables();
  const args ={
    headers :{"Content-Type": "application/json"}
}

restclient.get(`http://localhost:3000/certifications?machine=${type}&location=${location},IT&technician=${technician}`,args,function(data,response){
    console.log(data) //raw response
    var result
    if(data.result === "Success"){
      result = true
    }else{
      result = false
    }

    console.log("certification process with id: " + data.id + " finished with status: " + data.result)
    processVariables.set("CertificationApproved",result)
    taskService.complete(task,processVariables,localVariables)
})


})

client.subscribe('delivery_init', async function({ task, taskService }) {
  console.log("Creating shipping ticket")
  const deliveryAddress = task.variables.get("deliveryAddress")
  const pickupAddress = task.variables.get("pickupAddress")
  const weight = task.variables.get("weight")
  const receiver = task.variables.get("receiver")

  const processVariables  = new Variables();
  const localVariables = new Variables();
  const args ={
    headers :{"Content-Type": "application/json"}
}
restclient.get(`http://localhost:3000/delivery?deliveryAddress=${deliveryAddress}&pickupAddress=${pickupAddress}&weight=${weight}&receiver=${receiver}`
                ,args,function(data,response){
    console.log("Shipping with id: " + data.id + " Created with shipping cost: " + data.price)
    processVariables.set("shipping_id",data.id)
    processVariables.set("shipping_price",data.price)
    taskService.complete(task,processVariables,localVariables)
})
})

client.subscribe('pickup', async function({ task, taskService }) {
  console.log("Scheduling Delivery pickup date")
  const shipping_id = task.variables.get("shipping_id")

  const processVariables  = new Variables();
  const localVariables = new Variables();
  const args ={
    headers :{"Content-Type": "application/json"}
}
restclient.get(`http://localhost:3000/delivery-pickup?id=${shipping_id}`
                ,args,function(data,response){
    console.log("Shipping with id: " + shipping_id + " will be picked up on: " + data.deliveryDate)              
    processVariables.set("deliveryDate",data.deliveryDate)
    taskService.complete(task,processVariables,localVariables)
})
})

client.subscribe('delivery_status', async function({ task, taskService }) {
  console.log("Checking Delivery Completion")
  const shipping_id = task.variables.get("shipping_id")

  const processVariables  = new Variables();
  const localVariables = new Variables();

  const args ={headers :{"Content-Type": "application/json"}}
  restclient.get(`http://localhost:3000/delivery-status?id=${shipping_id}`,args,function(data,response){

    console.log("Shipping with id: " + shipping_id + " has status: " + data.status)

    if(data.status === "Delivery Completed and Signed"){
      processVariables.set("ShippingDelivered",true)
    }else{
      processVariables.set("ShippingDelivered",false)
    }

    taskService.complete(task,processVariables,localVariables)               
    })

})