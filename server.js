'use strict';

require('dotenv').config({silent: true});
const fs = require('fs');
const join = require('path').join;
const express = require('express');
const mongoose = require('mongoose');
const clasificadosonline = require('./app/clasificadosonline');

const models = join(__dirname, 'models');
var port = process.env.PORT || 3009;
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Bootstrap models
fs.readdirSync(models)
    .filter(file => ~file.search(/^[^\.].*\.js$/))
    .forEach(file => require(join(models, file)));

function listen() {

    let server = app.listen(port);

    console.log('Send Text Dash started on port ' + port + ' at ' + new Date().getHours());

};

var options = {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    promiseLibrary: global.Promise
};

mongoose.Promise = require('bluebird');

mongoose.connect(encodeURI(process.env.MONGOHQ_URL), options);

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'))
    .once('open', listen);

module.exports = app;
