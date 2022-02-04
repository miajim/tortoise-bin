const express = require('express')
const bodyParser = require('body-parser') // middleware that parses incoming requests
const hbs = require('hbs') //handlebars
const app = express()
const { pool } = require('./config')  // Enables connection to postgres
const cors = require('cors')          // Helps us avoid cors issues
const port = 3005

app.set('view engine', 'hbs'); // handlebars

// We might need to get rid of the middleware in order to get the raw. Not sure about this
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)
app.use(cors())

function binPath(len) {
  return [...Array(len)]
    .map(() => Math.random()
    .toString(36)[2])
    .join('')
    .toUpperCase();
}

app.get('/', (request, response) => {
  response.render('index')
})

/*
- Create bin
  - Receive a request
  - What data do we need for this route?
    - Random URL
    - Timestamp
    
  - We need to convert timestamp to a format that Postgres accepts OR we can insert as string
    
  - Insert into the database a new record on the Bins table
    - Data inserted: random URL and timestamp
    
  - Redirect to /:bin_path?inspect
*/

// Creation of new bin
app.post('/createBin', (request, response) => {
  const newBinPath = binPath(8);
  const timestamp = Date.now(); // Be able to be inserted into DB

  const queryString = `INSERT INTO bins (bin_path, creation_time) VALUES ($1, (to_timestamp(${timestamp} / 1000.0)))`;

  pool.query(queryString, [newBinPath], (error, results) => {
    if (error) {
      throw error
    }

    response.status(308).redirect(`/r/${newBinPath}/all`);
  });

})

/*
- Post request to endpoint
  - Receive request
  - What data do we need for this route?
    - bin path
    - raw payload
    - headers
    - timestamp
    - origin ip
  - What do we do with this data?
    - Query database to obtain bin id associated with bin path (good opportunity for index)
      - if query returns empty, return response some status code (301?)
    - Insert into database bin id, raw payload, headers, timestamp, origin ip
      - After insert return 200 (?)
*/

// This is the endpoint for the webhook
app.post('/r/:bin_path', (request, response) => {
  const binPath = request.params.bin_path;
  const queryExistsString = `SELECT bin_id, bin_path FROM bins WHERE bin_path='${binPath}'`

  pool.query(queryExistsString, (error, results) => {
    console.log(results.rows);
    if (results.rows.length === 0) {
      response.status(404).json({status: "fail", message: "bin does not exist"})
    } else {
      
      binID = results.rows[0].bin_id;

      console.log(binID);

      const headers = JSON.stringify(request.headers);
      const timestamp = Date.now();
      const payload = request.body;
      // const originIp = request.ip;

      const queryInsertString = `INSERT INTO requests (headers, request_payload, bin_id, time_received, request_type) 
      VALUES ($1, $2, $3, (to_timestamp(${timestamp} / 1000.0)), 'POST')`;
      
      pool.query(queryInsertString, [headers, payload, binID], (error, results) => {
        if (error) {
          throw error
        }
    
        response.status(201).json({ status: "success", message: "New request added" })
      });
    }
  });
})

/*
- Inspect all post requests
  - Query the database for all the rows in Request table associated with the bin path
  - Return that shit, bitch 
  - Maybe template for display
*/

// Route that will display all the requests associated with a bin_path
// Will have to query DB and then use templating to generate HTML and return that as response
// This is when one of thise templating engines comes in

/*
- Get all requests from bin path
  - Query the database for the requests associated with the bin path
    - Query for request_type, request_origin_ip, time_received, headers, request_payload
  - We need to build an object that we can pass to handlebars

*/ 

app.get('/r/:bin_path/all', (request, response) => {
  console.log(request.params);
  const binPath = request.params.bin_path;
  const fullURL = `https://${request.hostname}/r/${binPath}`;

  console.log(fullURL);

  const queryString = `SELECT request_type, request_origin_ip, time_received, headers, request_payload FROM requests
  JOIN bins ON requests.bin_id = bins.bin_id
  WHERE bins.bin_path = '${binPath}';`

  pool.query(queryString, (error, results) => {
    const queryResults = JSON.stringify(results.rows, null, 2);

    const logs = { binPath: fullURL, queryResults: queryResults, }
    // console.log(logs);
    response.render('binRequest', logs);
    // response.status(200).json(results.rows);
  });

  // response.status(200).json("hello");
})
// let binTest = {
//   bin_id : 26
// }
// app.get('/r/:bin_path', (request, response) => {
//   response.render('binRequests', {binTest : binTest})
// })

// Test route just to make sure we can query the DB Charles made
app.get('/bins', (request, response) => {
  pool.query('SELECT * FROM bins', (error, results) => {
    if (error) {
      throw error
    }

    response.status(200).json(results.rows)
  })
})


app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})