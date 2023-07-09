import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql";

const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "sumaya-db",
});

app.use(
  cors({
    origin: "http://localhost:4200",
  })
);
app.post("/register", (req, res) => {
  const user = req.body;
  pool.query(
    `INSERT INTO user (username, password, email, phone, address, enabled) VALUES ( '${user.username}', '${user.password}', '${user.email}', '${user.phone}', '${user.address}', 'true');`,
    (error, results, fields) => {
      if (error) {
        console.error(error);
        res.send("could not save user");
      } else {
        res.send({ status: "200 Ok", message: "Added user" });
      }
    }
  );
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/login", (req, res) => {
  const user = req.body;
  pool.query(
    `SELECT * FROM user where username = '${user.username}' AND password = '${user.password}';  `,
    function (error, results, fields) {
      if (error) console.error(error);

      if (results?.length > 0) res.send({ status: "login_successfull" });
      else res.status(400).send({ status: "login_failed" });
    }
  );
});

app.post("/products", (req, res) => {
  const product = req.body;
  pool.query(
    `INSERT INTO products (name, details, price, category) VALUES ('${product.name}','${product.detail}','${product.price}','${product.category}');`,
    function (error, results, fields) {
      // if (results?.length > 0) res.send({ status: "login_successfull" });
      // else res.send({ status: "login_failed" });

      if (error) {
        console.error("Error fetching products:", error);
        res.send("could not add product");
      } else {
        res.send({ status: "200 OK", message: "Product Added" });
      }

      // Send the product list as JSON response
      res.json(results);
    }
  );
});

app.post("/feedback", (req, res) => {
  const feedback = req.body;
  pool.query(
    `INSERT INTO feedback (name, email, message, user_id ) VALUES ( '${feedback.name}', '${feedback.email}', '${feedback.message}', '${feedback.userId}');`,
    (error, results, fields) => {
      if (error) {
        res.send("could not give feedback");
      } else {
        res.send({ status: "200 OK", message: "Added feedback" });
      }
      res.json(results);
    }
  );
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
