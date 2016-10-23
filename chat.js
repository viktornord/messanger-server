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
            if (message.roomId) {
                console.log(`sent private message from ${user.username}:${user.userId} to room ${message.roomId}`);
                io.to(message.roomId).emit(`receive-private-message-${message.roomId}`, messageToSend);
            } else {
                io.emit(`receive-message`, messageToSend);
            }
        });
        socket.on('accepted-invitation', ({partner, roomId}) => {
            const partnerSocket = getConnectionByUserId(partner.userId);
            partnerSocket.emit('accepted-invitation', {partner: user, roomId});
            socket.join(roomId);
            partnerSocket.join(roomId);
            console.log(`a new chat is set up for ${user.username}:${user.userId} and ${partner.username}:${partner.userId}`);
        });
        socket.on('set-up-room', (userIdTo) => {
            const roomId = generateRoomId(userIdTo, user.userId);
            getConnectionByUserId(userIdTo).emit('invitation-to-private', {partner: user, roomId});
        });
        socket.on('leave-room', ({roomId, partnerId}) => {
            socket.leave(roomId);
            io.to(roomId).emit('partner-closed-room', user.username);
            getConnectionByUserId(partnerId).leave(roomId);
            console.log(`${user.username}:${user.userId} left the room ${roomId}`)
        });
        socket.on('get-partner', (userId) => {
            socket.emit('retrieve-partner', getConnectionByUserId(userId).handshake.query.username);
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

    function generateRoomId(...userIds) {

        return `room-${userIds.sort().join('-')}`;
    }
};