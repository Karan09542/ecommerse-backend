const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "customer id is required"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "product id is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be greater than 0"],
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "credit", "debit"],
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    deliveryAddress: String,
    deliveryStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

orderSchema.index({
  customerId: 1,
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
