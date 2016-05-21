'use strict'

let ex = require('express')
  , m = require('mongodb').MongoClient
  , r = ex.Router()
  , app = ex();

require('./conf/express')(app);

const URL = 'mongodb://localhost:27017/gamedb';

app.use('/api', (req, res, next) => {
    m.connect(URL, (err, db) => {
        req.db = db;
        next();
    });
});

app.use('/api/app', require('./routes/app')(r));

require('./middlwares/error')(app);


const port = process.env.PORT || 3004;
app.listen(port, () => console.log(`Listing on ${port}`));
