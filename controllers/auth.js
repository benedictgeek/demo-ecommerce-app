const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodeMailer = require("nodemailer");
const { validationResult } = require("express-validator");

const User = require("../models/user");

let transporter = nodeMailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "olushola251@gmail.com",
    pass: "uveuldwwptjpoorm"
  }
});

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  let oldEmail = req.flash("oldEmail");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
    oldEmail = "";
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    oldEmail: oldEmail,
    validationResults: [],
    errorMessage: message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    oldEmail: "",
    errorMessage: message,
    validationResults: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const message = validationResult(req);
  if (!message.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "login",
      oldEmail: email,
      errorMessage: message.errors[0].msg,
      validationResults: message.errors
    });
  }
  User.findOne({
    email: email
  })
    .then(user => {
      if (!user) {
        req.flash("error", "Invalid email or password.");
        req.flash("oldEmail", email);
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password.");
          res.redirect("/login");
        })
        .catch(err => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch(err => {
      const error = err;
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const message = validationResult(req);
  if (!message.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      oldEmail: email,
      errorMessage: message.errors[0].msg,
      validationResults: message.errors
    });
  }
  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: {
          items: []
        }
      });
      return user.save();
    })
    .then(result => {
      res.redirect("/login");
      let mailOptions = {
        from: '"Admin" olushola251@gmail.com',
        to: email,
        subject: "Welcome",
        text: "Your account has been registerd."
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        }
        console.log(info);
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "reset",
    pageTitle: "reset",
    csrfToken: req.csrfToken(),
    errorMessage: message
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/reset");
    }

    const token = buffer.toString("hex");
    User.findOne({
      email: req.body.email
    })
      .then(user => {
        if (!user) {
          req.flash("error", "Email does not exists");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpration = Date.now() + 3600000;

        user
          .save()
          .then(user => {
            res.redirect("/");
            let mailOptions = {
              from: '"Admin" olushola251@gmail.com',
              to: req.body.email,
              subject: "Password Reset",
              html: `
              <p>You requested a password reset</p>
              <p>Click <a href="http::/localhost:4040/reset/${token}">here</a> to change your password</p>
            `
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                console.log(err);
              }
              console.log(info);
            });
          })
          .catch(err => {
            console.log(err);
          });
      })
      .catch(err => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({
    resetToken: token,
    resetTokenExpration: {
      $gt: Date.now()
    }
  })
    .then(user => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }

      if (!user) {
        message = "Expired or Invalid Token";
      }

      res.render("auth/new-password", {
        path: "new-password",
        pageTitle: "New Password",
        csrfToken: req.csrfToken(),
        token: token,
        userId: user._id.toString(),
        errorMessage: message
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const token = req.body.token;
  const userId = req.body.userId;
  const newPassword = req.body.newPassword;

  let resetUser;

  User.findOne({
    resetToken: token,
    resetTokenExpration: {
      $gt: Date.now(),
      _id: userId
    }
  })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpration = undefined;
      return resetUser.save();
    })
    .then(result => {
      res.redirect("/login");
    });
};
