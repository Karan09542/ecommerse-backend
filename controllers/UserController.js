const { IS_SECURE } = require("../config/config.js");
const util = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel.js");
const AppError = require("../ErrorHandling/AppError.js");
const { CatchAsync } = require("../ErrorHandling/utils.js");
const { hasMXRecord } = require("../utility/MxRecord.js");
const crypto = require("crypto");
const htmlTemplate = require("../utility/htmlTemplate.json");

const {
  sendEmailToVerifyEmail,
} = require("../utility/sendEmailToverifyEmail.js");
const { sendEmail } = require("../utility/sendEmail.js");

async function signAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}
async function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "90d",
  });
}

function setCookies(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: IS_SECURE ? "None" : "Lax",
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
}

exports.authorize = CatchAsync(async function (req, res, next) {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Please provide token", 401));
  }

  let decoded;
  try {
    decoded = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_ACCESS_SECRET
    );
  } catch (err) {
    console.log("error", err);
    return next(new AppError(err?.message, 401));
  }

  const currentUser = await User.findById(decoded.id).select(
    "+passwordChangedAt"
  );

  if (!currentUser) {
    return next(new AppError("NOT_LOGGED_IN", 401));
  }

  if (await currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password has been changed. Please login again!", 401)
    );
  }
  req.userId = decoded.id;
  next();
});

// get user details
exports.getUserDetailsController = CatchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId).select(
    "_id role active username email"
  );
  res.status(200).json({ status: "success", user });
});

// signup
exports.userSignupController = CatchAsync(async (req, res, next) => {
  const { password, email, phoneNo } = req.body;

  if (!password) {
    return next(new AppError("Please provide password to signup", 400));
  }
  if (!email && !phoneNo) {
    return next(
      new AppError("Please provide email or phone number to signup", 400)
    );
  }

  if (email) {
    await hasMXRecord(email)
      .then((has) => {
        if (!has) next(new AppError("Please provide a valid Email Id!", 400));
        return;
      })
      .catch((err) => {
        next(new AppError("Please provide a valid Email Id!", 400));
        return;
      });
  }

  console.log(email, phoneNo);
  const user = await User.findOne({
    // email: email?.toLowerCase(),
    $or: [
      ...(email ? [{ email: email?.toLowerCase() }] : []),
      ...(phoneNo ? [{ phoneNo }] : []),
    ],
  }).select("+isVerified");

  if (user) {
    if (!user.isVerified) {
      return sendEmailToVerifyEmail(res, user);
    } else {
      return next(new AppError("Please check your email", 400));
    }
  }
  const newUser = await User.create({
    email: email?.toLowerCase(),
    password,
    phoneNo,
  });
  return sendEmailToVerifyEmail(res, newUser);
});
exports.userSignupVarificationController = CatchAsync(
  async (req, res, next) => {
    const { otp, verificationToken } = req.body;
    if (!otp || !verificationToken) {
      next(new AppError("Please provide otp and verification token", 400));
      return;
    }

    const decodedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    const user = await User.findOne({ verificationToken: decodedToken }).select(
      "+refreshToken"
    );
    if (!user) {
      return res.status(400).json({
        status: "fail",
        message: "Please check your verificationtoken",
      });
    }

    if (user.verificationTokenExpires < Date.now()) {
      return next(
        new AppError("Token has been expired Please generate a new one!", 400)
      );
    }

    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.otp = undefined;
    user.isVerified = true;

    const accessToken = await signAccessToken(user._id);
    const refreshToken = await signRefreshToken(user._id);

    const hashRefreshToken = await crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    user.refreshToken.push(hashRefreshToken);

    await user.save({ validateBeforeSave: false });

    setCookies(res, refreshToken);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      accessToken,
    });
  }
);

// login
exports.userLoginController = CatchAsync(async (req, res, next) => {
  const { email, password, phoneNo } = req.body;
  if (!password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  if (!email && !phoneNo) {
    return next(new AppError("Please provide email or phone number!", 400));
  }

  const user = await User.findOne({
    // email: email?.toLowerCase(),
    // $or: [{ email: email?.toLowerCase() }, { phoneNo }],
    $or: [
      ...(email ? [{ email: email?.toLowerCase() }] : []),
      ...(phoneNo ? [{ phoneNo }] : []),
    ],
  }).select("password refreshToken isVerified");

  if (!user || !(await user.isCorrectPassword(password))) {
    return next(new AppError("Invalid email and password!", 401));
  }

  if (!user.isVerified) {
    return next(new AppError("Please verify your email", 401));
  }

  const accessToken = await signAccessToken(user._id);
  const refreshToken = await signRefreshToken(user._id);

  const hashRefreshToken = await crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  user.refreshToken.push(hashRefreshToken);

  await user.save({ validateBeforeSave: false });

  setCookies(res, refreshToken);
  res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    accessToken,
  });
});

exports.userLogoutController = (fromAll = false) => {
  return CatchAsync(async (req, res, next) => {
    const userId = req.userId;

    if (!userId) {
      return next(new AppError("unauthorized request", 401));
    }
    if (!req.cookies.refreshToken) {
      return next(new AppError("unauthorized request", 401));
    }

    const user = await User.findById(userId).select("+refreshToken");
    const hashRefreshToken = await crypto
      .createHash("sha256")
      .update(req.cookies.refreshToken)
      .digest("hex");

    if (fromAll) {
      user.refreshToken = [hashRefreshToken];
    } else {
      user.refreshToken = user.refreshToken.filter(
        (token) => token !== hashRefreshToken
      );
    }
    await user.save({ validateBeforeSave: false });
    res.clearCookie("refreshToken");
    res.status(200).json({
      status: "success",
      message: fromAll
        ? "Logged out from all other devices successfully"
        : "Logged out successfully",
    });
  });
};

exports.refreshTokenController = CatchAsync(async (req, res, next) => {
  const incommingRefreshToken = req.cookies.refreshToken;
  if (!incommingRefreshToken) {
    return next(new AppError("unauthorized request", 401));
  }

  let decoded;
  try {
    decoded = await util.promisify(jwt.verify)(
      incommingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401));
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user) {
    return next(new AppError("Invalid refresh token", 401));
  }

  const hashRefreshToken = await crypto
    .createHash("sha256")
    .update(incommingRefreshToken)
    .digest("hex");

  if (!user.refreshToken.includes(hashRefreshToken)) {
    return next(new AppError("Invalid refresh token", 401));
  }

  if (await user.changedPasswordAfter(decoded.iat)) {
    res.clearCookie("refreshToken");
    return next(
      new AppError("User recently changed password! Please login again", 401)
    );
  }

  const newAccessToken = await signAccessToken(user._id);

  res.status(200).json({
    status: "success",
    accessToken: newAccessToken,
  });
});

exports.userForgotPasswordController = CatchAsync(async (req, res, next) => {
  const { email, phoneNo } = req.body;
  if (!email && !phoneNo) {
    return next(new AppError("Please provide your email or phone number", 400));
  }
  const user = await User.findOne({
    $or: [
      ...(email ? [{ email: email?.toLowerCase() }] : []),
      ...(phoneNo ? [{ phoneNo }] : []),
    ],
  }).select("+forgotMaxTime +forgotFirstTime +forgotAtTommorrow");

  if (!user) {
    return next(new AppError("Please check your email", 404));
  }

  if (user.forgotMaxTime < 3) {
    if (user.forgotFirstTime && user.forgotFirstTime <= Date.now()) {
      user.forgotMaxTime = 1;
      user.forgotFirstTime = Date.now() + 24 * 60 * 60 * 1000;
      user.forgotAtTommorrow = undefined;
    } else {
      user.forgotMaxTime += 1;
      if (!user.forgotFirstTime && user.forgotMaxTime === 1) {
        user.forgotFirstTime = Date.now() + 24 * 60 * 60 * 1000;
      }
    }
  } else {
    if (!user.forgotAtTommorrow) {
      user.forgotAtTommorrow = Date.now() + 24 * 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      return next(new AppError("Please try after 24 hours ", 400));
    } else {
      if (user.forgotAtTommorrow >= Date.now()) {
        return next(new AppError("Please try after 24 hours ", 400));
      } else {
        user.forgotAtTommorrow = undefined;
        user.forgotMaxTime = 1;
        user.forgotFirstTime = Date.now() + 24 * 60 * 60 * 1000;
      }
    }
  }

  const resetToken = await user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false }); // this is required if you use "=" to update values

  const emailOptions = {
    email: user.email,
    username: user.username,
    subject: "Reset Password",
    message:
      "You requested to reset your password. Click the link below to proceed:",
    path: "reset-password",
    token: resetToken,
    html: htmlTemplate["resetPassword"],
  };
  // await sendEmail(emailOptions);

  res.status(200).json({
    status: "success",
    message:
      "Please check your inbox, we have sent an email for reset password!",
    resetToken,
  });
});

exports.userUpdatePasswordController = CatchAsync(async (req, res, next) => {
  const { password, token } = req.body;
  if (!password || !token) {
    return next(new AppError("Please provide required fields", 400));
  }

  const hashedToken = await crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  }).select("+refreshToken");
  if (!user) {
    return next(
      new AppError(
        `Invalid or expired token. Please request a new one token for reset password`,
        400
      )
    );
  }

  user.password = password;
  user.passwordChangedAt = Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;

  const accessToken = await signAccessToken(user._id);
  const refreshToken = await signRefreshToken(user._id);

  const hashRefreshToken = await crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  user.refreshToken = [hashRefreshToken];
  await user.save({ validateBeforeSave: false });

  setCookies(res, refreshToken);

  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
    accessToken,
  });
});
// handle role
exports.userUpdateRoleController = (role = "user") => {
  return CatchAsync(async (req, res, next) => {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (user.role === role) {
      return next(new AppError("User already has this role", 400));
    }
    user.role = role;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      status: "success",
      message: "Role updated successfully to " + role,
    });
  });
};
