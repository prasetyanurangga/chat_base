const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const url = "mongodb+srv://syntinen:rahasia@cluster0-2v386.mongodb.net/chat";

const connect = mongoose.connect(url, { useNewUrlParser: true });

module.exports = connect;
