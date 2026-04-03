const mysql = require("mysql2")

const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "",
    database: "nexora_ponto"

})

module.exports = db