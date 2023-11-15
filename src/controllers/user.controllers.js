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
    { where: { id }, returning: true }
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

const verifyCode = catchError(async(req, res) => {
    const { code } = req.params;
    const emailCode = await EmailCode.findOne({ where: { code: code }});
    if(!emailCode) return res.status(401).json({ message: "!Code not found! "});
    const user = await User.findByPk(emailCode.userId);
    user.isVerified = true;
    await user.save(); //Actualizamos el valor del campo isVerified de la tabla User
    emailCode.destroy(); //Eliminamos el registro del codigo encontrado
  //return res.json({ message:"verified code"})
  return res.json(user);
});

const resetPassword = catchError(async(req, res) => {
  const { email, frontBaseUrl } = req.body;
  user = await User.findOne({ where: { email: email }});
  if(!user) return res.status(401).json({ message: "Email not found" });
  const code = require('crypto').randomBytes(32).toString('hex');
  const link = `${frontBaseUrl}/auth/reset_password/${code}`

  //code to send mail
  await emailSender({
    to: email,
    subject: 'Reset password for user app',
    //text: 'Este es un correo desde node',
    html: `
      <h1>Hello</h1>
      <hr>
      <p><b>You have requested a password reset</b></p>
      <p><b></b>Please click the follow link to continue with the process:</b></p>
      <h4><a href="${link}">${link}</a></h4>
    `
  });

  await EmailCode.create({
    code: code,
    userId: user.id
  });
  return res.status(201).json({ message: "Password reset" });
});

const renewPassword = catchError(async(req, res) => {
  const { password } = req.body;
  const { code } = req.params;
  if(!code) return res.status(401).json({ message: "Invalid code"} );
  const emailCode = await EmailCode.findOne({ where: { code: code }});
  if(!emailCode) return res.status(401).json({ message: "!Code not found! "});
  const encryptedPassword = await bcrypt.hash(password, 10);
  const user = await User.findByPk(emailCode.userId);
  user.password = encryptedPassword;
  await user.save(); //Actualizamos el valor del campo password de la tabla User
  emailCode.destroy();
  return res.status(201).json({ message: "Updated password." });
});

module.exports = {
  getAll,
  create,
  getOne,
  remove,
  update,
  login,
  logedUser,
  verifyCode,
  resetPassword,
  renewPassword
}