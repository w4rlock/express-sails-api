'use strict'; 

let express = require('express')
	, path = require('path')
	, favicon = require('serve-favicon')
	, bodyParser = require('body-parser')
	, logger = require('morgan')
;

exports = module.exports = (app) => {

	let env = process.env.NODE_ENV || 'development';
	app.locals.ENV = env;
	app.locals.ENV_DEVELOPMENT = env == 'development';

	// view engine setup
	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'jade');

	// app.use(favicon(__dirname + '/public/img/favicon.ico'));
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(express.static(path.join(__dirname, '../public')));

}
