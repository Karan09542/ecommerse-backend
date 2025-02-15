const { CatchAsync } = require("../ErrorHandling/utils");
const AppError = require("../ErrorHandling/AppError");
const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const { ObjectId } = require("mongoose").Types;

// get cart
exports.getCartsController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const carts = await Order.aggregate([
    {
      $match: {
        customerId: new ObjectId(userId),
        deliveryStatus: "pending",
      },
    },
    // lookup on product
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              price: 1,
              name: 1,
              description: 1,
            },
          },
        ],
        as: "product",
      },
    },
    // product without array
    {
      $unwind: "$product",
    },
    {
      $project: {
        __v: 0,
        productId: 0,
        customerId: 0,
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    carts,
  });
});
// add cart
exports.addCartController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { productId, quantity, paymentMethod } = req.body;
  console.log("req body", req.body);
  if (!productId || !quantity || !paymentMethod) {
    return next(new AppError("Please provide all required fields", 400));
  }
  if (!ObjectId.isValid(productId)) {
    return next(new AppError("Please provide valid product id", 400));
  }
  const fields = ["paymentStatus", "deliveryAddress", "deliveryStatus"];
  let filterBodyFields = {};
  //   filtering
  fields.forEach((field) => {
    if (req.body?.[field]) {
      filterBodyFields[field] = req.body?.[field];
    }
  });

  await Order.create({
    customerId: userId,
    productId,
    quantity,
    paymentMethod,
    ...filterBodyFields,
  });

  return res.status(200).json({
    status: "success",
    message: "Product added to cart successfully",
  });
});
// update quantity cart
exports.updateCartQuantityController = CatchAsync(async (req, res, next) => {
  const { productId } = req.params;
  let { quantity } = req.body;
  quantity = parseInt(quantity);
  if (!productId || !ObjectId.isValid(productId)) {
    return next(new AppError("Please provide valid product id", 400));
  }

  if (!quantity || isNaN(quantity)) {
    return next(new AppError("Quantity must be a positive number"));
  }

  const cart = await Order.findById(productId);
  cart.quantity = quantity;
  await cart.save({ validateBeforeSave: false });
  return res.status(200).json({
    status: "success",
    message: "Product quantity updated successfully",
  });
});
// delete cart
exports.deleteCartController = CatchAsync(async (req, res, next) => {
  const { productId } = req.params;
  if (!ObjectId.isValid(productId)) {
    return next(new AppError("Please provide valid product id", 400));
  }
  const cart = await Order.findById(productId);
  await cart.deleteOne();
  return res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});
