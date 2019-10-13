const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

const PORT = process.env.PORT || 5000;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

app.use(router);
app.use(cors());

io.on("connection", socket => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);

    socket.join(user.room);

    //let the users know they have joined a room
    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the room ${user.room}`
    });

    //let existing users in the room to know that new user have joined
    socket.broadcast.to(user.room).emit("message", {
      user: "admin",
      text: `${user.name}, has joined`
    });

    io.to(user.room).emit("roomData", {
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left the chat room!`
      });

      io.to(user.room).emit("roomData", {
        users: getUsersInRoom(user.room)
      });
    }
  });
});


server.listen(PORT, () => console.log(`server is running on port ${PORT}`));
