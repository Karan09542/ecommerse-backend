const express = require("express");
const { authorize } = require("../controllers/UserController");
const {
  getSellerProductsController,
  addProductsController,
  updateProductController,
  deleteProductController,
} = require("../controllers/ProductController");
const PublicProductRouter = express.Router();

const PrivateProductRouter = express.Router();
// comment authorize middleware for bulk upload --> get bulk upload script from utility/startupScript.js
PrivateProductRouter.use(authorize);
PrivateProductRouter.post("/seller", getSellerProductsController);
PrivateProductRouter.post("/add", addProductsController);
PrivateProductRouter.post("/update", updateProductController);
PrivateProductRouter.post("/delete/:productId", deleteProductController);

module.exports = { PublicProductRouter, PrivateProductRouter };
