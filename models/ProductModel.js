const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "seller id is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      validate: {
        validator: function (value) {
          return /\S/.test(value);
        },
        message: "Please provide product name",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    // images: [
    //   {
    //     url: { type: String, required: true },
    //     public_id: { type: String, required: true }, // For Cloudinary or Firebase storage
    //   },
    // ],
    images: {
      type: [String],
      required: [true, "At least one product image is required"],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: "At least one product image is required",
      },
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({
  name: "text",
  description: "text",
  category: "text",
  brand: "text",
});
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
