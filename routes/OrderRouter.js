const express = require("express");
const { authorize } = require("../controllers/UserController");
const {
  getOrdersController,
  addOrderController,
} = require("../controllers/OrderController");

const OrderRouter = express.Router();
OrderRouter.use(authorize);
OrderRouter.post("/", getOrdersController);
OrderRouter.post("/add", addOrderController);
module.exports = OrderRouter;
