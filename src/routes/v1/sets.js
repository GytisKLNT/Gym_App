const express = require('express');
const mysql = require('mysql2/promise');
const Joi = require('joi');

const isLoggedIn = require('../../middleware/auth');
const validation = require('../../middleware/validation');
const { mysqlConfig } = require('../../config');

const router = express.Router();

const setSchema = Joi.object({
  weight: Joi.number().required(),
  reps: Joi.number().required(),
  sets: Joi.number().required(),
  exercise_id: Joi.number().required(),
});

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT * FROM sets LEFT JOIN exercises ON sets.exercise_id = exercises.id WHERE user_id = ${req.user.accountId}`,
    );
    await con.end();
    return res.send(data);
  } catch (err) {
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

router.post('/', isLoggedIn, validation(setSchema), async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(`
        INSERT INTO sets (user_id, exercise_id, weight, sets, reps)
        VALUES (
        ${mysql.escape(req.user.accountId)},
        ${mysql.escape(req.body.exercise_id)},
        ${mysql.escape(req.body.weight)},
        ${mysql.escape(req.body.sets)},
        ${mysql.escape(req.body.reps)})
      `);
    await con.end();

    if (!data.insertId) {
      return res.status(500).send({ err: 'An issue was found. Please try again later.' });
    }
    return res.send({
      msg: 'Excercise saved',
      userId: data.insertId,
    });
  } catch (err) {
    return res.status(500).send({ err: 'An issue was found. Please try again later.' });
  }
});

module.exports = router;
