
const express = require('express');
const app = express();
const port = process.env.PORT || 2300;
const cors = require('cors');
const { MongoClient } = require('mongodb');

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

        // --- getting all products
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
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