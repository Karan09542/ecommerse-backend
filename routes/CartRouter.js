const express = require("express");
const { authorize } = require("../controllers/UserController");
const {
  getCartsController,
  addCartController,
  deleteCartController,
  updateCartQuantityController,
} = require("../controllers/CartController");

const CartRouter = express.Router();
CartRouter.use(authorize);
CartRouter.post("/", getCartsController);
CartRouter.post("/add", addCartController);
CartRouter.post("/delete/:productId", deleteCartController);
CartRouter.post("/update/:productId", updateCartQuantityController);
module.exports = CartRouter;
