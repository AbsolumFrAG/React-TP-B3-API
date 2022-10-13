const express = require("express");
const cors = require("cors");

//Database
require("./db/config");
const User = require("./db/User");
const Product = require("./db/Product");

const jwt = require("jsonwebtoken");
// jwtkey devrait être privée
const jwtkey =
  "aU+fq8DhQ0awAK0xfDE09FV/0TBoc53f0q++B209lhYM7JMT3IEr6b2+OVMLqLqIxN7NoWExe8oj1tSTVOc8Qxavh8F2kFNvb3ScIAqoHdL0KTwasvKB/+kb5ofOqcYSq9XUjiK7EmmiBkjHjADosgPjMrFO4aCDRXpUb6qNZkMzukpFKNX403vZDOwGudXbY36Rri8VHJa2xA02XGlcEbLmo9aQZSdaos1dpB5NWPqEqkTyWj0kDPP1eOc5gyInsclngCuGJfYf0YwW/SlYh7hseGB8JUK6saMTQ466kBUrUKpmx5p2fO5W9FJoBtCleWlvFnsEwNHorM++EeJpRg==";

//Create express App
const app = express();
app.use(express.json());
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));

//Routes
app.post("/register", async (req, resp) => {
  let user = new User(req.body);
  result = await user.save();
  result = result.toObject();
  delete result.password;
  jwt.sign({ result }, jwtkey, { expiresIn: "2h" }, (err, token) => {
    if (err) {
      resp.send({ result: "Oops!! something went wrong..." });
    } else {
      resp.send({ user: result, auth: token });
    }
  });
});

app.post("/login", async (req, resp) => {
  if (req.body.password && req.body.email) {
    let user = await User.findOne(req.body).select("-password");
    if (user) {
      jwt.sign({ user }, jwtkey, { expiresIn: "2h" }, (err, token) => {
        if (err) {
          resp.send({ result: "Oups !! Quelque chose s'est mal passé..." });
        } else {
          resp.send({ user, auth: token });
        }
      });
    } else {
      resp.send({ result: "Aucun utilisateur trouvé" });
    }
  } else {
    resp.send({ result: "Aucun utilisateur trouvé" });
  }
});

app.post("/add-product", verifyToken, async (req, resp) => {
  let product = new Product(req.body);
  let result = await product.save();
  resp.send(JSON.stringify(result));
});

app.get("/products", verifyToken, async (req, resp) => {
  let products = await Product.find();
  if (products.length > 0) {
    resp.send(products);
  } else {
    resp.send({ results: "Aucun produit trouvé" });
  }
});

app.delete("/product/:id", verifyToken, async (req, resp) => {
  const result = await Product.deleteOne({ _id: req.params.id });
  resp.send(result);
});

app.get("/product/:id", verifyToken, async (req, resp) => {
  let result = await Product.findOne({ _id: req.params.id });
  if (result) {
    resp.send(result);
  } else {
    resp.send({ result: "Aucun produit trouvé" });
  }
});

app.put("/update/:id", verifyToken, async (req, resp) => {
  let result = await Product.updateOne(
    { _id: req.params.id },
    { $set: req.body }
  );

  resp.send(result);
});

app.get("/search/:key", verifyToken, async (req, resp) => {
  let results = await Product.find({
    $or: [
      { name: { $regex: req.params.key } },
      { company: { $regex: req.params.key } },
      { category: { $regex: req.params.key } },
    ],
  });

  resp.send(results);
});

app.put("/update-profile/:id", verifyToken, async (req, resp) => {
  let result = await User.updateOne({ _id: req.params.id }, { $set: req.body });
  resp.send(result);
});

function verifyToken(req, resp, next) {
  let token = req.headers["authorization"];
  if (token) {
    // incoming token format = "bearer tokenstring"
    // spliting will give us array containing bearer and token string
    token = token.split(" ")[1];
    jwt.verify(token, jwtkey, (err, valid) => {
      if (err) {
        resp.status(401).send({
          result: `Veuillez fournir un token valide`,
        });
      } else {
        //move it to next call
        next();
      }
    });
  } else {
    resp.status(404).send({ result: "Aucun token trouvé" });
  }
}

app.listen(5000);

module.exports = app;