// index.js

"use strict";

const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { pool } = require('./config');

const app = express();
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.png')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const getBooks = (request, response) => {
  pool.query('SELECT * FROM books', (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

const addBook = (request, response) => {
  const { author, title } = request.body;

  pool.query(
    'INSERT INTO books (author, title) VALUES ($1, $2)',
    [author, title],
    (error) => {
      if (error) {
        throw error;
      }
      response.status(201).json({ status: 'success', message: 'Book added.' });
    }
  );
};

const getHome = (request, response) => {
  response.sendFile(__dirname + '/public/index.html');
};

app
  .route('/')
  .get(getHome);

app
  .route('/books')
  // GET endpoint
  .get(getBooks)
  // POST endpoint
  .post(addBook);

// Start server
app.listen(process.env.PORT || 3002, () => {
  console.log(`Server listening`);
});
