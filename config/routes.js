"use strict";

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const clasificadosonline = require('../app/clasificadosonline');

module.exports = function(app) {

    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json({limit: '25mb', extended: true}));
    app.use(bodyParser.urlencoded({limit: '25mb', extended: true}));
    app.engine('.hbs', exphbs({extname: '.hbs'}));
    app.set('view engine', '.hbs');

    app.get('/', clasificadosonline.index);
    app.post('/clasificados-data', clasificadosonline.clasificadosData);
}