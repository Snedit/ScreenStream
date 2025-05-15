document.addEventListener('DOMContentLoaded', function() {
  const connectBtn = document.getElementById('connectBtn');
  const startSharingBtn = document.getElementById('startSharingBtn');
  const stopSharingBtn = document.getElementById('stopSharingBtn');
  const serverInput = document.getElementById('serverInput');
  const roomInput = document.getElementById('roomInput');
  const statusIndicator = document.getElementById('statusIndicator');
  const connectionPanel = document.getElementById('connectionPanel');
  const sharingPanel = document.getElementById('sharingPanel');
  
  let connected = false;
  let sharing = false;
  
  // Check connection status on popup open
  chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
    if (response && response.connected) {
      connected = true;
      connectionPanel.classList.add('hidden');
      sharingPanel.classList.remove('hidden');
      updateStatus('connected', 'Connected to server');
      
      if (response.sharing) {
        sharing = true;
        startSharingBtn.disabled = true;
        stopSharingBtn.disabled = false;
        updateStatus('sharing', 'Actively sharing screen');
      }
    }
  });
  
  connectBtn.addEventListener('click', function() {
    const serverUrl = serverInput.value.trim();
    const roomId = roomInput.value.trim() || generateRoomId();
    
    if (!serverUrl) {
      alert('Please enter a valid server URL');
      return;
    }
    
    chrome.runtime.sendMessage({
      type: 'connect',
      serverUrl: serverUrl,
      roomId: roomId
    }, (response) => {
      if (response && response.success) {
        connected = true;
        connectionPanel.classList.add('hidden');
        sharingPanel.classList.remove('hidden');
        updateStatus('connected', 'Connected to server');
      } else {
        updateStatus('disconnected', 'Failed to connect: ' + (response?.error || 'Unknown error'));
      }
    });
  });
  
  startSharingBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'startSharing' }, (response) => {
      if (response && response.success) {
        sharing = true;
        startSharingBtn.disabled = true;
        stopSharingBtn.disabled = false;
        updateStatus('sharing', 'Actively sharing screen');
      } else {
        updateStatus('connected', 'Failed to start sharing: ' + (response?.error || 'User denied permission'));
      }
    });
  });
  
  stopSharingBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'stopSharing' }, (response) => {
      if (response && response.success) {
        sharing = false;
        startSharingBtn.disabled = false;
        stopSharingBtn.disabled = true;
        updateStatus('connected', 'Connected to server');
      }
    });
  });
  
  function updateStatus(type, message) {
    statusIndicator.className = 'status ' + type;
    statusIndicator.textContent = message;
  }
  
  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
  }
});