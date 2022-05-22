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
