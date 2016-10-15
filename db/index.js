const pgp = require('pg-promise')();

class Database {
    constructor(connection) {
        this.connection = connection;
    }

    createUser({nickname, email, password}) {

        return this.connection.query(`insert into users (nickname, email, password) VALUES('${nickname}', '${email}', '${password}')`)
            .then(() => this.findUser(email));
    }

    findUser(email) {

        return this.connection.query(`SELECT * FROM users WHERE email = '${email}' LIMIT 1`).then(([user]) => user);
    }
}

module.exports = new Database(pgp({
    host: 'localhost',
    port: 5432,
    database: 'viktor'
}));