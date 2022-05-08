const express = require("express");
const favicon = require("serve-favicon");
const path = require("path");
const bodyParser = require("body-parser"); // middleware that parses incoming requests

const app = express();

const { pool } = require("./config"); // Enables connection to postgres
const cors = require("cors"); // Helps us avoid cors issues
const port = 3005;

app.set("view engine", "hbs"); // handlebars

app.use(favicon(path.join(__dirname, "public/images", "favicon.png")));

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(cors());

function binPath(len) {
  return [...Array(len)]
    .map(() => Math.random().toString(36)[2])
    .join("")
    .toUpperCase();
}

app.get("/", (request, response) => {
  response.render("index");
});

// Creation of new bin
app.post("/createBin", (request, response) => {
  const newBinPath = binPath(8);
  const timestamp = Date.now();
  const queryString = `INSERT INTO bins (bin_path, creation_time) VALUES ($1, (to_timestamp(${timestamp} / 1000.0)))`;

  pool.query(queryString, [newBinPath], (error) => {
    if (error) {
      throw error;
    }

    response.status(308).redirect(`/r/${newBinPath}/all`);
  });
});

// This is the endpoint for the webhook
app.post("/r/:bin_path", (request, response) => {
  const binPath = request.params.bin_path;
  const queryExistsString = `SELECT bin_id, bin_path FROM bins WHERE bin_path='${binPath}'`;

  pool.query(queryExistsString, (error, results) => {
    console.log(results.rows);
    if (results.rows.length === 0) {
      response
        .status(404)
        .json({ status: "fail", message: "bin does not exist" });
    } else {
      let binID = results.rows[0].bin_id;

      console.log(binID);

      const headers = JSON.stringify(request.headers);
      const timestamp = Date.now();
      const payload = request.body;
      const originIp = request.ip;

      console.log(originIp);

      const queryInsertString = `INSERT INTO requests (headers, request_payload, bin_id, time_received, request_type) 
      VALUES ($1, $2, $3, (to_timestamp(${timestamp} / 1000.0)), 'POST')`;

      pool.query(queryInsertString, [headers, payload, binID], (error) => {
        if (error) {
          throw error;
        }

        response
          .status(201)
          .json({ status: "success", message: "New request added" });
      });
    }
  });
});

app.get("/r/:bin_path/all", (request, response) => {
  console.log(request.params);
  const binPath = request.params.bin_path;
  const fullURL = `https://${request.hostname}/r/${binPath}`;

  console.log(fullURL);

  const queryString = `SELECT request_type, request_origin_ip, time_received, headers, request_payload FROM requests
  JOIN bins ON requests.bin_id = bins.bin_id
  WHERE bins.bin_path = '${binPath}' ORDER BY time_received DESC;`;

  pool.query(queryString, (error, results) => {
    const queryResults = JSON.stringify(results.rows, null, 2);
    const logs = { binPath: fullURL, queryResults: queryResults };
    response.render("binRequest", logs);
    // response.status(200).json(results.rows);
  });
});

// Test route just to make sure we can query the DB
app.get("/bins", (request, response) => {
  pool.query("SELECT * FROM bins", (error, results) => {
    if (error) {
      throw error;
    }

    response.status(200).json(results.rows);
  });
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
