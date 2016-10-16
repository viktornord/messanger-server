const jwt = require('jsonwebtoken');

module.exports = function (app) {
    const http = require('http').Server(app);
    const io = require('socket.io')(http);
    io.on('connection', (socket) => {
        const {handshake: {query: {username}}} = socket;
        console.log(`connected: ${username}`);
        socket.broadcast.emit('client-connected', username);
        const us = getConnectedUsers(io.sockets.connected, username);
        socket.emit('connected-clients', us);
        socket.on('disconnect', () => {
            console.log(`disconnected: ${username}`);
            socket.broadcast.emit('client-disconnected', username);
        });
        socket.on('send-message', (message) => {
            console.log(`new message from ${username}:`, message);
            io.emit('receive-message', Object.assign(message, {author: username}));
        });
    });
    http.listen('5000');
};

function verifyJWT(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, 'qwerty', {
            algorithms: ['HS512']
        }, (err, {userId, username}) => {
            if (err) {
                console.log('err while verifying token on socket connection');
            }
            err ? reject(err) : resolve(username);
        });
    })
}


function getConnectedUsers(connectedClients, currentUsername) {
    const users = [];
    Object.keys(connectedClients).forEach(clientId => {
        const username = connectedClients[clientId].handshake.query.username;
        username !== currentUsername && users.push(username);
    });
    return users;

}