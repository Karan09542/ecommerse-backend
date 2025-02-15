const AppError = require("../ErrorHandling/AppError");
const { CatchAsync } = require("../ErrorHandling/utils");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const { ObjectId } = require("mongoose").Types;

exports.getSellerProductsController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  let { page, limit } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  if (!page || isNaN(page)) {
    page = 1;
  }
  if (!limit || isNaN(limit)) {
    limit = 10;
  }
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const skip = (page - 1) * limit;

  if (user.role !== "seller") {
    return next(AppError("unautherized request to access", 400));
  }
  const products = await Product.find({ sellerId: userId })
    .skip(skip)
    .limit(limit)
    .select("-__v -sellerId -isFeatured")
    .sort({ createdAt: -1 });
  return res.status(200).json({
    status: "success",
    products,
  });
});
exports.addProductsController = CatchAsync(async (req, res, next) => {
  // if bulk uplode then this sellerId should be commented and uncomment req.body comments
  const sellerId = req.userId;
  const {
    name,
    description,
    price,
    stock,
    category,
    images,
    brand,
    // for bulk upload
    // rating,
    // sellerId,
  } = req.body;
  if (!name || !description || !price || !stock || !category || !images) {
    return next(new AppError("Please provide all required fields", 400));
  }
  const product = await Product.create({
    name,
    description,
    price,
    stock,
    category,
    brand: brand || undefined,
    images,
    sellerId,
    rating: rating || undefined,
  });
  return res.status(200).json({
    status: "success",
    message: "Product added successfully",
    _id: product._id,
  });
});
exports.updateProductController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const fields = [
    "_id",
    "name",
    "description",
    "price",
    "stock",
    "category",
    "brand",
    "images",
  ];

  if (Object.keys(req.body).length === 0) {
    return next(new AppError("Please provide fields to update", 400));
  }
  if (!req.body._id) {
    return next(new AppError("Please provide product id", 400));
  }
  const product = await Product.findById(req.body._id);
  console.log("userId", userId);
  console.log("product", product);
  if (product.sellerId?.toString() !== userId) {
    return next(new AppError("unautherized request to access", 400));
  }
  for (let key in req.body) {
    if (fields.includes(key)) {
      if (key === "brand" && !req.body[key]) continue;
      product[key] = req.body[key];
    }
  }
  await product.save();
  return res.status(200).json({
    status: "success",
    message: "Product updated successfully",
  });
});
exports.deleteProductController = CatchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { productId } = req.params;
  if (!productId || !ObjectId.isValid(productId)) {
    return next(new AppError("Please provide valid product id", 400));
  }
  const product = await Product.findById(productId);
  if (product.sellerId?.toString() !== userId) {
    return next(new AppError("unautherized request to access", 400));
  }
  await product.deleteOne();
  return res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});
