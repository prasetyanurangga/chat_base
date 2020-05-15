const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileSchema = new Schema(
  {
    data_binary: {
      type: Buffer
    },
    name: {
      type: String
    },
    extension: {
      type: String
    },
    size:{
      type : Number
    },

  },
  {
    timestamps: true
  }
);

let File = mongoose.model("File", fileSchema);

module.exports = File;
