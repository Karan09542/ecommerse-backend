const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { PublicUserRouter, PrivateUserRouter } = require("./routes/UserRouter");
const {
  globalErrorHandlingController,
  unHandleRoutesController,
} = require("./ErrorHandling/ErrorHandlingControllers");
const {
  PublicProductRouter,
  PrivateProductRouter,
} = require("./routes/ProductRouter");
const SearchRouter = require("./routes/SearchRouter");
const OrderRouter = require("./routes/OrderRouter");
const CartRouter = require("./routes/CartRouter");
dotenv.config({ path: "./.env" });

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send(
    `<h1 style="display: flex; justify-content: center; height: 100vh; margin: 0;font-family: Arial, sans-serif;font-weight: 500;font-size: 40px;">
      हर हर महादेव
    </h1>`
  );
});

// routes
// `---> user
app.use("/user", PublicUserRouter);
app.use("/user", PrivateUserRouter);
// `--> product
app.use("/product", PublicProductRouter);
app.use("/product", PrivateProductRouter);
// `--> search
app.use("/search-product", SearchRouter);
// `--> cart
app.use("/cart-product", CartRouter);
// `--> order
app.use("/order-product", OrderRouter);
// error handler
app.all("*", unHandleRoutesController);
app.use(globalErrorHandlingController);

module.exports = app;
