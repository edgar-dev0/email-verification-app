const { getAll, create, getOne, remove, update, login, logedUser, verifyCode } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/')
    .get(verifyJWT, getAll)  // proteger esta ruta
    .post(create);

userRouter.route('/login')
  .post(login);

userRouter.route('/me')
  .get(verifyJWT, logedUser);

userRouter.route('/verify/:code')
  .get(verifyCode);

userRouter.route('/:id')
  .get(verifyJWT, getOne)
  .delete(verifyJWT, remove)
  .put(verifyJWT, update);

module.exports = userRouter;