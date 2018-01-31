let pc;
let pcConfig = {
'iceServers': [{
  'urls': 'stun:stun.l.google.com:19302'
}]
};

socket.on('connect', () => {
  console.log('connected to socket');
  socket.send('hello');
});

socket.on('message', message => {
  el.innerHTML = 'socket message: ' + message;
});

function createPeerConection(){
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = handleIceCandidate;
  pc.onaddstream = handleRemoteStreamAdded;
  pc.onremovestream = handleRemoteStreamRemoved;
  // mediaPromise = getLocalMedia();
}

let iceQueue = [];
function handleIncomingIce(candidateString){
  //make sure we don't try to add candidates before remoteDescription is set! Put them in queue and add them after remote has been set.
  console.log('ice candidate received');
  let candidate = new RTCIceCandidate(candidateString)
  if(!readyForIce){
    console.log('Not ready for ice. Pushing the candidate to the queue');
    iceQueue.push(candidate);
    return;
  }
  //We are ready for ice. Let's add the candidate.
  pc.addIceCandidate(candidate)
    .then(console.log('added candidate to peer connection'))
    .catch(error => console.log('failed to add candidate to peer connection' + error));
}

//returns a promise that resolves if the remote description gets set
let readyForIce = false;
function handleOfferOrAnswer(offerOrAnswer){
  return pc.setRemoteDescription(new RTCSessionDescription(offerOrAnswer))
    .then(() => {
      readyForIce = true;
      //if we had any ice candidates queued up, let's add them.
      if(iceQueue.length > 0){
        iceQueue.forEach(candidate => {
          pc.addIceCandidate(candidate);
        });
      }
    });
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added. Event: ', event);
  // remoteStream = event.stream;
  // remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

//return a promise that resolves if we got media and added it as a stream
function getLocalMedia(){
  return navigator.mediaDevices.getUserMedia(mediaConstraints)
  .then((stream) => {
    console.log('got stream');
    pc.addStream(stream);
  });
};

//returns a promise that resolves if the offer was created and sent to the signal server.
function createOfferAndSend(){
  return pc.createOffer()
  .then((desc) => {
    console.log('setting local description');
    pc.setLocalDescription(desc)
      // .then((desc) => {
      //   console.log('sending offer to signaling server');
      //   console.log(desc);
      //   socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
      // });
    console.log('sending offer to signaling server');
    console.log(desc);
    socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
  });
};

//returns a promise that resolves if the answer was created and sent to the signal server.
function createAnswerAndSend(){
  console.log('creating answer');
  return pc.createAnswer()
  .then((desc) => {
    console.log('setting local description');
    pc.setLocalDescription(desc)
      // .then((desc) => {
      //   console.log('sending answer to signaling server');
      //   socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
      // });
    console.log('sending answer to signaling server');
    console.log(desc);
    socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
  });
};

function handleIceCandidate(evt){
  console.log('ice candidate event');
  if(evt.candidate){
    console.log('sending ice to the signal server');
    socket.emit('signalingmessage', JSON.stringify({'candidate': evt.candidate}));
  }else{
    console.log('all ice candidates have been sent');
  }
}