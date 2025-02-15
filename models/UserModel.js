const emailValidator = require("email-validator");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // user details
    username: String,
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email) => {
          return emailValidator.validate(email);
        },
        message: "Invalid email format",
      },
    },
    phoneNo: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      validate: {
        validator: function (password) {
          return password.length > 7;
        },
        message: "Password must be at least 8 characters",
      },
    },
    role: {
      type: String,
      enum: ["user", "seller", "admin"],
      default: "user",
    },
    active: {
      type: Boolean,
      default: true,
    },

    // verification on email || phone
    isVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
    refreshToken: {
      type: [String],
      default: [],
      select: false,
    },
    // verification temperory token
    otp: Number,
    verificationToken: String,
    verificationTokenExpires: Date,

    // password
    passwordChangedAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    // password reset temporary token
    passwordResetToken: String,
    passwordResetTokenExpires: Date,

    forgotMaxTime: {
      type: Number,
      default: 0,
      max: 3,
      min: 0,
      select: false,
    },
    forgotAtTommorrow: {
      type: Date,
      select: false,
    },
    forgotFirstTime: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// hashing password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});
// varification for email
userSchema.methods.createVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const otp = Math.floor(100000 + Math.random() * 900000);
  this.verificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  this.verificationTokenExpires = Date.now() + 10 * 60 * 1000;
  this.otp = otp;
  return { verificationToken, otp };
};
// check is correct password
userSchema.methods.isCorrectPassword = function (rawPassword) {
  return bcrypt.compareSync(rawPassword, this.password);
};

// for verified isChangedPassword
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// for password reset
userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = await crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
