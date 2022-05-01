const express = require('express');

const mysql = require('mysql2/promise');

const { mysqlConfig } = require('../../config');

const router = express.Router();

// router.get('/', async (req, res) => {
//   try {
//     const con = await mysql.createConnection(mysqlConfig);
//     const [data] = await con.execute('ALTER TABLE users ADD UNIQUE (email(50))');
//     await con.end();

//     return res.send(data);
//   } catch (err) {
//     console.log(err);
//     return res.status(500).send({ err: 'A server issue has occured - please try again later.' });
//   }
// });

router.post('/', async (req, res) => {
  if (!req.body.name || !req.body.email) {
    return res.status(400).send({ err: 'Incorect data passed' });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      INSERT INTO users (name, email)
      VALUES (${mysql.escape(req.body.name)}, ${mysql.escape(req.body.email)})`);
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

router.post('/id', async (req, res) => {
  if (!req.body.email) {
    return res.status(400).send({ err: 'Incorect data passed' });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
      SELECT id FROM users WHERE email = ${mysql.escape(req.body.email)}`);
    await con.end();

    if (data.length === 0) {
      return res.status(400).send({ err: 'User not found' });
    }

    return res.send({
      msg: 'Succesfully loged in',
      accountId: data[0].id,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
