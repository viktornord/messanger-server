const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const db = require('../db');

router.post('/auth/register', function (req, res, next) {
    db.createUser(req.body)
        .then(user => createJWT(user.id))
        .then(token => res.end(token))
        .catch((err) => {
            console.log(err);
            res.status(500).json({error: 'error while registration a new user'});
        });
});

router.post('/auth/login', function (req, res, next) {
    db.findUser(req.body.email)
        .then(user => {
            if (user && user.password === req.body.password) {
                createJWT(user.id).then(token => res.end(token));
            } else {
                res.status(401).end();
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({error: 'error while signing in'});
        });
});

module.exports = router;


function createJWT(userId) {

    return new Promise((resolve, reject) => {
        jwt.sign({userId}, 'qwerty', {algorithm: 'HS512', expiresIn: '7d'}, (err, token) => {
            err && console.log(err);
            err ? reject(err) : resolve(token);
        });
    });

}
