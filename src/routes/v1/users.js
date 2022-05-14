const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const fetch = require('node-fetch');
const generator = require('generate-password');

const { hashSync } = require('bcrypt');

const {
  registrationSchema,
  loginSchema,
  changePassSchema,
  forgotSchema,
  newPassword,
} = require('../../middleware/valSchemas');
const { mysqlConfig, jwtSecret, mailServer, mailServerPassword } = require('../../config');
const validation = require('../../middleware/validation');
const isLoggedIn = require('../../middleware/auth');

const router = express.Router();

router.post('/register', validation(registrationSchema), async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.password, 10);
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      INSERT INTO users (name, email, password)
      VALUES (${mysql.escape(req.body.name)}, ${mysql.escape(req.body.email)}, '${hash}')`);
    await con.end();

    if (!data.insertId || data.affectedRows !== 1) {
      return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
    }

    return res.send({
      msg: 'Succesfully created account',
      userId: data.insertId,
    });
  } catch (err) {
    return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
  }
});

router.post('/login', validation(loginSchema), async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      SELECT id, email, password FROM users WHERE email = ${mysql.escape(req.body.email)} LIMIT 1`);
    await con.end();

    if (data.length === 0) {
      return res.status(400).send({ msg: 'Incorrect email or password' });
    }

    if (!bcrypt.compareSync(req.body.password, data[0].password)) {
      return res.status(400).send({ msg: 'Incorrect email or password' });
    }

    const token = jsonwebtoken.sign({ accountId: data[0].id }, jwtSecret);

    return res.send({
      msg: 'Succesfully loged in',
      token,
    });
  } catch (err) {
    return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
  }
});

router.post('/change', isLoggedIn, validation(changePassSchema), async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      SELECT password FROM users WHERE id = ${mysql.escape(req.user.accountId)} LIMIT 1`);

    if (bcrypt.compareSync(req.body.oldPassword, data[0].password)) {
      const hash = bcrypt.hashSync(req.body.newPassword, 10);

      await con.execute(`
        UPDATE users SET password = '${hash}' WHERE id = ${mysql.escape(req.user.accountId)}
        `);

      await con.end();

      return res.send({
        msg: 'Password changed',
      });
    }

    await con.end();
    return res.status(400).send({ msg: 'Incorrect old password' });
  } catch (err) {
    return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
  }
});

router.post('/forgot', validation(forgotSchema), async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
    SELECT id FROM users WHERE email = ${mysql.escape(req.body.email)}`);

    if (data.length !== 1) {
      await con.end();
      return res.send({ msg: 'An issue was found. Please try again later.' });
    }

    const randCode = generator.generate({
      length: 5,
      numbers: true,
    });

    const [data1] = await con.execute(`
    INSERT INTO password_reset (user_id, temp_code)
    VALUES (${mysql.escape(req.body.email)}, '${randCode}')`);

    await con.end();

    if (!data1.insertId) {
      return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
    }

    const response = await fetch(mailServer, {
      method: 'POST',
      body: JSON.stringify({
        password: mailServerPassword,
        email: req.body.email,
        message: `If you requested for a new password, please visit this link http://localhost:8080/v1/users/new-password?email=${encodeURI(
          req.body.email,
        )}&token=${randCode}`,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();

    if (!json.info) {
      return res.status(500).send({
        msg: 'An issue was found. Please try again later.',
      });
    }

    return res.send({ msg: 'If your email is correct you will get a message soon' });
  } catch (err) {
    return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
  }
});

router.post('/newPassword', validation(newPassword), async (req, res) => {
  try {
    const connect = await mysql.createConnection(mysqlConfig);
    const [data2] = await connect.execute(`
        SELECT * FROM password_reset WHERE user_id=${mysql.escape(req.body.email)}
        AND temp_code=${mysql.escape(req.body.tempCode)} LIMIT 1`);

    if (data2.length !== 1) {
      connect.end();
      res.status(400).send({ msg: 'Invalid change password request. Please try again' });
    }

    if ((new Date().getTime() - new Date(data2[0].timestamp).getTime()) / 60000 > 30) {
      await connect.end();
      return res.status(400).send({ msg: 'Invalid change password request. Please try again' });
    }

    const hash = hashSync(req.body.password, 10);

    const [changeData] = await connect.execute(`
        UPDATE users
        SET password = '${hash}'
        WHERE email = ${mysql.escape(req.body.email)}
    `);

    if (!changeData.affectedRows) {
      await connect.end();
      return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
    }

    await connect.execute(`
    DELETE FROM password_reset
    WHERE id = ${data2[0].id}`);

    await connect.end();
    return res.send({ msg: 'Password has been changed' });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
