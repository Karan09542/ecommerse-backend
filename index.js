const app = require("./app");
const { connect, default: mongoose } = require("mongoose");
const { PORT, IS_SECURE } = require("./config/config");

const protocol = IS_SECURE ? "https" : "http";
const host = IS_SECURE ? "dot.com" : "localhost";

const DB_URL = `${process.env.DB_URL.replace(
  "<password>",
  process.env.DB_PASSWORD
)}/ecommerce`;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  reconnectTries: 5,
  reconnectInterval: 5000,
};

let mahadevDB = connect(DB_URL).then(() => {
  console.log(`the db is running on ${mongoose.connection.host}`);
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("Connection error:", err);
});

db.on("disconnected", () => {
  console.log("Mongoose disconnected due to no internet. Retrying...");
});

db.on("reconnected", () => {
  console.log("Mongoose successfully reconnected!");
});

app.listen(PORT, () => {
  console.log(
    `server listening on port ${PORT}: ${protocol}://${host}:${PORT}`
  );
});
