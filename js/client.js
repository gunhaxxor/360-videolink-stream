//SIGNALING
let el = document.getElementById('socket-data');
let textReceiver = document.getElementById('text-receive-area');

robot = createPeerConection();
robot.onicecandidate = handleIceCandidate;

robot.ondatachannel = (evt) => {
  console.log('ondatachannel event:');
  console.log(evt);
  let receiveChannel = event.channel;
  if(receiveChannel.label === 'chatChannel'){
    console.log('chatChannel added');
    receiveChannel.onmessage = function(event){
      console.log('datachannel message received: ' + event.data);
      textReceiver.value = event.data;
    };

    textReceiver.oninput = () => {
      console.log('input trigger');
      var data = textReceiver.value;
      console.log('readyState is ' + receiveChannel.readyState);
      if(receiveChannel.readyState === 'open'){
        receiveChannel.send(data);
      }
    };
  }else if(receiveChannel.label === 'robotControlChannel'){
    console.log('robotControlChannel added');
    document.onkeydown = (event) => {
      console.log('keydown');
      let keyValue = event.key;
      if(!(keyValue === 'ArrowLeft' 
      || keyValue === 'ArrowUp' 
      || keyValue === 'ArrowRight' 
      || keyValue === 'ArrowDown')){
        return;
      }
      if(receiveChannel.readyState === 'open'){
        console.log('keypressed');
        receiveChannel.send(keyValue);
      }
    }
    document.onkeyup = (event) => {
      let keyValue = event.key;
      if(!(keyValue === 'ArrowLeft' 
      || keyValue === 'ArrowUp' 
      || keyValue === 'ArrowRight' 
      || keyValue === 'ArrowDown')){
        return;
      }
      if(receiveChannel.readyState === 'open'){
        receiveChannel.send('None');
      }
    }
  }
}

let mediaConstraints = {audio: false, video: true};
// let mediaPromise = getLocalMedia().then(addOutgoingStream);

socket.on('robotConnected', () => {
  console.log('robot is available according to server');
});

// socket.on('clientsconnected', () => {
//   console.log('clients connected. I\'m the client so let\'s initiate signaling');
//   // createOfferAndSend();
//   mediaPromise.then(createOfferAndSend);
// });


socket.on('offer', (data) => {
  el.innerHTML = 'RTC offer message: ' + data;
  if(msg = JSON.parse(data)){
    console.log('RTC offer message: ');
    console.log(msg);
    if(msg.offer){
      let handleOfferResult = handleOfferOrAnswer(robot, msg.offer).then(() => {
        console.log("offer handled. Continuing to create answer");
        return createAnswerAndSend(robot);
        // return mediaPromise.then(createAnswerAndSend);
      });
      console.log(handleOfferResult);
    }
  }
})

socket.on('ice', (data) => {
  let msg;
  el.innerHTML = 'RTC ice candidate received: ' + data;
  if(msg = JSON.parse(data)){
    console.log('RTC ice candidate received:');
    console.log(msg);
    if(msg.candidate){
      handleIncomingIce(robot, msg.candidate);
    }
  }
})

socket.on('signalingMessage', function(data) {
  let msg;
  el.innerHTML = 'socket signaling message received: ' + data;
  if(msg = JSON.parse(data)){
    console.log('socket signaling message received');
    console.log(msg);
  }
});