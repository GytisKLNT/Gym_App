const express = require('express');
const mysql = require('mysql2/promise');

const { mysqlConfig } = require('../../config');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute('SELECT * FROM sets');
    await con.end();

    return res.send(data.filter((item) => item.user_id === Number(req.params.id)));
  } catch (err) {
    console.log(err);
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

router.post('/', async (req, res) => {
  // eslint-disable-next-line max-len
  if (!req.body.user_id || !req.body.exercise_id || !req.body.weight || !req.body.sets || !req.body.reps) {
    res.status(400).send({ err: 'Incorect data passed' });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
        INSERT INTO sets (user_id, exercise_id, weight, sets, reps)
        VALUES (
        ${mysql.escape(req.body.user_id)},
        ${mysql.escape(req.body.exercise_id)},
        ${mysql.escape(req.body.weight)},
        ${mysql.escape(req.body.sets)},
        ${mysql.escape(req.body.reps)})
      `);
    await con.end();

    if (!data.insertId || data.affectedRows !== 1) {
      console.log(data);
      return res.status(500).send({ err: 'An issue was found. Please try again later.' });
    }
    return res.send({
      msg: 'Excercise saved',
      userId: data.insertId,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
