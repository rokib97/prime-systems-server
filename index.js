const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// root
app.get("/", async (req, res) => {
  res.send("Hello from Prime Systems");
});

// port
app.listen(port, () => {
  console.log(`Prime Systemsserver is running from port ${port} `);
});
