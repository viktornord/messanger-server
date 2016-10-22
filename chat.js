const jwt = require('jsonwebtoken');

module.exports = function (app) {
    const http = require('http').Server(app);
    const io = require('socket.io')(http);
    io.on('connection', (socket) => {
        const {handshake: {query: user}} = socket;
        console.log(`connected: ${user.username}:${user.userId}`);
        socket.broadcast.emit('client-connected', user);
        socket.on('get-connected-clients', () => {
            socket.emit('connected-clients', getConnectedUsers(user.userId));
        });
        socket.on('disconnect', () => {
            console.log(`disconnected: ${user.username}`);
            socket.broadcast.emit('client-disconnected', user.userId);
        });
        socket.on('send-message', (message) => {
            console.log(`new message from ${user.username}:`, message);
            const messageToSend =Object.assign(message, {author: user.username});
            if (message.partnerId) {
                const eventType = `receive-private-message-${Number(user.userId) + Number(messageToSend.partnerId)}`;
                console.log(`send private message from ${user.username}:${user.userId} to user with id ${messageToSend.partnerId}`);
                getConnectionByUserId(message.partnerId).emit(eventType, messageToSend);
                socket.emit(eventType, messageToSend)
            } else {
                io.emit(`receive-message`, messageToSend);
            }
        });
        socket.on('accepted-invitation', (partner) => {
            getConnectionByUserId(partner.userId).emit('accepted-invitation', user);
        });
        socket.on('set-up-room', (userIdTo) => {
            const
                partnerSocket = getConnectionByUserId(userIdTo),
                partner = partnerSocket.handshake.query;
            console.log(`a new chat is set up for ${user.username}:${user.userId} and ${partner.username}:${partner.userId}`);
            partnerSocket.emit('invitation-to-private', user);
        });
    });
    http.listen('5000');

    function verifyJWT(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, 'qwerty', {
                algorithms: ['HS512']
            }, (err, userData) => {
                if (err) {
                    console.log('err while verifying token on socket connection');
                }
                err ? reject(err) : resolve(userData);
            });
        })
    }


    function getConnectedUsers(currentUserId) {
        const users = [], connectedClients = io.sockets.connected;
        Object.keys(connectedClients).forEach(clientId => {
            const user = connectedClients[clientId].handshake.query;
            user.userId !== currentUserId && users.push(user);
        });
        return users;
    }

    function getConnectionByUserId(id) {
        const connectedClients = io.sockets.connected;
        let socketToFind;
        Object.keys(connectedClients).forEach(clientId => {
            const user = connectedClients[clientId].handshake.query;
            user.userId === id.toString() && (socketToFind = connectedClients[clientId]);
        });

        return socketToFind;
    }
};