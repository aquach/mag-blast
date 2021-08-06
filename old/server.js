var http = require('http');

// npm install ws
var ws_lib = require('ws');

// npm install swarm
var Swarm = require('swarm');

require('./mag-blast-data');

// use file storage
var fileStorage = new Swarm.FileStorage('storage');

// create the server-side Swarm Host
var swarmHost = new Swarm.Host('swarm~nodejs', 0, fileStorage);

// create and start the HTTP server
var httpServer = http.createServer();
httpServer.listen(8080, function (err) {
    if (err) {
        console.warn('Can\'t start server. Error: ', err, err.stack);
        return;
    }
    console.log('Swarm server started at port 8000');
});

// start WebSocket server
var wsServer = new ws_lib.Server({ server: httpServer });

// accept incoming WebSockets connections
wsServer.on('connection', function (ws) {
    console.log('new incoming WebSocket connection');
    swarmHost.accept(new Swarm.EinarosWSStream(ws), { delay: 50 });
});
