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
  if (result?.length > 0) {
    res.status(200).send({ status: "Login Successfull", user: result[0] });
  } else res.status(401).send({ staus: "Incorrect username or password" });
});

app.post("/products/filter", async (req, res) => {
  const filter = req.body;
  const { pageNumber } = filter ?? 1;
  const { pageSize } = filter ?? 10;
  const offset = (pageNumber - 1) * pageSize;
  const { category } = filter;

  try {
    let countQuery = `SELECT COUNT(*) as total FROM products p `;
    if (category)
      countQuery += `
    where p.category = '${category}' `;
    const countResults = await promisedQuery(countQuery);
    let productQuery = `SELECT p.* FROM products p `;
    if (category) productQuery += ` where p.category = '${category}' `;
    productQuery += ` ORDER BY p.created_date, p.updated_date DESC limit ${offset}, ${pageSize} `;
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
app.put("/products/:id", async (req, res) => {
  const id = req.params.id;

  const { name, price, details, size, category, days_for_rent, image } =
    req.body;
  const productQuery = `SELECT * FROM products where id = '${id}' `;
  const result = await promisedQuery(productQuery);
  if (result?.length > 0) {
    const productQuery = `Update products set name='${name}', price='${price}',details='${details}', size='${size}',category='${category}', days_for_rent='4', image='${image}'  where id = '${id}' `;
    const productUpdate = await promisedQuery(productQuery);
    if (productUpdate) {
      res.status(200).send({ message: "Product updated" });
    }
  } else {
    res.status(404).send({ message: "Product not found" });
  }
});
app.post("/products", (req, res) => {
  const product = req.body;
  pool.query(
    `INSERT INTO products (name, details,size, price, category, image) 
    VALUES ('${product.name}','${product.details}' ,'${product.size}','${product.price}','${product.category}' , 
    '${product.image}');`,
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
  let countQuery = `SELECT count(o.id) as total FROM orders o LEFT JOIN user u ON o.user_id = u.id 
  `;
  if (username)
    countQuery += `
   WHERE u.username = '${username}'
`;
  try {
    const countResults = await promisedQuery(countQuery);
    let ordersQuery = `SELECT o.*, u.username as boughtBy, u.address as address  FROM orders o JOIN user u ON o.user_id = u.id `;
    if (username)
      ordersQuery += `
   WHERE u.username = '${username}'
`;
    ordersQuery += `ORDER BY o.id desc LIMIT ${
      (pageNumber - 1) * pageSize
    } , ${pageSize} ; `;
    const orderResults = await promisedQuery(ordersQuery);
    res.status(200).send({
      status: "Order Fetched Successfull",
      totalElements: countResults[0].total,
      body: orderResults,
    });
  } catch (error) {
    console.error("error ", error);
    res.status(500).send({ status: "Orders failed" });
  }
});
app.post("/orders", (req, res) => {
  const product = req.body;

  pool.query(
    `INSERT INTO orders (price, size, user_id, product_id, quantity, transaction_id) VALUES ('${product.price}','${product.size}','${product.userId}','${product.productId}', '${product.quantity}', '${product.transactionId}');`,
    function (error, result, fields) {
      if (error) {
        console.error("Error in Ordering products:", error);
        res.status(500).send({ messge: "could not order product" });
      } else {
        res.send({ status: "200 ok", message: "Product ordered" });
      }
    }
  );
});
app.post("/return/filter", async (req, res) => {
  const { username, pageNumber, pageSize } = req.body;
  let countQuery = `
  SELECT COUNT(*) as total
  FROM order_return ore
  `;
  if (username)
    countQuery += ` JOIN orders o on o.id = ore.order_id JOIN user u on u.id = o.user_id WHERE u.username = '${username}'`;
  try {
    const countResults = await promisedQuery(countQuery);
    let returnQuery = `
    SELECT ore.id as returnId, ore.Date as returnedDate, 
    p.Name as productName, p.id as product_id, o.id as orderId, o.date as orderedDate, u.username as boughtBy, 
    Case 
    WHEN DateDIFF(ore.date, o.date) > p.days_for_rent THEN false
    ELSE true
    END as onTime
    FROM order_return ore
    JOIN ORDERS o on o.ID = ore.order_id
    JOIN PRODUCTS p on p.Id = o.product_id
    JOIN User u on u.id = o.user_id `;
    if (username)
      returnQuery += `
  WHERE u.username = '${username}'`;
    returnQuery += `
    ORDER BY ore.date desc
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
app.post("/feedback/filter", async (req, res) => {
  const { username, pageNumber, pageSize } = req.body;
  let countQuery = `SELECT count(*) as total FROM feedback f  `;
  if (username)
    countQuery += `
    JOIN user u on user_id = f.user_id  WHERE u.username = '${username}'`;
  try {
    const countResults = await promisedQuery(countQuery);
    let feedbackQuery = `SELECT f.id as id, f.date as date, u.username as name,  
    f.message as message
    FROM FEEDBACK f
       JOIN user u on u.id = f.user_id 
    `;
    if (username) feedbackQuery += ` WHERE u.username = '${username}'`;
    feedbackQuery += ` ORDER BY f.date desc LIMIT ${
      (pageNumber - 1) * pageSize
    }, ${pageSize};`;
    const feedbackResults = await promisedQuery(feedbackQuery);
    res.status(200).send({
      status: "Feedback Fetched Successfull",
      totalElements: countResults[0].total,
      body: feedbackResults,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ status: "Feedback failed" });
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
app.get("/products/:id", async (req, res) => {
  const productId = req.params["id"];
  try {
    const query = `SELECT * FROM PRODUCTS p where p.id = '${productId}'`;
    const productResults = await promisedQuery(query);
    res.send({ status: "ok", body: productResults[0] });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ status: "Feedback failed" });
  }
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
// clamped
