//SIGNALING
var el = document.getElementById('socket-data');

createPeerConection();

let mediaConstraints = {audio: true, video: true};
let mediaPromise = getLocalMedia();

socket.on('clientsconnected', () => {
  console.log('clients connected. I\'m the client so let\'s initiate signaling');
  mediaPromise.then(createOfferAndSend());
  });

socket.on('signalingmessage', function(data) {
    let msg;
    el.innerHTML = 'socket signaling message received: ' + data;
    if(msg = JSON.parse(data)){
      console.log('socket signaling message received');
      console.log(msg);
      if(msg.answer){
        handleOfferOrAnswer(msg.answer).then(() => {
          console.log('handled answer');
        })
      }else if(msg.candidate){
        handleIncomingIce(msg.candidate);
      }
    }
    });