//SIGNALING AND WEBRTC

let el = document.getElementById('socket-data');

let textSender = document.getElementById('text-send-area');
let robotCommand = document.getElementById('robot-command');

// createPeerConection();
let peers = {};
let mediaPromises = [];
let mediaConstraints = { audio: false, video: true };
navigator.mediaDevices.enumerateDevices().then(devices => {
  console.log(devices);
  console.log(navigator.mediaDevices.getSupportedConstraints());
  devices.forEach(deviceInfo => {
    if (
      deviceInfo.kind === 'videoinput' &&
      !deviceInfo.label.includes('FullHD')
    ) {
      console.log('found video device: ' + deviceInfo.label);
      mediaPromises.push(
        getLocalMedia({
          audio: mediaConstraints.audio,
          video: { deviceId: deviceInfo.deviceId, frameRate: 15 }
        })
      );
    }
  });
});

socket.on('newClient', id => {
  console.log(
    'new client with id: ' +
      id +
      ".   Let's create a new peerConnection for this one"
  );
  peers[id] = {};
  peers[id].pc = createPeerConection();
  peers[id].pc.onicecandidate = evt => {
    robotHandleIceCandidate(id, evt);
  };

  console.log('peers: ');
  console.log(peers);

  console.log('adding datachannel');
  peers[id].chatChannel = addDataChannel(peers[id].pc, 'chatChannel');
  peers[id].chatChannel.onmessage = event => {
    console.log('chatChannel message received: ' + event.data);
    textSender.value = event.data;
  };
  textSender.oninput = () => {
    console.log('input trigger');
    var data = textSender.value;
    console.log('readyState is ' + peers[id].chatChannel.readyState);
    if (peers[id].chatChannel.readyState === 'open') {
      peers[id].chatChannel.send(data);
    }
  };

  peers[id].robotControlChannel = addDataChannel(
    peers[id].pc,
    'robotControlChannel'
  );
  peers[id].robotControlChannel.onmessage = event => {
    console.log('robotControlChannel message received: ' + event.data);
    let command = event.data;
    robotCommand.innerHTML = command;
  };

  let streamPromises = [];
  mediaPromises.forEach(streamPromise => {
    streamPromises.push(
      streamPromise.then(stream => addOutgoingStream(peers[id].pc, stream))
    );
  });
  Promise.all(streamPromises)
    // .then(stream => addOutgoingStream(peers[id].pc, stream))
    .then(resolveValues => createOfferAndSend(peers[id].pc, id));
});

socket.on('removeClient', id => {
  console.log('received request to remove client ' + id);
  if (peers[id]) {
    console.log('actually removes client ' + id);
    delete peers[id];
  }
});

socket.on('signalingMessage', function(data) {
  let msg;
  el.innerHTML = 'socket signaling message received: ' + data;
  if ((msg = JSON.parse(data))) {
    console.log('socket signaling message received');
    console.log(msg);
  }
});

socket.on('answer', data => {
  el.innerHTML = 'RTC signaling answer message: ' + data;
  if ((msg = JSON.parse(data))) {
    console.log('RTC signaling answer message received');
    console.log(msg);
    if (msg.fromSocketId && msg.answer) {
      let handleAnswerResult = handleOfferOrAnswer(
        peers[msg.fromSocketId].pc,
        msg.answer
      ).then(() => {
        console.log('answer handled. Continuing');
        //respond whenever the camera is accepted.
        // console.log(mediaPromise);
        // return createAnswerAndSend();
        // return mediaPromise.then(createAnswerAndSend);
      });
      console.log('handleAnswerResult: ');
      console.log(handleAnswerResult);
    }
  }
});

socket.on('ice', data => {
  let msg;
  el.innerHTML = 'RTC ice candidate: ' + data;
  if ((msg = JSON.parse(data))) {
    console.log('RTC ice candidate:');
    console.log(msg);
    if (msg.fromSocket && msg.candidate) {
      console.log();
      handleIncomingIce(peers[msg.fromSocket].pc, msg.candidate);
    }
  }
});

function robotHandleIceCandidate(targetSocketId, evt) {
  console.log('robot ice candidate event');
  console.log(evt);
  if (evt.candidate) {
    console.log('sending ice to the signal server!');
    let string = JSON.stringify({
      targetSocketId: targetSocketId,
      candidate: evt.candidate
    });
    console.log(string);
    socket.emit('ice', string);
  } else {
    console.log('all ice candidates have been sent');
  }
}

// let iceQueue = [];
// function handleIncomingIce(candidateString){
//   //make sure we don't try to add candidates before remoteDescription is set! Put them in queue and add them after remote has been set.
//   console.log('ice candidate received');
//   let candidate = new RTCIceCandidate(candidateString)
//   if(!readyForIce){
//     console.log('Not ready for ice. Pushing the candidate to the queue');
//     iceQueue.push(candidate);
//     return;
//   }
//   //We are ready for ice. Let's add the candidate.
//   pc.addIceCandidate(candidate)
//     .then(console.log('added candidate to peer connection'))
//     .catch(error => console.log('failed to add candidate to peer connection' + error));
// }

// //returns a promise that resolves if the remote description gets set
// let readyForIce = false;
// function handleOffer(offer){
//   return pc.setRemoteDescription(new RTCSessionDescription(offer))
//     .then(() => {
//       readyForIce = true;
//       //if we had any ice candidates queued up, let's add them.
//       if(iceQueue.length > 0){
//         iceQueue.forEach(candidate => {
//           pc.addIceCandidate(candidate);
//         });
//       }
//     });
//   // pc.createAnswer((desc) => {
//   //   console.log('got local description');
//   //   pc.setLocalDescription(desc);
//   //   socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
//   // })
// }

// socket.on('clientsconnected', () => {
//   console.log('clients connected. I\'m the camera so let\'s wait for somebody to send an offer');
// });

// function initiateWebRTC(){
//   pc = new RTCPeerConnection(pcConfig);
//   pc.onicecandidate = handleIceCandidate;
//   mediaPromise = getLocalMedia();
// }

// //return a promise that resolves if we got media and added it as a stream
// function getLocalMedia(){
//   return navigator.mediaDevices.getUserMedia(mediaConstraints)
//   .then((stream) => {
//     console.log('got stream');
//     pc.addStream(stream);
//   });
// };

// //returns a promise that resolves if the offer was created and sent to the signal server.
// function createOfferAndSend(){
//   return pc.createOffer()
//   .then((desc) => {
//     console.log('setting local description');
//     pc.setLocalDescription(desc).then((desc) => {
//       console.log('sending offer to signaling server');
//       socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
//     });
//   });
// };

// //returns a promise that resolves if the answer was created and sent to the signal server.
// function createAnswerAndSend(){
//   console.log('creating answer');
//   return pc.createAnswer()
//   .then((desc) => {
//     console.log('setting local description');
//     pc.setLocalDescription(desc).then((desc) => {
//       console.log('sending answer to signaling server');
//       socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
//     });
//   });
// };

// function handleIceCandidate(evt){
//   console.log('ice candidate event');
//   console.log(evt);
//   if(evt.candidate){
//     socket.emit('signalingmessage', JSON.stringify({'candidate': evt.candidate}));
//   }else{
//     console.log('all ice candidates have been sent');
//   }
// }
