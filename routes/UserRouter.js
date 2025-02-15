const express = require("express");
const {
  authorize,
  userSignupController,
  userSignupVarificationController,
  userLoginController,
  refreshTokenController,
  userForgotPasswordController,
  userUpdatePasswordController,
  getUserDetailsController,
  userLogoutController,
  userUpdateRoleController,
} = require("../controllers/UserController");

const PublicUserRouter = express.Router();

PublicUserRouter.post("/signup", userSignupController);
PublicUserRouter.post("/signup/verify", userSignupVarificationController);
PublicUserRouter.post("/login", userLoginController);
PublicUserRouter.post("/refresh-token", refreshTokenController);
PublicUserRouter.post("/forgot-password", userForgotPasswordController);
PublicUserRouter.post("/update-password", userUpdatePasswordController);

const PrivateUserRouter = express.Router();
PrivateUserRouter.use(authorize);
PrivateUserRouter.post("/", getUserDetailsController);
PrivateUserRouter.post("/logout", userLogoutController());
PrivateUserRouter.post("/logout-all", userLogoutController(true));
// update role to seller
PrivateUserRouter.post(
  "/update-role/seller",
  userUpdateRoleController("seller")
);

module.exports = { PublicUserRouter, PrivateUserRouter };
