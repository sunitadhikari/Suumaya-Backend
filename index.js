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

app.post("/login", async (req, res) => {
  const user = req.body;
  const loginQuery = `SELECT * FROM user where username = '${user.username}' AND password = '${user.password}'; `;
  const result = await promisedQuery(loginQuery);
  if (result) {
    res.status(200).send({ status: "Login Successfull" });
  } else res.status(401).send({ staus: "Incorrect username or password" });
});

app.post("/products/filter", async (req, res) => {
  const filter = req.body;
  const { pageNumber } = filter ?? 1;
  const { pageSize } = filter ?? 10;
  const offset = (pageNumber - 1) * pageSize;

  try {
    const countQuery = `SELECT COUNT(*) as total FROM products`;
    const countResults = await promisedQuery(countQuery);
    const productQuery = `SELECT p.*, GROUP_CONCAT(f.file_key) as images FROM products p 
    LEFT JOIN product_file pf
    ON p.id = pf.product_id
    LEFT JOIN file f
    ON f.id = pf.file_id
    GROUP BY p.id limit ${offset}, ${pageSize}`;
    const productResults = await promisedQuery(productQuery);

    res.status(200).send({
      status: "Product Fetched Successfull",
      totalElements: countResults[0].total,
      body: productResults,
    });
  } catch (error) {
    console.error("error ", error);
    res.status(500).send({ status: "Failed to get products" });
  }
});

app.post("/products", (req, res) => {
  const product = req.body;
  pool.query(
    `INSERT INTO products (name, details,size, price, category) VALUES ('${product.name}','${product.detail}' ,'${product.size}','${product.price}','${product.category}');`,
    function (error, results, fields) {
      // if (results?.length > 0) res.send({ status: "login_successfull" });
      // else res.send({ status: "login_failed" });

      if (error) {
        console.error("Error fetching products:", error);
        res.send("could not add product");
      } else {
        res.send({ status: "200 OK", message: "Product Added" });
      }
    }
  );
});
app.post("/orders/filter", async (req, res) => {
  const { username, pageNumber, pageSize } = req.body;
  const countQuery = `SELECT count(o.id) as total FROM orders o LEFT JOIN user u ON o.user_id = u.id WHERE u.username = '${username}'
`;
  try {
    const countResults = await promisedQuery(countQuery);
    const ordersQuery = `SELECT o.*, u.username as boughtBy  FROM orders o LEFT JOIN user u ON o.user_id = u.id WHERE u.username = '${username}'
  ORDER BY o.id desc
  LIMIT ${(pageNumber - 1) * pageSize} , ${pageSize} ; `;
    const orderResults = await promisedQuery(ordersQuery);
    res.status(200).send({
      status: "Orders Fetched Successfull",
      totalElements: countResults[0].total,
      body: orderResults,
    });
  } catch (error) {
    console.error("error ", error);
    res.status(500).send({ status: "Orders failed" });
  }
});
app.post("/return/filter", async (req, res) => {
  const { username, pageNumber, pageSize } = req.body;
  const countQuery = `SELECT count(r.id) as total FROM return r LEFT JOIN user u ON r.user_id = u.id WHERE u.username = '${username}'
  `;
  try {
    const countResults = await promisedQuery(countQuery);
    const returnQuery = `SELECT r.*, u.username as boughtBy  FROM return r LEFT JOIN user u ON r.user_id = u.id WHERE u.username = '${username}'
    ORDER BY r.id desc
    LIMIT ${(pageNumber - 1) * pageSize}, ${pageSize} ; `;
    const returnResults = await promisedQuery(returnQuery);
    res.status(200).send({
      status: "return fetched succusfully",
      totalElements: countResults[0].total,
      body: returnResults,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ status: "return failed" });
  }
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
function promisedQuery(query) {
  return new Promise((resolve, reject) => {
    pool.query(query, (error, results, fields) => {
      if (error) reject(error);
      else {
        resolve(results);
      }
    });
  });

  function failResponse(status, body) {}

  function successResponse(status, body) {}
}
