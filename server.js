const express = require('express');
// const http = require('http').Server(app);
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 8443;
const INDEX = path.join(__dirname, 'index.html');

server = express()
    .use((req, res) => res.sendFile(INDEX))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

let clients = [];

io.use((socket, next) => {
    let token = socket.handshake.query.token;
    if (token !== 'abc') {
      console.log('wrong token');
      return next(new Error('authentication error'));
    }
    console.log("correct token");

    if(clients.length >= 2){
      return next(new Error('Too many clients. Max is 2'));
    }

    return next();
    
  });

io.on('connection', function(socket){
  let token = socket.handshake.query.token;
  console.log('a user connected with token: ' + token);
  if(!clients.includes(socket)){
    clients.push(socket);
  }else{
    console.log("weird! The socket was already in the client list. Didn't add it");
  }

  if(clients.length == 2){
    let isCaller = true;
    clients.forEach(element => {
      element.emit('clientsconnected', isCaller);
      isCaller = false;
    })
  }
  
  socket.on('disconnect', () => {
    console.log('client disconnected')
    let index = clients.indexOf(socket);
    clients.splice(index, 1);
  });
  
  socket.send('welcome');

  //TODO: make sure we are not fucking up context and are referring to a 'volatile' socket.
  socket.on('message', (data) =>{
    // console.log(socket);
    console.log(data);
    // console.log('message from ' + from + ' with ' + data);
    clients.forEach(element => {
      if(socket !== element){
        element.send(data);
      }
    });
  })

  socket.on('signalingmessage', (data) =>{
    // console.log(socket);
    console.log(data);
    // console.log('message from ' + from + ' with ' + data);
    clients.forEach(element => {
      if(socket !== element){
        element.emit('signalingmessage', data);
      }
    });
  })
});


