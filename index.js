require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 2300;
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ddq9cat.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const productCollection = client
      .db("Photographer_portfolio")
      .collection("Product");
    const serviceCartCollection = client
      .db("Photographer_portfolio")
      .collection("Service_cart");
    const productCartCollection = client
      .db("Photographer_portfolio")
      .collection("Product_cart");

    // --- receive information from client side for jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "Jwt Token is not verified" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res
              .status(401)
              .send({ message: "Jwt Token is not verified" });
          }
          req.decoded = decoded;
          next();
        }
      );
    }

    // --- getting all products
    app.get("/product", async (req, res) => {
      const { amount } = req.query;
      const query = {};
      const cursor = productCollection.find(query);
      if (amount > 0) {
        const result = await cursor.limit(parseInt(amount)).toArray();
        res.send(result);
      } else {
        const result = await cursor.toArray();
        res.send(result);
      }
    });

    // --- getting single products
    app.get('/product/:productId', async(req, res) =>{
        const params = req.params ;
        const {productId} = params
        
        if(productId !== ''){
            const query = {_id: new ObjectId(productId)}
            const result = await productCollection.findOne(query);
            res.send(result);
        }
    })

    // --- getting product by catagory
    app.post("/product/category/:category", async (req, res) => {
      const { category } = req.params;
      const { currentPage, size } = req.query;

      if (category !== "all") {
        const query = { catagory: category };
        const cursor = productCollection.find(query);
        const result = await cursor
          .skip(parseInt(currentPage * size))
          .limit(parseInt(size))
          .toArray();
        const count = await productCollection.countDocuments(query);
        res.send({ count, result });
      } else {
        const query = {};
        const cursor = productCollection.find(query);
        const result = await cursor
          .skip(parseInt(currentPage * size))
          .limit(parseInt(size))
          .toArray();
        const count = await productCollection.estimatedDocumentCount();
        res.send({ count, result });
      }
    });

    // --- adding a service to cart
    app.put("/services/add", verifyJWT, async (req, res) => {
      const filter = { email: req.body.email, serviceId: req.body.serviceId };
      const options = { upsert: true };
      const update = { $set: req.body };
      const result = await serviceCartCollection.updateOne(
        filter,
        update,
        options
      );
      res.send(result);
    });

    // --- update a bookings when user confirms it
    app.patch("/services/update", verifyJWT, async (req, res) => {
      const filter = { email: req.body.email, serviceId: req.body.serviceId };
      const update = {
        $set: {
          status: req.body.status,
          time: req.body.time,
          date: req.body.date,
        },
      };
      const result = await serviceCartCollection.updateOne(filter, update);
      res.send(result);
    });
    // --- getting service cart
    app.get("/cart/services/:email", verifyJWT, async (req, res) => {
      const query = { email: req.params.email };
      const cursor = serviceCartCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // --- deleting a booking from cart
    app.delete("/cart/service/delete", verifyJWT, async (req, res) => {
      const { id, email } = req.body;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCartCollection.deleteOne(query);
      res.send(result);
    });

    // --- getting all confirmed cart
    app.get("/cart/confirmedOnly", async (req, res) => {
      const query = { status: "confirmed" };
      const cursor = serviceCartCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    /* ---------------------------------------------
                 Product Cart Related
        ------------------------------------------------ */
    // --- add a product to cart
    app.post("/cart/addProduct", verifyJWT, async (req, res) => {
      const { data } = req.body;
      const result = await productCartCollection.insertOne(data);
      res.send(result);
    });

    // --- getting all product cart info from database
    app.get("/cart/getAllProduct", async (req, res) => {
      const query = {};
      const cursor = productCartCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // --- getting a single product info from cart
    app.get("/cart/singleProduct", async (req, res) => {
      const filter = { email: req.query.email, "product._id": req.query.id };
      const result = await productCartCollection.findOne(filter);
      res.send(result);
    });

    // --- Getting all the cart product for individual user
    app.get("/cart/user/:email", verifyJWT, async (req, res) => {
      const { email } = req.params;
      const filter = { email: email };
      const cursor = productCartCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // --- delete a product for a user
    app.delete("/cart/user/delete", verifyJWT, async (req, res) => {
      const filter = {
        email: req.query.email,
        _id: new ObjectId(req.query.id),
      };
      const result = await productCartCollection.deleteOne(filter);
      res.send(result);
    });
    // --- update cart
    app.patch("/cart/update", async (req, res) => {
      const { quantity, pricePerUnit, email, id } = req.body;
      const filter = { email: req.body.email, _id: new ObjectId(req.body.id) };
      const subTotal = pricePerUnit * quantity;
      const update = {
        $set: {
          quantity: req.body.quantity,
          pricePerUnit: req.body.pricePerUnit,
          subTotal: subTotal,
        },
      };
      const result = await productCartCollection.updateOne(filter, update);
      res.send(result);
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello photographer");
});

// Enable CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
