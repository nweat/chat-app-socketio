const socket = io()

const $msgForm = document.querySelector("#msgForm")
const $msgFormInput = $msgForm.querySelector("input")
const $msgFormButton = $msgForm.querySelector("button")
const $sendLocationButton = document.querySelector("#send-location")
const $messages = document.querySelector("#messages")

const messageTemplate = document.querySelector("#message-template").innerHTML
const locationTemplate = document.querySelector("#loc-message-template").innerHTML
const sideBarTemplate = document.querySelector("#sidebar-template").innerHTML

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoScroll = () => {
  const $newMessage = $messages.lastElementChild
  const newMessageStyles = getComputedStyle($newMessage)
  const newMessageMargin = parseInt(newMessageStyles.marginBottom)
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
  const visibleHeight = $messages.offsetHeight
  const containerHeight = $messages.scrollHeight
  const scrollOffset = $messages.scrollTop + visibleHeight

  //make sure user is at the bottom
  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight
  }
}

socket.on("roomData", ({ users, room }) => {
  const html = Mustache.render(sideBarTemplate, {
    users,
    room
  })
  document.querySelector("#sidebar").innerHTML = html
})

socket.on("locationMessage", location => {
  console.log(location)
  const html = Mustache.render(locationTemplate, {
    username: location.username,
    url: location.url,
    createdAt: moment(location.createdAt).format("h:mm a")
  })
  $messages.insertAdjacentHTML("beforeend", html)
  autoScroll()
})

socket.on("message", msg => {
  console.log(msg)
  const html = Mustache.render(messageTemplate, {
    username: msg.username,
    message: msg.text,
    createdAt: moment(msg.createdAt).format("h:mm a")
  })
  $messages.insertAdjacentHTML("beforeend", html)
  autoScroll()
})

$msgForm.addEventListener("submit", e => {
  e.preventDefault()
  $msgFormButton.setAttribute("disabled", "disabled")

  const msg = e.target.elements.msg.value
  $msgFormButton.removeAttribute("disabled")
  $msgFormInput.value = ""
  $msgFormInput.focus()

  socket.emit("sendMessage", msg, ack => {
    if (ack) {
      return console.log(ack)
    }
    console.log("From server: ")
  })
})

$sendLocationButton.addEventListener("click", e => {
  e.preventDefault()

  $sendLocationButton.setAttribute("disabled", "disabled")

  if (!navigator.geolocation) {
    return alert("Geolocatoin not supported")
  }

  navigator.geolocation.getCurrentPosition(position => {
    console.log(position.coords.latitude)
    socket.emit("sendLocation", { latitude: position.coords.latitude, longitude: position.coords.longitude }, () => {
      $sendLocationButton.removeAttribute("disabled")
      console.log("Location shared")
    })
  })
})

socket.emit("join", { username, room }, error => {
  if (error) {
    alert(error)
    location.href = "/"
  }
})
