const { CatchAsync } = require("../ErrorHandling/utils");
const AppError = require("../ErrorHandling/AppError");
const Order = require("../models/OrderModel");
const { ObjectId } = require("mongoose").Types;

// get order
exports.getOrdersController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const orders = await Order.aggregate([
    {
      $match: {
        customerId: new ObjectId(userId),
        $expr: {
          $ne: ["$deliveryStatus", "pending"],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
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
    orders,
  });
});
// add order
exports.addOrderController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { productId, paymentMethod, deliveryAddress } = req.body;
  if (!productId || !paymentMethod || !deliveryAddress) {
    return next(new AppError("Please provide all required fields", 400));
  }
  if (!ObjectId.isValid(productId)) {
    return next(new AppError("Please provide valid product id", 400));
  }

  const order = await Order.findById(productId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.customerId?.toString() !== userId) {
    return next(new AppError("unautherized request to access", 400));
  }

  const deliveryStatusList = ["processing", "shipped", "delivered", "canceled"];
  const mahadev = Math.floor(
    Math.random() * (deliveryStatusList.length - 0) + 0
  );
  order.deliveryStatus = deliveryStatusList[mahadev];
  order.paymentMethod = paymentMethod;
  order.deliveryAddress = deliveryAddress;
  order.createdAt = Date.now();

  await order.save({ validateBeforeSave: false });
  return res.status(200).json({
    status: "success",
    message: "Ordered successfully",
  });
});
exports.updateOrderController = CatchAsync(async (req, res, next) => {});
exports.deleteOrderController = CatchAsync(async (req, res, next) => {});
