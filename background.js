let socket = null;
let peerConnection = null;
let stream = null;
let currentServerUrl = '';
let currentRoomId = '';
let isConnected = false;
let isSharing = false;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'connect':
      connectToServer(message.serverUrl, message.roomId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates asynchronous response
      
    case 'startSharing':
      startScreenSharing()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'stopSharing':
      stopScreenSharing();
      sendResponse({ success: true });
      return false;
      
    case 'getStatus':
      sendResponse({ 
        connected: isConnected, 
        sharing: isSharing,
        serverUrl: currentServerUrl,
        roomId: currentRoomId
      });
      return false;
  }
});

// Connect to the signaling server
async function connectToServer(serverUrl, roomId) {
  if (socket) {
    socket.close();
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Dynamically load socket.io client from the server
      const script = document.createElement('script');
      script.src = `${serverUrl}/socket.io/socket.io.js`;
      script.onload = () => {
        try {
          socket = io(serverUrl);
          
          socket.on('connect', () => {
            console.log('Connected to signaling server');
            isConnected = true;
            currentServerUrl = serverUrl;
            currentRoomId = roomId;
            
            // Join the specified room
            socket.emit('join', { roomId });
            
            socket.on('joined', () => {
              console.log(`Joined room: ${roomId}`);
              resolve();
            });
            
            socket.on('error', (error) => {
              console.error('Socket error:', error);
              reject(new Error('Socket error: ' + error));
            });
            
            // Handle ICE candidate from the host
            socket.on('ice-candidate', handleIceCandidate);
            
            // Handle session description from the host
            socket.on('offer', handleOffer);
          });
          
          socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            isConnected = false;
            reject(new Error('Failed to connect to server'));
          });
          
          socket.on('disconnect', () => {
            console.log('Disconnected from server');
            isConnected = false;
            if (isSharing) {
              stopScreenSharing();
            }
          });
        } catch (error) {
          console.error('Error initializing socket:', error);
          reject(new Error('Failed to initialize socket connection'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load socket.io client'));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error connecting to server:', error);
      reject(error);
    }
  });
}

// Start screen sharing
async function startScreenSharing() {
  if (!isConnected) {
    throw new Error('Not connected to server');
  }
  
  try {
    // Request access to the screen
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor'
      },
      audio: false
    });
    
    // Create a new RTCPeerConnection
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    peerConnection = new RTCPeerConnection(configuration);
    
    // Add the screen stream to the peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          roomId: currentRoomId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
    };
    
    // Handle when tracks end (user stops sharing)
    stream.getVideoTracks()[0].onended = () => {
      stopScreenSharing();
    };
    
    // Create and send the offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('offer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
    
    isSharing = true;
    console.log('Started screen sharing');
    
  } catch (error) {
    console.error('Error starting screen sharing:', error);
    if (stream) {
      stopScreenSharing();
    }
    throw error;
  }
}

// Stop screen sharing
function stopScreenSharing() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (socket && isConnected) {
    socket.emit('stop-sharing', { roomId: currentRoomId });
  }
  
  isSharing = false;
  console.log('Stopped screen sharing');
}

// Handle incoming ICE candidate
function handleIceCandidate(data) {
  if (peerConnection && peerConnection.remoteDescription) {
    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      .catch(error => console.error('Error adding ICE candidate:', error));
  }
}

// Handle incoming offer from the host
async function handleOffer(data) {
  if (!peerConnection) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    peerConnection = new RTCPeerConnection(configuration);
  }
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('answer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
  } catch (error) {
    console.error('Error handling offer:', error);
  }
}
