//SIGNALING AND WEBRTC

var el = document.getElementById('socket-data');

createPeerConection();
let mediaConstraints = {audio: true, video: true};
let mediaPromise = getLocalMedia();

socket.on('clientsconnected', () => {
  console.log('clients connected. I\'m the camera so let\'s wait for somebody to send an offer');
  });

socket.on('signalingmessage', function(data) {
  let msg;
  el.innerHTML = 'socket signaling message received: ' + data;
  if(msg = JSON.parse(data)){
    console.log('socket signaling message received');
    console.log(msg);
    if(msg.offer){
      handleOfferOrAnswer(msg.offer).then(() => {
        //respond whenever the camera is accepted.
        mediaPromise.then(createAnswerAndSend());
      })
    }else if(msg.candidate){
      handleIncomingIce(msg.candidate);
    }
  }
});

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