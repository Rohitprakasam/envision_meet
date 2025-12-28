const WebSocket = require('ws');

// Set up the WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log('Braille WebSocket Server is running on ws://localhost:8080');

// Broadcast to all clients except the sender
wss.on('connection', (ws) => {
    console.log('A new client connected.');

    // When a message is received, broadcast it to all other connected clients
    ws.on('message', (message) => {
        // console.log('Received:', message.toString());

        // Broadcast the message to all connected clients except the sender
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    // When the connection is closed
    ws.on('close', () => {
        console.log('A client disconnected.');
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});
