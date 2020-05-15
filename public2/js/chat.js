var socket = io().connect('http://localhost', {port: 8080});
var messages = document.getElementById("messages");

(function() {

  socket.on('connect', function (data) {
    socket.emit('userConnected', { customId:'5eac4d496f15ae54a631f3ec' });
  });

  $("form").submit(function(e) {
    let li = document.createElement("li");
    e.preventDefault(); // prevents page reloading
    const senderId = "5eac4d496f15ae54a631f3ec";
    const reciverId = "5eac5a606f15ae54a631f3ef";
    socket.emit("chat message", { message :  $("#message").val(), sender : senderId, reciver : reciverId});

    // messages.appendChild(li).append($("#message").val());
    // let span = document.createElement("span");
    // messages.appendChild(span).append("by " + "Anonymous" + ": " + "just now");

    $("#message").val("");

    return false;
  });


})();

// fetching initial chat messages from the database
(function() {
  fetch("/chats")
    .then(data => {
      return data.json();
    })
    .then(json => {
      json.map(data => {
        let li = document.createElement("li");
        let span = document.createElement("span");
        messages.appendChild(li).append(data.message);
        messages
          .appendChild(span)
          .append("by " + data.sender + ": " + formatTimeAgo(data.createdAt));
      });
    });
})();

//is typing...

let messageInput = document.getElementById("message");
let typing = document.getElementById("typing");

//isTyping event
messageInput.addEventListener("keypress", () => {
  socket.emit("typing", { user: "Someone", message: "is typing..." });
});
socket.on("received", data => {
    console.log(data);
    let li = document.createElement("li");
    let span = document.createElement("span");
    var messages = document.getElementById("messages");
    messages.appendChild(li).append(data.message);
    messages.appendChild(span).append("by " + data.sender_name + ": " + "just now");
    
});
socket.on("notifyTyping", data => {
  typing.innerText = data.user + " " + data.message;
  console.log(data.user + data.message);
});

//stop typing
messageInput.addEventListener("keyup", () => {
  socket.emit("stopTyping", "");
});

socket.on("notifyStopTyping", () => {
  typing.innerText = "";
});
