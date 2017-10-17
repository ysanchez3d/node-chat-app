const path = require("path");
var fs = require('fs');
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const port = process.env.PORT || 3000;
const { generateMessage, generateLocationMessage } = require("./utils/message");
const { generateUser } = require("./utils/user");
const {isRealString} = require("./utils/validation");
const {Users} = require("./utils/users");

const publicPath = path.join(__dirname, "../public");
var app = express();

var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    var user = users.removeUser(socket.id);

    if(user) {
      io.to(user.room).emit("updateUserList", users.getUserList(user.room));
      io.to(user.room).emit("newMessage", generateMessage("Admin", `${user.name} has left`))
    }
  });


  socket.on("join", (params, callback) => {
    if(!isRealString(params.name) || !isRealString(params.room)) {
      return callback("Name and room are required!");
    }

    let user = generateUser(socket.id, params.name, params.room);
    socket.join(user.room);
    users.removeUser(user.id);
    users.addUser(user);

    io.to(params.room).emit("updateUserList", users.getUserList(user.room));

    socket.emit("newMessage", generateMessage("Admin", "Welcome to the chat app"));
    socket.broadcast.to(params.room).emit("newMessage", generateMessage("Admin", `${user.name} has joined`));


    callback();
  });

  socket.on("createMessage", (message, callback) => {
    var user = users.getUser(socket.id);

    if(user && isRealString(message.text)) {
      io.to(user.room).emit("newMessage", generateMessage(user.name, message.text));
    }
    
    callback();
  });

  socket.on("createLocationMessage", (coords, callback) => {
    io.emit("newLocationMessage", generateLocationMessage("User", coords.latitude, coords.longitude));
    callback();
  });


});


function readFiles(dirname, onFileContent, onError, callback) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(filename, content);
      });
    });

    callback();
  });
}



server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



