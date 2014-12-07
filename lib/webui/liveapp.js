var path = require('path'),
    fs = require('fs'),
    rimraf = require('rimraf');

var routes = require('./routes');

var _socket = null;
var config, logger, util;

var express = require('express');
var liveapp = express();

var publicPath = __dirname + '/public',
    viewPath = __dirname + '/views';

// create tmp folder

function createSocketFolder() {
    var _path = path.join(config.global.tempDir, _socket.id);
    if (!util.exists(_path)) {
        util.mkdirpSync(_path);
    }
};

function removeSocketFolder() {
    var path = config.global.tempDir;
    try {
        rimraf.sync(path);
    } catch (e) {

    }
};

liveapp.set('views', viewPath);
liveapp.set('basepath', publicPath);
liveapp.use(express.static(publicPath));
liveapp.use(express.json());
liveapp.use(express.urlencoded());
liveapp.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
}));

liveapp.use(liveapp.router);
routes(liveapp);


liveapp.run = function() {
    config = require('../livepool/config');
    logger = require('../livepool/logger');
    util = require('../livepool/util');
    proxy = require('../livepool/proxy');
    var uiport = config.global.uiport;
	var uihost = config.global.uihost;

    var server = liveapp.listen(uiport, uihost);
    liveapp.io = require('socket.io').listen(server);

    // browser connection -> keep only one socket connection
    liveapp.io.sockets.on('connection', function(socket) {
        console.log('connect:' + socket.id);
        _socket = socket;
        exports.socket = _socket;
        createSocketFolder();
        if (config.settings.proxy) {
            proxy.setProxy(config.global.host, config.global.http);
        }

        socket.on('disconnect', function(socket) {
            console.log('disconnect:' + _socket.id);
            removeSocketFolder();
            if (config.settings.proxy) {
                proxy.initProxy();
            }
            delete _socket;
        });

        socket.emit('config', config.settings);
    });

    logger.log('liveapp ui'.cyan + ' is ready, host: ' + uihost + ', port: ' + String(uiport).cyan);
};

// publish
exports.app = liveapp;
