const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

// connecting to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pvdtz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// verify JWT
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};
async function run() {
  try {
    await client.connect();

    const partsCollection = client.db("PrimeSystems").collection("parts");
    const purchaseCollection = client.db("PrimeSystems").collection("purchase");
    const usersCollection = client.db("PrimeSystems").collection("user");
    const paymentCollection = client.db("PrimeSystems").collection("payments");
    const reviewCollection = client.db("PrimeSystems").collection("review");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    };

    // get all review
    app.get("/get-review", async (req, res) => {
      const reviews = await reviewCollection.find({}).toArray();
      const latestReview = reviews.reverse();
      res.send(latestReview);
    });
    // post a review
    app.post("/add-review", async (req, res) => {
      const data = req.body;
      const result = await reviewCollection.insertOne(data);
      res.send(result);
    });

    // get all parts items api
    app.get("/get-parts", async (req, res) => {
      const result = await partsCollection.find({}).toArray();
      const parts = result.reverse();
      res.send(parts);
    });

    // get all parts admin api
    app.get("/get-adminparts", async (req, res) => {
      const result = await partsCollection.find({}).toArray();
      res.send(result);
    });

    // add a product
    app.post("/add-parts", verifyJWT, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await partsCollection.insertOne(data);
      res.send(result);
    });

    // get single items api
    app.get("/get-parts/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });

    // update quantity api
    app.put("/update-parts/:id", async (req, res) => {
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

    // delete single parts api
    app.delete("/delete-parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(query);
      res.send(result);
    });

    // order purchase api
    app.post("/add-purchase", async (req, res) => {
      const data = req.body;
      const result = await purchaseCollection.insertOne(data);
      res.send(result);
    });

    // get purchase / order api
    app.get("/get-purchase", verifyJWT, async (req, res) => {
      const { userEmail } = req.query;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const orders = await purchaseCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // get all order purchse for admin api
    app.get("/get-allpurchase", async (req, res) => {
      const result = await purchaseCollection.find({}).toArray();
      res.send(result);
    });

    // get specific purchase by id
    app.get("/get-purchase/:id", verifyJWT, async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.findOne(query);
      res.send(result);
    });

    // update purchse api
    app.patch("/update-purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await purchaseCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updatedOrder);
    });

    // update pending status admin api
    app.patch("/update-purchase-status/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          shipping: true,
        },
      };
      const updatedOrder = await purchaseCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updatedOrder);
    });

    // delete single purchase api
    app.delete("/delete-purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    // update user info api
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
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    //get user by email
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const { email } = req.params;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    // set admin role
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const { email } = req.params;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get all users in dashboard
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // admin or not Api
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    // api for stripe payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { totalPrice } = req.body;
      const amount = totalPrice * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
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
