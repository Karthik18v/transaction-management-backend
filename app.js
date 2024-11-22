const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "app.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
let db = null;

const initializeDbAndServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () =>
    console.log(`Server Running At http://localhost:3000`)
  );
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "INFINITE", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.userId = payload.userId;
        next();
      }
    });
  }
};

app.get("/transactions", authenticateToken, async (request, response) => {
  const { userId } = request;
  try {
    const getQuery = `SELECT
  *
  FROM
  transactions
  WHERE user_id = ${userId}
  ORDER BY
  id`;
    const dbResponse = await db.all(getQuery);
    response.send(dbResponse);
  } catch (error) {
    response.send(error.message);
  }
});

app.get("/transactions/:id", async (request, response) => {
  const { id } = request.params;
  try {
    const getQuery = `SELECT
  *
  FROM
  transactions
  WHERE id = ${id}`;
    const dbResponse = await db.get(getQuery);
    response.send(dbResponse);
  } catch (error) {
    response.send(error.message);
  }
});

app.get("/testing", async (request, response) => {
  response.send("Hello");
});

app.post("/transactions", authenticateToken, async (request, response) => {
  const { amount, transactionType, status } = request.body;
  const { userId } = request;
  try {
    const insertQuery = `INSERT INTO transactions(amount,transaction_type, user_id, status)
        VALUES(
            '${amount}',
            '${transactionType}',
            '${userId}',
            '${status}'
        )`;
    const dbResponse = await db.run(insertQuery);
    const id = dbResponse.lastID;
    response.send(`Transaction Added with id : ${id}`);
  } catch (error) {
    response.send(error.message);
  }
});

app.put("/transactions/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const { amount, transactionType, status } = request.body;
  try {
    if (amount !== undefined) {
      await db.run(`UPDATE transactions SET amount = ${amount} WHERE id=${id}`);
    }
    if (transactionType !== undefined) {
      await db.run(
        `UPDATE transactions SET transaction_type = '${transactionType}' WHERE id=${id}`
      );
    }
    if (status !== undefined) {
      await db.run(
        `UPDATE transactions SET status = '${status}' WHERE id=${id}`
      );
    }
    response
      .status(200)
      .json({ message: "Successfully Modified Transaction Details" });
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.delete(
  "/transactions/:id",
  authenticateToken,
  async (request, response) => {
    const { id } = request.params;
    console.log(id);
    try {
      const deleteQuery = `DELETE  FROM transactions WHERE id = ${id}`;
      await db.run(deleteQuery);
      response
        .status(200)
        .json({ message: "Successfully Removed Transaction" });
    } catch (error) {
      response.status(400).json({ message: error.message });
    }
  }
);

app.post("/register", async (request, response) => {
  const { name, email, password } = request.body;
  const selectUser = `SELECT * FROM auth_user WHERE email = '${email}'`;
  const hashedPassword = await bcrypt.hash(password, 10);
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    const insertQuery = `INSERT INTO auth_user(name,email,password) VALUES(
          '${name}',
          '${email}',
          '${hashedPassword}'
      )`;
    const dbResponse = await db.run(insertQuery);
    const userId = dbResponse.lastID;
    response.status(201).json({ message: "User Registered Successfully" });
  } else {
    response.status(400).json({ message: "User Already Exists" });
  }
});

app.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const selectUser = `SELECT * FROM auth_user WHERE email='${email}'`;
  const dbUser = await db.get(selectUser);
  if (dbUser) {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = {
        userId: dbUser.id,
      };
      const jwtToken = await jwt.sign(payload, "INFINITE");
      response.status(200).json({ jwtToken });
    } else {
      response.status(400).json({ message: "Invalid Password" });
    }
  } else {
    response.status(400).json({ message: "Invalid User" });
  }
  try {
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.get("/users/", async (request, response) => {
  try {
    const getQuery = `SELECT
  *
  FROM
  auth_user
  ORDER BY
  id`;
    const dbResponse = await db.all(getQuery);
    response.send(dbResponse);
  } catch (error) {
    response.send(error.message);
  }
});

initializeDbAndServer();
