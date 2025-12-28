# Envision Meet

**Envision Meet** is an accessible, real-time video conferencing application designed to bridge the gap for users with visual impairments. It combines high-quality video calls with ultra-low latency accessibility tools like **Live Braille Streaming** and **Instant Captions**.

![Project Login Screen](/images/meet_image.jpg)

## 🌟 Key Features

### 🎥 HD Video Conferencing
-   Powered by **ZegoCloud UIKit**.
-   Supports multi-user group calls, screen sharing, and device management.

### ⠞⠑⠎⠞ Real-Time Braille Streaming
-   **Ultra-Low Latency**: Keystrokes are streamed character-by-character in < 50ms.
-   **Hybrid Transport**: Uses a custom **Local WebSocket Server** (`ws://localhost:8080`) to bypass standard chat delays.
-   **Instant Feedback**: Two-way synchronization—sender sees what they type, receiver sees it appear instantly.

### 💬 Live Streaming Captions
-   **Interim Result Streaming**: Captions appear letter-by-letter as you speak, not just when you finish a sentence.
-   **Smart UI**: Updates the current chat bubble dynamically instead of flooding the chat history.

### 🔐 Secure Authentication
-   **NextAuth.js**: Secure Credential-based login (Email/Password).
-   **MongoDB**: Persistent user storage and session management.

---

## 🛠️ Technology Stack

-   **Frontend**: [Next.js 14 (App Router)](https://nextjs.org/)
-   **Video Engine**: [ZegoCloud](https://www.zegocloud.com/)
-   **Real-Time Data**: Custom Node.js WebSocket Server (`ws`)
-   **Database**: MongoDB (Mongoose)
-   **Styling**: Tailwind CSS, Radix UI, Lucide Icons
-   **State Management**: React Hooks, React Toastify

---

## 🚀 Getting Started

This project requires **two terminal processes** running simultaneously (Frontend + WebSocket Server).

### 1. Prerequisites
-   Node.js 18+ installed.
-   MongoDB instance (local or Atlas) running.
-   Env variables configured (see `.env.example`).

### 2. Installation
```bash
git clone https://github.com/Rohitprakasam/envision_meet.git
cd envision_meet
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_ZEGOAPP_ID=your_app_id
NEXT_PUBLIC_ZEGO_SERVER_SECRET=your_server_secret
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run the Project
**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (WebSocket Server - REQUIRED for Braille/Captions):**
```bash
node websocket-server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

-   `src/app/video-meeting/[roomId]/page.jsx`: Core meeting logic, WebSocket client integration, and ZegoUIKit.
-   `websocket-server.js`: The standalone server handling Braille and Caption streams.
-   `src/api/auth/`: NextAuth authentication routes.
-   `src/models/`: Mongoose schemas.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements.
