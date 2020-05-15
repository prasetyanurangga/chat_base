const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const url = "mongodb+srv://syntinen:rahasia@cluster0-2v386.mongodb.net/chat?retryWrites=true&w=majority";

const connect = mongoose.connect(url);

module.exports = connect;
