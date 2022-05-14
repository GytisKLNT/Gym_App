const express = require('express');

const mysql = require('mysql2/promise');

const bcrypt = require('bcrypt');

const Joi = require('joi');

const jsonwebtoken = require('jsonwebtoken');

const { mysqlConfig, jwtSecret } = require('../../config');
const validation = require('../../middleware/validation');

const router = express.Router();

const registrationSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().trim().required(),
  password: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().required(),
  password: Joi.string().required(),
});

router.post('/register', validation(registrationSchema), async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.password, 10);
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      INSERT INTO users (name, email, password)
      VALUES (${mysql.escape(req.body.name)}, ${mysql.escape(req.body.email)}, '${hash}')`);
    await con.end();

    if (!data.insertId || data.affectedRows !== 1) {
      return res.status(500).send({ err: 'An issue was found. Please try again later.' });
    }

    return res.send({
      msg: 'Succesfully created account',
      userId: data.insertId,
    });
  } catch (err) {
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

router.post('/login', validation(loginSchema), async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      SELECT id, email, password FROM users WHERE email = ${mysql.escape(req.body.email)} LIMIT 1`);
    await con.end();

    if (data.length === 0) {
      return res.status(400).send({ err: 'Incorrect email or password' });
    }

    if (!bcrypt.compareSync(req.body.password, data[0].password)) {
      return res.status(400).send({ err: 'Incorrect email or password' });
    }

    const token = jsonwebtoken.sign({ accountId: data[0].id }, jwtSecret);

    return res.send({
      msg: 'Succesfully loged in',
      token,
    });
  } catch (err) {
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
