NetworkView: Cross-Device Screen Sharing Via Browser Extension
This project implements a complete system for sharing screens between computers on the same network through a browser extension. A host computer can view screens/tabs/windows of client computers through a web interface.
System Architecture
The system consists of three main components:

Browser Extension for Client Devices: Allows users to share their screen/tab/window via WebRTC
Signaling Server: Facilitates WebRTC connection establishment between clients and host
Host Dashboard: Web interface that displays all shared screens in one place

Technical Components
1. Browser Extension (Client-side)
The extension implements:

Screen capture using navigator.mediaDevices.getDisplayMedia()
WebRTC peer connection setup
Socket.IO communication with the signaling server

Files:

manifest.json: Extension configuration
popup.html/popup.js: UI for connecting and controlling screen sharing
background.js: Background script for handling WebRTC connections
content.js: Content script for interacting with web pages

2. Signaling Server
A Node.js server that:

Manages room-based connections using Socket.IO
Relays WebRTC signaling information between clients and host
Provides connection management and status updates

Files:

server.js: Main server implementation with Socket.IO event handlers
package.json: Dependencies and scripts

3. Host Dashboard
A web interface that:

Connects to the signaling server as a host
Establishes WebRTC connections with all clients in a room
Displays multiple screen shares simultaneously
Provides controls for fullscreen view and stopping shares

Files:

public/index.html: Landing page
public/host.html: Main dashboard interface

Setup Instructions
Install and Configure Server

Create a new directory for the server
Copy the server code into server.js
Create a package.json file with the provided content
Install dependencies:
npm install

Create a public directory and add the host dashboard files
Start the server:
npm start
This will start the server on port 3000 by default.

Install Browser Extension on Client Devices

Open Chrome and navigate to chrome://extensions/
Enable "Developer mode"
Click "Load unpacked" and select the directory containing the extension files
The NetworkView extension will appear in your browser toolbar

Usage
Client-side (Screen sharing)

Click the NetworkView extension icon
Enter the server URL (e.g., http://localhost:3000 or the IP of your server)
Enter a room ID or use the auto-generated one
Click "Connect to Server"
Click "Start Sharing Screen"
Select the screen, window, or tab you want to share when prompted

Host-side (Viewing screens)

Navigate to the server URL in your browser (e.g., http://localhost:3000)
Click "Host Dashboard"
Enter the same room ID used by clients
Click "Connect"
All shared screens from clients in the same room will appear on the dashboard

Security Considerations

All screen sharing requires explicit user permission through the browser's built-in confirmation dialog
Room IDs provide basic access control
No persistent data is stored on the server
All communication is peer-to-peer once the initial connection is established

Limitations

Requires all devices to be on the same network or have access to the same server
Browser extension must be installed on all client devices
No authentication system beyond room IDs
Limited to browser-based content (cannot share entire desktop in some configurations)

Future Enhancements

Implement secure authentication
Add end-to-end encryption for signaling
Support recording functionality
Enable audio sharing
Add remote control capabilities
Implement screen annotation tools