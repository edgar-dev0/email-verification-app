const { getAll, create, getOne, remove, update, login, logedUser } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/')
    .get(getAll)
    .post(create); // proteger esta ruta

userRouter.route('/login')
  .post(login);

userRouter.route('/me')
  .get(verifyJWT, logedUser);

userRouter.route('/:id')
  .get(verifyJWT, getOne)
  .delete(verifyJWT, remove)
  .put(verifyJWT, update);

module.exports = userRouter;