const express = require('express');
const cors = require('cors');

const { serverPort } = require('./config');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(serverPort, () => console.log(`Server is running on port: ${serverPort}`));
