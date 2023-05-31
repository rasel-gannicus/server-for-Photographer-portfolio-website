
const express = require('express');
const app = express();
const port = 2300;
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ddq9cat.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const productCollection = client.db("Photographer_portfolio").collection('Product');
        const serviceCartCollection = client.db("Photographer_portfolio").collection('Service_cart');
        const productCartCollection = client.db("Photographer_portfolio").collection('Product_cart');

        // --- getting all products
        app.get('/product', async (req, res) => {
            const { amount } = req.query;
            // console.log(amount);
            const query = {};
            const cursor = productCollection.find(query);
            if (amount > 0) {
                const result = await cursor.limit(parseInt(amount)).toArray();
                res.send(result);
            } else {
                const result = await cursor.toArray();
                res.send(result);
            }
        })


        // --- getting product by catagory 
        app.post('/product/category/:category', async (req, res) => {
            const { category } = req.params;
            const { currentPage, size } = req.query;

            if (category !== 'all') {
                const query = { catagory: category };
                const cursor = productCollection.find(query);
                const result = await cursor.skip(parseInt(currentPage * size)).limit(parseInt(size)).toArray();
                const count = await productCollection.countDocuments(query);
                res.send({ count, result });
            } else {
                const query = {};
                const cursor = productCollection.find(query);
                const result = await cursor.skip(parseInt(currentPage * size)).limit(parseInt(size)).toArray();
                const count = await productCollection.estimatedDocumentCount();
                res.send({ count, result });
            }
        })



        // --- adding a service to cart
        app.put('/services/add', async (req, res) => {
            // console.log(req.body);
            const filter = { email: req.body.email, serviceId: req.body.serviceId };
            const options = { upsert: true };
            const update = { $set: req.body };
            const result = await serviceCartCollection.updateOne(filter, update, options);
            res.send(result);
        })

        // --- update a bookings when user confirms it
        app.patch('/services/update', async (req, res) => {
            const filter = { email: req.body.email, serviceId: req.body.serviceId };
            const update = {
                $set: {
                    status: req.body.status,
                    time: req.body.time,
                    date: req.body.date
                }
            }
            const result = await serviceCartCollection.updateOne(filter, update);
            res.send(result);
        })
        // --- getting service cart
        app.get('/cart/services/:email', async (req, res) => {

            const query = { email: req.params.email };
            const cursor = serviceCartCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        // --- deleting a booking from cart
        app.delete('/cart/service/delete', async (req, res) => {
            const { id, email } = req.body;
            const query = { _id: new ObjectId(id) };
            const result = await serviceCartCollection.deleteOne(query);
            res.send(result);
        })

        // --- getting all confirmed cart
        app.get('/cart/confirmedOnly', async (req, res) => {
            const query = { status: 'confirmed' };
            const cursor = serviceCartCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
            // console.log(result);
        })

        /* ---------------------------------------------
                 Product Cart Related
        ------------------------------------------------ */
        // --- add a product to cart
        app.post('/cart/addProduct', async(req, res)=>{
            const{data} = req.body ; 
            const result = await productCartCollection.insertOne(data);
            res.send(result);
        })

        // --- getting all product cart info from database
        app.get('/cart/getAllProduct', async(req, res)=>{
            const query = {};
            const cursor = productCartCollection.find(query);
            const result = await cursor.toArray(); 
            res.send(result) ; 
        })

        // --- getting a single product info from cart
        app.get('/cart/singleProduct', async(req, res)=>{
            const filter = {email : req.query.email, 'product._id': req.query.id};
            const result = await productCartCollection.findOne(filter);
            res.send(result) ; 
        })

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello photographer');
})


app.listen(port, () => {
    console.log('Listening to port', port);
})