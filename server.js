/* eslint-disable  */
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const db = require('./db');
const UserModel = require('./models/user');

const { ExtractJwt, Strategy } = passportJWT;
const PORT = 4001;
const app = express();
mongoose.connect(db.url);

const jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'RomanAllmax';
const strategy = new Strategy(jwtOptions, function(jwtPayload, next) {
  next(null, jwtPayload.email);
});
passport.use(strategy);
const options = {
  expiresIn: "12h"
}

const createApp = () => {
  app.use(morgan('dev'));
  app.use(passport.initialize());
  app.use(express.static(path.join(__dirname, 'dist')));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error('Not found');
      err.status = 404;
      next(err);
    } else {
      next();
    }
  });
  app.use((err, req, res, next) => {
    res.status(err.status || 500).send(err.message || 'Internal server error.');
    next();
  });

  app.post('/singup', (req, res) => {
    const user = new UserModel({
      email: req.body.email,
      password: req.body.password
    });
    user.save((err) => {
      if (err) throw err;
    });
    const payload = { email: req.body.email };
    const token = jwt.sign(payload, jwtOptions.secretOrKey, options);
    return res.status(200).send({ token: token });
  });

  app.post('/singin', (req, res) => {
    UserModel.findOne({ email: req.body.email }, function(error, user) {
      if (error) throw error;
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (err) throw err;
        if (!isMatch) {
          return res.status(400).send({
            body: {
              message: "Email or password is incorrect",
              statusCode: 1
            }
          });
        }
        const payload = { email: req.body.email };
        const token = jwt.sign(payload, jwtOptions.secretOrKey, options);
        return res.status(200).send({ token: token });
      });
    });
  });

  app.get('/profile', (req, res) => {
    const token = req.headers.authorization.split(' ');
    console.log(jwt.verify(token[1], jwtOptions.secretOrKey));
  });

  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
};

const startListening = () => {
  app.listen(PORT);
};

createApp();
startListening();
