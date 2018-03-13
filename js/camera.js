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
