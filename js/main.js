// let pc;
let pcConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

let localStream;
let remoteStream;

let remoteVideoPool = document.getElementById('remote-video-pool');
let remoteVideo = document.getElementById('remote-video-stream');
let localVideoPool = document.getElementById('local-video-pool');
let localVideo = document.getElementById('local-video-stream');

socket.on('connect', () => {
  console.log('connected to socket');
  socket.send('hello');
});

socket.on('message', message => {
  if (el) {
    el.innerHTML = 'socket message: ' + message;
  }
});

function createPeerConection() {
  let pc = new RTCPeerConnection(pcConfig);
  // pc.onicecandidate = handleIceCandidate;
  pc.onaddstream = handleRemoteStreamAdded;
  pc.onremovestream = handleRemoteStreamRemoved;

  return pc;
}

function addDataChannel(pc, label) {
  return pc.createDataChannel(label, { reliable: true });
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added. Event: ', event);
  remoteStream = event.stream;
  if (remoteVideoPool) {
    let videoElement = document.createElement('video');
    videoElement.autoplay = true;
    remoteVideoPool.appendChild(videoElement);
    videoElement.srcObject = remoteStream;
  }
  // if (remoteVideo) {
  //   console.log("adding remote stream to video element");
  //   remoteVideo.srcObject = remoteStream;
  // }
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
  //TODO: Handle removal of stream and do some housekeeping
}

//return a promise that resolves with a mediastream if we got media
function getLocalMedia(constraints) {
  return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    console.log('got local media stream with id: ');
    console.log(stream.id);
    localStream = stream;
    if (localVideoPool) {
      let videoElement = document.createElement('video');
      videoElement.autoplay = true;
      localVideoPool.appendChild(videoElement);
      videoElement.srcObject = localStream;
    }
    return localStream;
  });
}

//resolves with the peer connection that the stream was added to
function addOutgoingStream(pc, stream) {
  console.log('adding outgoing stream:');
  console.log(stream);
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });
  //TODO: Should we do some kind of check here to see it's all good before we resolve??
  return pc;
}

//returns a promise that resolves if the offer was created and sent to the signal server.
function createOfferAndSend(pc, targetSocketId) {
  console.log('creating offer for pc: ');
  console.log(pc);
  return pc.createOffer().then(desc => {
    console.log('setting local description');
    pc.setLocalDescription(desc);
    // .then((desc) => {
    //   console.log('sending offer to signaling server');
    //   console.log(desc);
    //   socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
    // });
    console.log('sending offer to signaling server');
    console.log(desc);
    socket.emit(
      'offer',
      JSON.stringify({ targetSocketId: targetSocketId, offer: desc })
    );
  });
}

//returns a promise that resolves if the answer was created and sent to the signal server.
function createAnswerAndSend(pc) {
  console.log('creating answer');
  return pc.createAnswer().then(desc => {
    console.log('setting local description');
    pc.setLocalDescription(desc);
    // .then((desc) => {
    //   console.log('sending answer to signaling server');
    //   socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
    // });
    console.log('sending answer to signaling server');
    console.log(desc);
    socket.emit('answer', JSON.stringify({ answer: desc }));
  });
}

//returns a promise that resolves if the remote description gets set
//TODO: separate ice queues for each client
let readyForIce = false;
function handleOfferOrAnswer(pc, offerOrAnswer) {
  let setRemoteDescPromise = pc
    .setRemoteDescription(new RTCSessionDescription(offerOrAnswer))
    .then(() => {
      readyForIce = true;
      //if we had any ice candidates queued up, let's add them.
      if (iceQueue.length > 0) {
        iceQueue.forEach(candidate => {
          pc.addIceCandidate(candidate);
        });
      }
    });
  console.log(setRemoteDescPromise);
  return setRemoteDescPromise;
}

function handleIceCandidate(evt) {
  console.log('ice candidate event');
  console.log(evt);
  if (evt.candidate) {
    console.log('sending ice to the signal server');
    socket.emit('ice', JSON.stringify({ candidate: evt.candidate }));
  } else {
    console.log('all ice candidates have been sent');
  }
}

let iceQueue = [];
function handleIncomingIce(pc, candidateString) {
  //make sure we don't try to add candidates before remoteDescription is set! Put them in queue and add them after remote has been set.
  console.log('ice candidate received');
  let candidate = new RTCIceCandidate(candidateString);
  if (!readyForIce) {
    console.log('Not ready for ice. Pushing the candidate to the queue');
    iceQueue.push(candidate);
    return;
  }
  //We are ready for ice. Let's add the candidate.
  pc
    .addIceCandidate(candidate)
    .then(console.log('added candidate to peer connection'))
    .catch(error =>
      console.log('failed to add candidate to peer connection' + error)
    );
}
