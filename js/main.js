// let pc;
let pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

let localStream;
let remoteStream;
let remoteVideo = document.getElementById("remote-video-stream");
let localVideo = document.getElementById("local-video-stream");

socket.on("connect", () => {
  console.log("connected to socket");
  socket.send("hello");
});

socket.on("message", message => {
  if (el) {
    el.innerHTML = "socket message: " + message;
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

//returns a promise that resolves if the remote description gets set
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

function handleRemoteStreamAdded(event) {
  console.log("Remote stream added. Event: ", event);
  remoteStream = event.stream;
  if (remoteVideo) {
    console.log("adding remote stream to video element");
    remoteVideo.srcObject = remoteStream;
  }
}

function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
}

//return a promise that resolves with a mediastream if we got media
function getLocalMedia() {
  return navigator.mediaDevices.getUserMedia(mediaConstraints).then(stream => {
    console.log("got local media stream");
    localStream = stream;
    if (localVideo) {
      localVideo.srcObject = localStream;
    }
    return localStream;

    //pc.addStream(stream); //deprecated!!!!!
    // localStream.getTracks().forEach((track) => {
    //   pc.addTrack(track, localStream);
    // });
  });
}

function addOutgoingStream(pc, stream) {
  console.log("adding outgoing stream:");
  console.log(stream);
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });
  //TODO: Should we do some kind of check here to see it's all good before we resolve??
  return pc;
}

//returns a promise that resolves if the offer was created and sent to the signal server.
function createOfferAndSend(pc, targetSocketId) {
  return pc.createOffer().then(desc => {
    console.log("setting local description");
    pc.setLocalDescription(desc);
    // .then((desc) => {
    //   console.log('sending offer to signaling server');
    //   console.log(desc);
    //   socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
    // });
    console.log("sending offer to signaling server");
    console.log(desc);
    socket.emit(
      "offer",
      JSON.stringify({ targetSocketId: targetSocketId, offer: desc })
    );
  });
}

//returns a promise that resolves if the answer was created and sent to the signal server.
function createAnswerAndSend(pc) {
  console.log("creating answer");
  return pc.createAnswer().then(desc => {
    console.log("setting local description");
    pc.setLocalDescription(desc);
    // .then((desc) => {
    //   console.log('sending answer to signaling server');
    //   socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
    // });
    console.log("sending answer to signaling server");
    console.log(desc);
    socket.emit("answer", JSON.stringify({ answer: desc }));
  });
}

function handleIceCandidate(evt) {
  console.log("ice candidate event");
  console.log(evt);
  if (evt.candidate) {
    console.log("sending ice to the signal server");
    socket.emit("ice", JSON.stringify({ candidate: evt.candidate }));
  } else {
    console.log("all ice candidates have been sent");
  }
}

let iceQueue = [];
function handleIncomingIce(pc, candidateString) {
  //make sure we don't try to add candidates before remoteDescription is set! Put them in queue and add them after remote has been set.
  console.log("ice candidate received");
  let candidate = new RTCIceCandidate(candidateString);
  if (!readyForIce) {
    console.log("Not ready for ice. Pushing the candidate to the queue");
    iceQueue.push(candidate);
    return;
  }
  //We are ready for ice. Let's add the candidate.
  pc
    .addIceCandidate(candidate)
    .then(console.log("added candidate to peer connection"))
    .catch(error =>
      console.log("failed to add candidate to peer connection" + error)
    );
}
