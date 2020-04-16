const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();

router.route("/").get((req, res, next) => {
    res.json('{"message":"test"}');
});

module.exports = router;
