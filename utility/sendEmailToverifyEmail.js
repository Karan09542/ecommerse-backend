const htmlTemplate = require("../utility/htmlTemplate.json");
const { sendEmail } = require("./sendEmail.js");
exports.sendEmailToVerifyEmail = async (res, user) => {
  const { verificationToken, otp } = user.createVerificationToken();
  await user.save({ validateBeforeSave: false });

  const options = {
    email: user?.email,
    username: user?.username || "रामनामसत्यहैं",
    subject: "Verify Your Email Address",
    message:
      "To start using your account, please verify your email by clicking the button below:",
    path: "verify-email",
    token: verificationToken,
    html: htmlTemplate["emailVerification"],
  };
  await sendEmail(options);
  res.status(201).json({
    status: "success",
    message:
      "an email has been sent to your email address. Please verify your email address",
    otp,
    verificationToken,
  });
};
