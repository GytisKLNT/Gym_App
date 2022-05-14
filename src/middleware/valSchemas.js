const Joi = require('joi');

const registrationSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().trim().required(),
  password: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().required(),
  password: Joi.string().required(),
});

const changePassSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().trim().required(),
});

const newPassword = Joi.object({
  email: Joi.string().email().required(),
  tempCode: Joi.string().required(),
  password: Joi.string().required(),
});

module.exports = {
  registrationSchema,
  loginSchema,
  changePassSchema,
  forgotSchema,
  newPassword,
};
