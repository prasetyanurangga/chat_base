const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const url = "";

const connect = mongoose.connect(url);

module.exports = connect;
