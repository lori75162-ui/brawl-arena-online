# Brawl Arena Online — friend-room starter

A small browser multiplayer prototype. Players create a private room, share its six-character code, and join from phones or computers.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`
3. Run `npm start`
4. Open `http://localhost:3000`

For friends on the same Wi-Fi, use the host computer's local IP and port 3000.

## Put it online
Deploy this Node.js project to a host that supports persistent Node processes and WebSockets (for example Render, Railway, or a VPS). Set the start command to `npm start`. Share the resulting HTTPS URL with friends.

## Important
This is an early playable multiplayer starter, not a finished commercial game. It has private rooms, synchronized movement, basic shooting and health. Add production security, rate limiting, persistent accounts, moderation, matchmaking, and robust authoritative game simulation before a public launch. Room state currently lives in server memory and resets when the server restarts.
