const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const partsMock = require("./db_mocks/partsService.json")
const deliveryMock = require("./db_mocks/delivery.json")
const bp = require("body-parser");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

//Delivery
function updateStatus(data,path){
    const json = JSON.stringify(data,null,2);
    fs.writeFile(path, json, (err) => {
        if (err) {
            throw err;
        }
        console.log("Shipping Updated");
    });
}
app.get('/delivery', async function (req, res) {
    function distanceRand(pickupAddress,deliveryAddress){
        return Math.max(10,Math.floor(Math.random() * 200))
    }
    const deliveryAddress = req.query.deliveryAddress
    const pickupAddress = req.query.pickupAddress
    const weight = parseFloat(req.query.weight)
    const receiver = req.query.receiver
    const id = uuidv4()
    distance = distanceRand(pickupAddress,deliveryAddress)
    var price
    if(weight <30){
        price = weight * 1.5 * (distance / 10)
    }else{
        price = weight * 2 * (distance / 10)
    }
    const resjson = {
        id:id,
        deliveryAddress:deliveryAddress,
        receiver:receiver,
        price : price,
        status : "Shipping Ticket Created"
    }
    deliveryMock.push(resjson)
    updateStatus(deliveryMock,"./db_mocks/delivery.json")
    res.json(resjson);
})

//Delivery Pickup
app.get('/delivery-pickup', async function (req, res) {
    const id = req.query.id
    const today = new Date()
    const deliveryDate = new Date();
    deliveryDate.setDate(today.getDate() + Math.max(1,Math.floor(Math.random() * 5)))
    const resjson = {
        id:id,
        deliveryDate : deliveryDate,
        status : "Shipping Ticket Created"
    }
    for(elem in deliveryMock){
        if(deliveryMock[elem].id === id){
            deliveryMock[elem].status = "Package Picked up by Shipping Company"
        }
    }
    updateStatus(deliveryMock,"./db_mocks/delivery.json")
    res.json(resjson);
})
//Delivery Status
app.get('/delivery-status', async function (req, res) {
    const id = req.query.id
    var resjson = {status:"Shipping Not Found"}
    for(elem in deliveryMock){
        if(deliveryMock[elem].id === id){
            if(deliveryMock[elem].status != "Delivery Completed and Signed"){
                const notRandom = ["Done","Done","Done","Done","Done","Done","Done","Done","Else","Else"];
                const idx = Math.floor(Math.random() * notRandom.length);
                if(notRandom[idx] === "Done"){
                    delivery_complete(id)
                    deliveryMock[elem].status = "Delivery Completed and Signed"
                }
            }
            resjson = {
                id : id,
                status : deliveryMock[elem].status
            }
        }
    }
    res.json(resjson)
})
//Delivery Done
function delivery_complete(id){
    const date = new Date()
    for(elem in deliveryMock){
        if(deliveryMock[elem].id === id){
            deliveryMock[elem].status = "Delivery Completed and Signed"
            deliveryMock[elem].date = date.toDateString()
        }
    }
    updateStatus(deliveryMock,"./db_mocks/delivery.json")
}
//certification
function certificationResult(typeofMachine,location,headtechnician) {
    var notRandom = ["Success","Success","Success","Success","Success","Success","Success","Success","Failed","Failed"];
    var idx = Math.floor(Math.random() * notRandom.length);
    return notRandom[idx];
  }

 app.get('/certifications', async function (req, res) {
     const typeofMachine = req.query.machine
     const location = req.query.location
     const headtechnician = req.query.technician
     const resjson = {
        id : uuidv4(),
        typeofMachine:typeofMachine,
        location:location,
        headtechnician:headtechnician,
        result:certificationResult(typeofMachine,location,headtechnician)
     }
     res.json(resjson);
   });

//Partservice
function updateAvailability(data,path){
    const json = JSON.stringify(data,null,2);
    fs.writeFile(path, json, (err) => {
        if (err) {
            throw err;
        }
        console.log("Parts DB Updated");
    });
}
app.post("/partsService", async function (req, res) {
    const body = req.body
    const today = new Date()
    const deliveryDate = new Date();
    deliveryDate.setDate(today.getDate() + Math.max(2,Math.floor(Math.random() * 15)))
    var resjson = {}
    for(part in body){
        if(partsMock[part].availability >= body[part].qte){
            partsMock[part].availability -= body[part].qte
            updateAvailability(partsMock,"./db_mocks/partsService.json")
            resjson[part] = {
                status:"Part Order Accepted",
                price: partsMock[part].price *body[part].qte,
                date : deliveryDate.toDateString()
            }
        }else{
            deliveryDate.setDate(deliveryDate.getDate() + Math.max(2,Math.floor(Math.random() * 10)))
            resjson[part] = {
                status:"Part not in stock,Delivery delayed",
                price: partsMock[part].price *body[part].qte,
                date : deliveryDate.toDateString()
            }
        }
    }
    res.json(resjson)
})



const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
// let express to use this
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, function () {
    console.log('Running on port: ' + port);
  });