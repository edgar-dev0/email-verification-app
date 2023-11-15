const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailSender = require('../utils/emailSender');
const EmailCode = require('../models/EmailCode');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
  const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  const result = await User.create({
    email,
    password: encryptedPassword,
    firstName,
    lastName,
    country,
    image
  });

  const code = require('crypto').randomBytes(32).toString('hex'); //sirve para generar un codigo aleatorio

  await EmailCode.create({
    code: code,
    userId: result.id // obtenemos el id del usuario recien creado a travez de la constante results de la linea 10
  });

  const link = `${frontBaseUrl}/auth/verify_email/${code}`

  //code to send mail
  await emailSender({
    to: email,
    subject: 'Verificate email for user app',
    //text: 'Este es un correo desde node',
    html: `
      <h1>Hello ${firstName} ${lastName}</h1>
      <hr>
      <p><b>¡Thanks for sign in our app!</b></p>
      <p><b></b>Click the next link to verificate your account: </b></p>
      <h4><a href="${link}">${link}</a></h4>
    `
  });

  return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
  const { id } = req.params;
  const result = await User.findByPk(id);
  if(!result) return res.sendStatus(404);
  return res.json(result);
});

const remove = catchError(async(req, res) => {
  const { id } = req.params;
  await User.destroy({ where: {id} });
  return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
  const { id } = req.params;
  const { firstName, lastName, country, image } = req.body;
  const result = await User.update(
    {
      firstName,
      lastName,
      country,
      image
    },
    { where: {id}, returning: true }
  );
  if(result[0] === 0) return res.sendStatus(404);
  return res.json(result[1][0]);
});

const login = catchError(async(req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email: email }});
  if(!user) return res.status(401).json({ message: "!Invalid credential¡" });
  const isValid = await bcrypt.compare(password, user.password);
  if(!isValid) return res.status(401).json({ message: "¡Invalid credential!"});
  if(!user.isVerified) return res.status(401).json({ message: "!User without email verification¡" });

  const token = jwt.sign(
    { user },
    process.env.TOKEN_SECRET,
    { expiresIn: '1d'}
  );
  return res.json({ user, token });
});

const logedUser = catchError(async(req, res) => {
  const user = req.user;
  return res.json(user);
});

module.exports = {
  getAll,
  create,
  getOne,
  remove,
  update,
  login,
  logedUser
}