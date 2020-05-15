var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
var UserSchema = new mongoose.Schema({
  last_message : {
    type : Schema.Types.ObjectId,
    ref : "Chat"
  },
  socket_id: {
    type : String,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  is_online : {
    type : Boolean
  },

});


UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, function (err, hash){
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  })
});

UserSchema.methods.comparePassword = function(candidatePassword, checkpassword)
{
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch){
    if(err) return checkpassword(err);
    checkpassword(null, isMatch)
  })
}


var User = mongoose.model('User', UserSchema);
module.exports = User;