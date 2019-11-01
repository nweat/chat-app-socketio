const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const Filter = require("bad-words")
const { addUser, getUser, getUsersInRoom, removeUser } = require("./utils/users")

const app = express()
const port = process.env.PORT || 3000
const server = http.createServer(app)
const io = socketio(server)

const { generateMessage, generateLocationMessage } = require("./utils/messages")

app.use(express.static(path.join(__dirname, "../public")))

io.on("connection", socket => {
  console.log("new web socket connection")

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room })
    if (error) {
      return callback(error)
    }

    socket.join(user.room) //can only be done on server side
    socket.emit("message", generateMessage("Admin", "Welcome")) // emit to ALL users
    socket.broadcast.to(user.room).emit("message", generateMessage("Admin", `${user.username} has joined`))
    //emit to all other users in specified room but not the user that joined
    callback()

    io.to(user.room).emit("roomData", {
      users: getUsersInRoom(user.room),
      room: user.room
    })

    //io.to.emit => sends event to only a particuar room
    //socket.broadcast.to().emit => sends event to particular room but not to user joining the room
  })

  socket.on("sendMessage", (msg, callback) => {
    const user = getUser(socket.id)

    const filter = new Filter()
    if (filter.isProfane(msg)) {
      return callback("Profanity not allowed")
    }
    io.to(user.room).emit("message", generateMessage(user.username, msg))
    callback()
  })

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`)
    )
    callback()
  })

  //event provided by socket.io to disconnect from
  socket.on("disconnect", () => {
    const user = removeUser(socket.id)
    if (user) {
      io.to(user.room).emit("message", generateMessage("Admin", `${user.username} left the room`))
      io.to(user.room).emit("roomData", {
        users: getUsersInRoom(user.room),
        room: user.room
      })
    }
  })
})

server.listen(port, () => {
  console.log("server started")
})
