//require the express module
const express = require("express");  
var mongoose = require('mongoose');
var fs = require('fs');
const app = express();
const bodyParser = require("body-parser");

//require the http module
const http = require("http").Server(app);


const sio = require("socket.io"); // require the socket.io module

const port = 8080; // port server and socket io


app.use(bodyParser.json()); // bodyparser middleware

app.use(express.json()) // for parsing application/json

app.use(express.urlencoded({ extended: true }))


//set the express.static middleware
app.use('/public',express.static(__dirname + "/public"));
app.use('/public2',express.static(__dirname + "/public2"));


io = sio(http); //integrating socketio


const Chat = require("./models/Chat"); // Model For Chat Collection
const File = require("./models/File"); // Model For File Collection
const Users = require("./models/User"); // Model For User Collection
const connect = require("./dbconnect"); // Require for connect to database


// When User Connecting to Socket IO Server
io.on("connection", function(socket) {
  console.log("user connected");
  
  // when the user connects successfully the user
  socket.on('userConnected', function(data){
      var clientInfo = new Object();

      // the user will send the user id
      clientInfo.customId = data.customId;

      //the user will send the socket id
      clientInfo.clientId = socket.id;

      //the server will send to all users that the user is online (connected to the socket io server)
      socket.broadcast.emit('online', data.customId);

      //The server will change user data (socket id) with the latest socket id
      Users.findOneAndUpdate({ _id : clientInfo.customId}, {socket_id : clientInfo.clientId, is_online : true}, {new : true}).then(users => {
          console.log(users);
      });
  });

  // when the user disconnect successfully the user
  socket.on("disconnect", function(data) {
    console.log("disconnect");
    console.log(socket.id);

    //the server will send to all users that the user is offline (disconnected to the socket io server)
    Users.findOneAndUpdate({ socket_id : socket.id}, {socket_id : '', is_online : false}, {new : true}).then(users => {
        socket.broadcast.emit('offline', users._id);
        console.log(users._id);
    });
  });

  // when the user types a message
  socket.on("typing", function(data) {

    //The server looks for socket id from the database based on the user id of the user who is chatting with it
    Users.findOne({'_id': data.id}, (err, user) => {

      //the io socket server sends a notification that the user is typing in to a user who is chatting with that user
      socket.volatile.to(user.socket_id).emit("notifyTyping"); 

    });
  });

  // when the user stop types a message
  socket.on("stopTyping", function(data) {

    //The server looks for socket id from the database based on the user id of the user who is chatting with it
    Users.findOne({'_id': data.id}, (err, user) => {

      //the io socket server sends a notification that the user is stop typing in to a user who is chatting with that user
      socket.volatile.to(user.socket_id).emit("notifyStopTyping");    
    });
  });

  
  // when the message has been read
  socket.on("hasRead", function(data) {
    //The server looks for sender id from the database based on the message id
    Chat.findOneAndUpdate({ _id : data.message_id}, {is_read : true}, {new : true}).then(chatss => {

      //The server looks for socket id from the database based on the sender id
      Users.findOne({ _id : chatss.sender}).then(userss => {

        //the io socket server sends a notification that the user has read the message in to a user who is chatting with that user
        socket.to(userss.socket_id).emit("notifyRead", data.message_id);
      });
    });
  });

  //when a user sends a message
  socket.on("chat message", function(data, callback) {

    //contents of the message sent
    var msg = data.message;

    //user id of the sender of the message
    var senderId = data.sender;

    //user id recipient message
    var reciverId = data.reciver;

    //data file sent by the user
    var dataFile = data.data_file;

    //the name of the file sent by the user
    var nameFile = data.name_file;

    //file size sent by the user
    var sizeFile = data.size_file;

    //file extension sent by the user
    var extFile = data.ext_file;

    connect.then(db => {

      //save chat data to database
      let chatMessage = new Chat({ message: msg, sender: senderId, reciver : reciverId, to_all : false, is_read : false});
      chatMessage.save().then(chats => {
        

        //if the user embeds a file then the data file will be stored in the database
        if(dataFile != null)
        {

          //save file data to database
          let fileMessage = new File({name: nameFile, extension: extFile, size : sizeFile, data_binary : dataFile});
          fileMessage.save().then(filesss => {
            
            callback(JSON.stringify({ chatsid : chats._id, filesid : filesss._id}));
            let files = chats.files;
            files.push(filesss._id);

            //link the id file with the chat id
            Chat.findOneAndUpdate({ _id : chats._id}, {files : files}, {new : true}).then(chatss => {
              // insertFile(chats._id);
            });

            Users.findOneAndUpdate({ _id : reciverId}, {last_message : chats._id}, {new : true}).then(newUser => {
                console.log(newUser);
                
                // retrieve chat data
                Chat.aggregate([
                {
                 $lookup:
                   {
                     from: "files",
                     let: { files: "$files" },
                     pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$files"] }}},
                        { $project: { name: 1, extension: 1 }}
                      ],
                     as: "data_file"
                   }
                  },
                  {
                 $lookup:
                   {
                     from: "users",
                     localField: "sender",
                     foreignField: "_id",
                     as: "data_sender"
                   }
                  },  
               { $match : {_id : newUser.last_message} },
                { $sort : { updatedAt : 1 } },  
                ], (err, chats) => {
                  //the io socket server sends chats to the destination user
                  sendMessagetoUser(newUser.socket_id, chats, reciverId, senderId);
                });
            });
          });
        }
        else
        {
          Users.findOneAndUpdate({ _id : reciverId}, {last_message : chats._id}, {new : true}).then(newUser => {

            callback(JSON.stringify({ chatsid : chats._id, filesid : ""}));
                // retrieve chat data
                Chat.aggregate([
                {
                 $lookup:
                   {
                     from: "files",
                     let: { files: "$files" },
                     pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$files"] }}},
                        { $project: { name: 1, extension: 1 }}
                      ],
                     as: "data_file"
                   }
                  },
                  {
                 $lookup:
                   {
                     from: "users",
                     localField: "sender",
                     foreignField: "_id",
                     as: "data_sender"
                   }
                  },  
               { $match : {_id : newUser.last_message} },
                { $sort : { updatedAt : 1 } },  
                ], (err, chats) => {

                  //the io socket server sends chats to the destination user
                  sendMessagetoUser(newUser.socket_id, chats, reciverId, senderId);
                });
            });
        }
      });
    });
  });

  function sendMessagetoUser(socket_id,chats, reciverid, senderid)
  {

      const ObjectId = mongoose.Types.ObjectId;
    Chat.aggregate([
   { $match : { $and : [{ is_read : false }, { sender : ObjectId(senderid) }, {reciver : ObjectId(reciverid)}] } },
      {
        $group: {
            _id: "$sender",
            count : { $sum : 1 }
        },    
       },
      
    ], function(err, users){
      chats.push(users[0]);
      console.log(chats);
      socket.volatile.to(socket_id).emit("received", JSON.stringify(chats));  
    });
    //socket.volatile.to(socket_id).emit("received", JSON.stringify(chats));
  }
});





http.listen(port, () => {
  console.log("Running on Port: " + port);
});



app.post("/login", function(req, res){
    Users.findOne({'email': req.body.email}, (err, user) => {
      if(!user) res.json({message : 'Login Failed', data : [],
          success: false})

      user.comparePassword(req.body.password, (err, isMatch) => {
        if(!isMatch) return res.status(404).json({
          message : 'Password Wrong',
          data : [],
          success: false,
        });

        res.status(200).json({message : "Login Success", data : user, success : true});  
      })
    })
});

app.post("/get_all_chat", function(req, res){

  let filter_text = req.body.filter_text == null ? "" : req.body.filter_text;
  let id = req.body.id;


  const ObjectId = mongoose.Types.ObjectId;
  Chat.aggregate([
    
      {
     $lookup:
       {
         from: "users",
         let: { sender: "$sender" },
         pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$sender"] }}},
            { $project: { email: 1, username: 1 , is_online : 1}}
          ],
         as: "data_sender"
       }
      },  
    { $match : { 
      "$or": [ 
        { 
          "data_sender": 
          { 
            $elemMatch: 
            { 
              email: new RegExp(filter_text), 
            } 
          } 
        },
        { 
          "data_sender": 
          { 
            $elemMatch: 
            { 
              username: new RegExp(filter_text), 
            } 
          } 
        },
        { 
          message : new RegExp(filter_text) 
        }
      ] } },
   { $match : { reciver : ObjectId(id) } },
    { $sort : { updatedAt : -1 } },  
      {
        $group: {
            _id: "$sender",
            chats : { $push : {
              _id : "$_id", 
              message : "$message", 
              updatedAt : "$updatedAt",
              data_sender : "$data_sender", 
              data_file : "$data_file"
            } 
            },
            count : { $sum : {
                 $cond: { if: { $eq: ["$is_read", false] }, then: 1, else: 0 }
               } }
        },    
       },
      
    ], function(err, users){
      console.log(err);
      if(!users) res.status(400).json({success : false})
      res.status(200).json({success : true, data : users});
      
    });
});

app.post("/get_file", function(req, res){
  let id = req.body.id;
  console.log(id);
  const ObjectId = mongoose.Types.ObjectId;
  File.aggregate([
  {
    $match : {_id: ObjectId(id)}
  }
    ], (err, files) => {

  console.log(files);
      if(!files) res.status(400).json({success : false})
      res.status(200).json({success : true, data : files});
    });
});

app.post("/get_chat", function(req, res){

  const ObjectId = mongoose.Types.ObjectId;

  console.log(req.body);

  Chat.updateMany(
      {
        $and : [
           { sender : ObjectId(req.body.senderid) },
           { reciver : ObjectId(req.body.reciverid) },
           { is_read : false }
        ] 
      },
      {
        $set : { is_read: true }
      }
   ).then(chatss => {
     console.log(chatss);
   });
  Chat.findOne({ _id : ObjectId(req.body.reciverid)}).then(chatss => {
    Chat.aggregate([
    {
     $lookup:
       {
         from: "files",
         let: { files: "$files" },
         pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$files"] }}},
            { $project: { name: 1, extension: 1 }}
          ],
         as: "data_file"
       }
      },
      {
     $lookup:
       {
         from: "users",
         localField: "sender",
         foreignField: "_id",
         as: "data_sender"
       }
      },  
   { $match : { 
      $or : [
        {
          $and : [
             { sender : ObjectId(req.body.senderid) },
             { reciver : ObjectId(req.body.reciverid) }
          ] 
        },
        {
          $and : [
             { reciver : ObjectId(req.body.senderid) },
             { sender : ObjectId(req.body.reciverid) }
          ] 
        }
      ]
    } },
    { $sort : { updatedAt : 1 } },  
    ], (err, chats) => {
      if(!chats) res.status(400).json({success : false, data : []})
      res.status(200).json({success : true, data : chats});
      
    });
  });
});

app.post("/get_all_user", function(req, res){
  let filter_text = req.body.filter_text == null ? "" : req.body.filter_text;
  let user_id = req.body.user_id;
  const ObjectId = mongoose.Types.ObjectId;
  Users.aggregate(
    [ 
     { 
      $match : 
      { 
        $and : [
          {
            $or: [ 
              { 
                email: new RegExp(filter_text) 
              }, 
              { 
                username: new RegExp(filter_text), 
              } 
            ] 
          },
          { 
            _id : 
            { 
              $ne : ObjectId(user_id)
            } 
          }
        ]
      } 
    },
    { 
      $sort : 
      { 
        updatedAt : 1 
      } 
    },  
   ], (err, users) => {
     console.log(users);

     console.log(err);
      if(!users) res.status(400).json({success : false, data : []});

      res.status(200).json({success : true, data : users});
    });
});
  

app.post("/register", function(req, res){
    let user = new Users({
      email : req.body.email,
      password : req.body.password,
      username : req.body.username
    });
    console.log(req.body);
    user.save((err, response) => {
      if(!response) res.status(400).json({success : false, data : []});

      res.status(200).json({success : true, data : response});
    })
});