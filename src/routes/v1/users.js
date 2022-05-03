const express = require('express');

const mysql = require('mysql2/promise');

const bcrypt = require('bcrypt');

const jsonwebtoken = require('jsonwebtoken');

const { mysqlConfig, jwtSecret } = require('../../config');

const router = express.Router();

// router.get('/check', async (req, res) => {
//   try {
//     const con = await mysql.createConnection(mysqlConfig);
//     const [data] = await con.execute('SHOW COLUMNS FROM users');
//     await con.end();

//     return res.send(data);
//   } catch (err) {
//     console.log(err);
//     return res.status(500).send({ err: 'A server issue has occured - please try again later.' });
//   }
// });

router.post('/register', async (req, res) => {
  if (!req.body.name || !req.body.email || !req.body.password) {
    return res.status(400).send({ err: 'Incorect data passed' });
  }

  try {
    const hash = bcrypt.hashSync(req.body.password, 10);
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      INSERT INTO users (name, email, password)
      VALUES (${mysql.escape(req.body.name)}, ${mysql.escape(req.body.email)}, '${hash}')`);
    await con.end();

    if (!data.insertId || data.affectedRows !== 1) {
      console.log(data);
      return res.status(500).send({ err: 'An issue was found. Please try again later.' });
    }

    return res.send({
      msg: 'Succesfully created account',
      userId: data.insertId,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

router.post('/login', async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ err: 'Incorect data passed' });
  }

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
    console.log(err);
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
