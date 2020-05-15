const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    message: {
      type: String,
    },
    socket_id:{
      type : String
    },
    sender: {
      type : Schema.Types.ObjectId,
      ref : "User"
    },
    reciver: {
      type : Schema.Types.ObjectId,
      ref : "User"
    },
    to_all :{
      type : Boolean
    },
    is_read : {
      type : Boolean
    },
    files:[{
      type : Schema.Types.ObjectId,
      ref : "File"
    }],
  },
  {
    timestamps: true
  }
);



let Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
