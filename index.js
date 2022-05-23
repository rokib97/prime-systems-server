const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pvdtz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();

    const partsCollection = client.db("PrimeSystems").collection("parts");
    const purchaseCollection = client.db("PrimeSystems").collection("purchase");
    const usersCollection = client.db("PrimeSystems").collection("user");

    // get all parts items api
    app.get("/get-parts", async (req, res) => {
      const parts = await partsCollection.find({}).toArray();
      res.send(parts);
    });

    // get single items api
    app.get("/get-parts/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });

    // update quantity api
    app.put("/get-parts/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          availQuantity: data.availQuantity,
        },
      };
      const result = await partsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // order parts api
    app.post("/add-parts", async (req, res) => {
      const data = req.body;
      const result = await purchaseCollection.insertOne(data);
      res.send(result);
    });

    // get purchase / order api
    app.get("/get-purchase", async (req, res) => {
      const { userEmail } = req.query;
      const query = { userEmail: userEmail };
      const orders = await purchaseCollection.find(query).toArray();
      res.send(orders);
    });

    // user info api
    app.put("/user/:email", async (req, res) => {
      const { email } = req.params;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    console.log("db connected");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
// root
app.get("/", async (req, res) => {
  res.send("Hello from Prime Systems");
});

// port
app.listen(port, () => {
  console.log(`Prime Systemsserver is running from port ${port} `);
});
