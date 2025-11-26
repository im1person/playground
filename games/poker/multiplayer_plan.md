## Local Network Multiplayer Connection Plan

### 1. Overview

This document outlines the plan for implementing local network multiplayer support for the poker/playing card game. Players on the same local network (LAN/WiFi) should be able to discover and connect to each other without requiring external servers.

**Key Requirements:**

- Local network only (no internet required)
- Peer discovery (find other players on network)
- Real-time game state synchronization
- Support 2-4 players
- Low latency (< 100ms on LAN)
- Connection reliability and reconnection handling

### 2. Technology Options

#### Option A: WebRTC (Peer-to-Peer) ⭐ Recommended

**What it is:**

- Browser-native API for direct peer-to-peer connections
- No server required for data transfer (only signaling needed)
- Low latency, direct connections between players

**Pros:**

- ✅ Direct P2P connections (lowest latency)
- ✅ No game server needed (only signaling server)
- ✅ Browser-native, well-supported
- ✅ Encrypted by default
- ✅ Works well on local networks

**Cons:**

- ❌ Requires signaling server for initial connection setup
- ❌ NAT traversal can be complex (but works on local network)
- ❌ More complex to implement than WebSocket

**Best for:** Direct player-to-player games, minimal server dependency

---

#### Option B: WebSocket (Client-Server)

**What it is:**

- Full-duplex communication over TCP
- Requires a central server (can be lightweight)
- Server manages game state

**Pros:**

- ✅ Simpler architecture (centralized state)
- ✅ Easier to implement
- ✅ Better for authoritative server model
- ✅ Many mature libraries available

**Cons:**

- ❌ Requires running a server (even if lightweight)
- ❌ Slightly higher latency (extra hop through server)
- ❌ Server becomes single point of failure

**Best for:** Games needing authoritative server, simpler implementation

---

#### Option C: Hybrid (WebRTC + Signaling Server)

**What it is:**

- WebRTC for data transfer (P2P)
- Lightweight signaling server for connection setup
- Best of both worlds

**Pros:**

- ✅ Low latency (P2P data)
- ✅ Centralized connection management
- ✅ Can fall back to relay if P2P fails

**Cons:**

- ❌ More complex setup
- ❌ Still need signaling server

**Best for:** Production-ready multiplayer with flexibility

---

### 3. Library Recommendations

#### A. NetplayJS ⭐ Top Recommendation for P2P

**Library:** [NetplayJS](https://github.com/rameshvarun/netplayjs)

**What it provides:**

- WebRTC-based P2P multiplayer framework
- Rollback netcode for smooth gameplay
- Automatic peer discovery (with signaling server)
- State synchronization
- No game server needed

**Pros:**

- ✅ Purpose-built for browser games
- ✅ Handles connection logic automatically
- ✅ Rollback netcode (handles lag gracefully)
- ✅ Good documentation
- ✅ MIT License

**Cons:**

- ❌ Still needs signaling server (but can be minimal)
- ❌ Learning curve for rollback netcode

**Installation:**

```bash
npm install @netplayjs/core
```

**Usage Example:**

```javascript
import { NetplayPlayer, DefaultInput, Game } from "@netplayjs/core";

class PokerGame extends Game {
  // Game logic here
}

// Host a game
const game = new PokerGame();
game.start();

// Join a game
game.connectToHost(hostId);
```

**Best for:** P2P games, rollback netcode needed

---

#### B. PeerJS ⭐ Good for WebRTC

**Library:** [PeerJS](https://peerjs.com/)

**What it provides:**

- Simple WebRTC wrapper
- Peer discovery via PeerJS cloud server (or self-hosted)
- Data channels for game state
- Easy to use API

**Pros:**

- ✅ Simple API
- ✅ Free cloud signaling server (or self-hosted)
- ✅ Good documentation
- ✅ Lightweight
- ✅ MIT License

**Cons:**

- ❌ Relies on PeerJS cloud (or need to host signaling server)
- ❌ Less game-specific features than NetplayJS

**Installation:**

```bash
npm install peerjs
```

**Usage Example:**

```javascript
import Peer from "peerjs";

// Host
const peer = new Peer();
peer.on("open", (id) => {
  console.log("My peer ID is: " + id);
});

// Join
const conn = peer.connect(hostId);
conn.on("open", () => {
  conn.send("Hello!");
});
```

**Best for:** Simple P2P connections, custom game logic

---

#### C. Socket.io ⭐ Best for Client-Server

**Library:** [Socket.io](https://socket.io/)

**What it provides:**

- WebSocket wrapper with fallbacks
- Room management
- Event-based communication
- Server and client libraries

**Pros:**

- ✅ Very mature and stable
- ✅ Excellent documentation
- ✅ Room/namespace support
- ✅ Automatic reconnection
- ✅ Works with Node.js server

**Cons:**

- ❌ Requires server (Node.js)
- ❌ Not P2P (goes through server)

**Installation:**

```bash
npm install socket.io socket.io-client
```

**Usage Example:**

```javascript
// Server
const io = require("socket.io")(server);
io.on("connection", (socket) => {
  socket.on("join-game", (gameId) => {
    socket.join(gameId);
  });
});

// Client
import io from "socket.io-client";
const socket = io("http://localhost:3000");
socket.emit("join-game", "game-123");
```

**Best for:** Client-server architecture, room-based games

---

#### D. Colyseus

**Library:** [Colyseus](https://www.colyseus.io/)

**What it provides:**

- Full multiplayer game server framework
- State synchronization
- Room management
- TypeScript support

**Pros:**

- ✅ Game-focused framework
- ✅ Automatic state sync
- ✅ Room management
- ✅ Good for complex games

**Cons:**

- ❌ Requires server setup
- ❌ More heavyweight
- ❌ Learning curve

**Best for:** Complex multiplayer games, authoritative server needed

---

### 4. Local Network Discovery Methods

#### Method 1: mDNS/Bonjour (Browser Limitations)

**Challenge:** Browsers don't directly support mDNS discovery for security reasons.

**Workaround Options:**

- Use a lightweight signaling server that broadcasts available games
- Manual IP entry (players enter host IP)
- QR code sharing (host generates QR with connection info)

---

#### Method 2: Signaling Server with Discovery

**Approach:**

- Lightweight Node.js server on local network
- Server maintains list of available games
- Players query server for available games
- Server facilitates WebRTC connection setup

**Implementation:**

```javascript
// Signaling server (Node.js)
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Game discovery
const activeGames = new Map();

io.on("connection", (socket) => {
  // Host creates game
  socket.on("host-game", (gameName) => {
    const gameId = generateId();
    activeGames.set(gameId, { name: gameName, host: socket.id });
    socket.join(gameId);
    socket.emit("game-created", gameId);
  });

  // List available games
  socket.on("list-games", () => {
    socket.emit("games-list", Array.from(activeGames.entries()));
  });

  // Join game
  socket.on("join-game", (gameId) => {
    socket.join(gameId);
    socket.to(gameId).emit("player-joined", socket.id);
  });
});

server.listen(3000, "0.0.0.0"); // Listen on all interfaces
```

---

#### Method 3: QR Code + Manual Entry

**Approach:**

- Host generates game with unique ID
- Host displays QR code with connection info (IP + port + game ID)
- Players scan QR or manually enter connection details
- Direct WebRTC connection after initial handshake

**Pros:**

- ✅ No discovery server needed
- ✅ Simple for users
- ✅ Works on any network

**Cons:**

- ❌ Requires manual step (scan/enter)

---

#### Method 4: WebRTC Data Channels with STUN/TURN

**Approach:**

- Use STUN server for NAT traversal (can be public like Google's)
- TURN server only needed if STUN fails (rare on local network)
- PeerJS or custom WebRTC implementation

**STUN Servers (Free):**

- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

---

### 5. Recommended Architecture

#### Architecture: WebRTC P2P with Lightweight Signaling Server

**Components:**

1. **Signaling Server** (Node.js, minimal)

   - Game discovery
   - Connection setup
   - Room management
   - Can run on one player's machine or dedicated device

2. **Client (Browser)**
   - WebRTC peer connections
   - Game logic
   - UI rendering

**Flow:**

```
1. Host starts game → Signaling server registers game
2. Players browse available games → Signaling server lists games
3. Player joins → Signaling server facilitates WebRTC handshake
4. WebRTC connection established → Direct P2P data transfer
5. Game state synced via WebRTC data channels
```

**Library Choice:** **PeerJS** or **NetplayJS**

**Why:**

- PeerJS: Simpler, more control, good for custom game logic
- NetplayJS: More features, rollback netcode, but steeper learning curve

---

### 6. Implementation Plan

#### Phase 1: Signaling Server Setup

**Option A: Use PeerJS Cloud (Easiest)**

- Free cloud signaling server
- No setup required
- Works for testing, but relies on external service

**Option B: Self-Hosted Signaling Server**

- Lightweight Node.js server
- Run on local network (one player's machine or Raspberry Pi)
- Full control, no external dependency

**Server Requirements:**

- Node.js server
- WebSocket support (Socket.io or ws)
- Game discovery endpoint
- WebRTC signaling endpoint

---

#### Phase 2: Client Integration

**Using PeerJS:**

```javascript
// Host
const peer = new Peer({
  host: "localhost", // or signaling server IP
  port: 9000,
  path: "/peerjs",
});

peer.on("open", (id) => {
  // Broadcast game ID
  displayGameCode(id);
});

peer.on("connection", (conn) => {
  conn.on("data", (data) => {
    handleGameMessage(data);
  });
});

// Join
const peer = new Peer();
const conn = peer.connect(hostId);
conn.on("open", () => {
  conn.send({ type: "join", playerName: "Player 1" });
});
```

---

#### Phase 3: Game State Synchronization

**Approach: Lockstep or State Sync**

**Lockstep:**

- All players send actions
- Game advances when all actions received
- Deterministic game logic
- Good for turn-based games (poker)

**State Sync:**

- Host/authoritative player sends full state
- Clients apply state updates
- Simpler but requires authority

**For Poker (Recommended: Lockstep):**

```javascript
// All players send actions
function playerAction(action) {
  // Send to all peers
  connections.forEach((conn) => {
    conn.send({
      type: "action",
      player: playerId,
      action: action,
      timestamp: Date.now(),
    });
  });

  // Apply locally
  applyAction(action);
}

// Receive actions
conn.on("data", (data) => {
  if (data.type === "action") {
    applyAction(data.action);
  }
});
```

---

#### Phase 4: Connection Management

**Features:**

- Auto-reconnect on disconnect
- Connection status indicators
- Handle player disconnects gracefully
- Rejoin capability

**Implementation:**

```javascript
// Reconnection logic
peer.on("disconnected", () => {
  peer.reconnect();
});

// Connection status
function updateConnectionStatus(connected) {
  document.getElementById("status").textContent = connected
    ? "Connected"
    : "Disconnected";
}
```

---

### 7. Server Deployment Options

#### Option A: One Player Hosts Server

**Setup:**

- One player runs Node.js server on their machine
- Other players connect to that IP
- Simple, no extra hardware

**Pros:**

- ✅ No extra setup
- ✅ Works immediately

**Cons:**

- ❌ Host must keep server running
- ❌ Host's IP needed by others

---

#### Option B: Dedicated Device

**Setup:**

- Raspberry Pi or old computer runs server
- Always available on network
- Players connect to fixed IP

**Pros:**

- ✅ Always available
- ✅ No dependency on player's machine

**Cons:**

- ❌ Requires extra hardware
- ❌ More setup

---

#### Option C: PeerJS Cloud (Testing Only)

**Setup:**

- Use PeerJS free cloud signaling
- No server setup needed
- Works for development/testing

**Pros:**

- ✅ Zero setup
- ✅ Good for testing

**Cons:**

- ❌ External dependency
- ❌ Not truly "local network only"

---

### 8. Data Protocol Design

**Message Types:**

```javascript
// Connection
{ type: 'join', playerId: string, playerName: string }
{ type: 'leave', playerId: string }
{ type: 'ping', timestamp: number }

// Game Actions
{ type: 'bet', playerId: string, amount: number }
{ type: 'fold', playerId: string }
{ type: 'call', playerId: string }
{ type: 'raise', playerId: string, amount: number }

// Game State
{ type: 'state-sync', state: GameState }
{ type: 'card-deal', cards: Card[] }
{ type: 'phase-change', phase: string }
```

**Serialization:**

- JSON (simple, human-readable)
- MessagePack (smaller, faster)
- Protobuf (most efficient, but more complex)

---

### 9. Security Considerations

**Local Network:**

- Less security risk (trusted network)
- Still validate game actions
- Prevent cheating (server-side validation if using server)

**Validation:**

- Verify player actions are legal
- Check betting amounts
- Validate card deals
- Prevent state manipulation

---

### 10. Testing Strategy

**Local Testing:**

1. Run signaling server locally
2. Open multiple browser tabs/windows
3. Test connection, game flow, disconnects

**Network Testing:**

1. Deploy server on local network
2. Test from multiple devices
3. Test on WiFi and wired connections
4. Test with 2-4 players

**Edge Cases:**

- Player disconnects mid-game
- Network latency spikes
- Multiple players join/leave
- Host disconnects

---

### 11. Recommended Stack

**For Poker Game (Recommended):**

**Signaling Server:**

- Node.js + Express
- Socket.io (for signaling)
- Simple REST API for game discovery

**Client:**

- PeerJS (for WebRTC)
- Or NetplayJS (if rollback netcode needed)

**Why This Stack:**

- ✅ PeerJS is simple and well-documented
- ✅ Socket.io for signaling is mature
- ✅ Good balance of simplicity and features
- ✅ Easy to set up and maintain

---

### 12. Implementation Checklist

**Phase 1: Setup**

- [ ] Choose library (PeerJS recommended)
- [ ] Set up signaling server (Node.js)
- [ ] Implement game discovery
- [ ] Test basic connection

**Phase 2: Integration**

- [ ] Integrate WebRTC in game
- [ ] Implement connection UI (host/join)
- [ ] Add connection status indicators
- [ ] Test peer connections

**Phase 3: Game Sync**

- [ ] Design message protocol
- [ ] Implement action broadcasting
- [ ] Add state synchronization
- [ ] Test with 2+ players

**Phase 4: Polish**

- [ ] Auto-reconnect
- [ ] Handle disconnects gracefully
- [ ] Connection status UI
- [ ] Error handling

**Phase 5: Testing**

- [ ] Test on local network
- [ ] Test with multiple devices
- [ ] Test edge cases (disconnects, etc.)
- [ ] Performance testing

---

### 13. Alternative: No Library (Custom Implementation)

**If building from scratch:**

**WebRTC API:**

```javascript
// Create peer connection
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

// Data channel
const dataChannel = pc.createDataChannel("game");

// Signaling (via WebSocket or HTTP)
socket.emit("offer", offer);
socket.on("answer", (answer) => {
  pc.setRemoteDescription(answer);
});
```

**Pros:**

- ✅ Full control
- ✅ No dependencies
- ✅ Learn WebRTC deeply

**Cons:**

- ❌ More complex
- ❌ More code to maintain
- ❌ Handle edge cases yourself

**Recommendation:** Use a library (PeerJS) unless you need very specific custom behavior.

---

### 14. Summary & Recommendation

**Best Approach for Poker Game:**

1. **Library:** **PeerJS** (simple, well-documented, good for P2P)
2. **Architecture:** WebRTC P2P with lightweight signaling server
3. **Signaling:** Self-hosted Node.js server (or PeerJS cloud for testing)
4. **Discovery:** Signaling server maintains game list
5. **Sync:** Lockstep for turn-based poker actions

**Why:**

- ✅ Low latency (direct P2P)
- ✅ Simple to implement with PeerJS
- ✅ Works well on local network
- ✅ No heavy dependencies
- ✅ Good documentation and community

**Next Steps:**

1. Set up PeerJS in project
2. Create minimal signaling server
3. Implement basic connection (host/join)
4. Add game state synchronization
5. Test on local network

---

## 本地網路多人連線計畫（正體中文）

### 1. 概述

本文件概述為撲克/紙牌遊戲實作本地網路多人連線支援的計畫。同一本地網路（LAN/WiFi）的玩家應能發現並連線，無需外部伺服器。

### 2. 技術選項

#### 選項 A：WebRTC（點對點）⭐ 推薦

**優點：**

- ✅ 直接 P2P 連線（最低延遲）
- ✅ 無需遊戲伺服器（僅需信令伺服器）
- ✅ 瀏覽器原生支援
- ✅ 預設加密
- ✅ 本地網路運作良好

**缺點：**

- ❌ 需要信令伺服器進行初始連線設定
- ❌ NAT 穿透較複雜（但本地網路可運作）

#### 選項 B：WebSocket（客戶端-伺服器）

**優點：**

- ✅ 架構較簡單（集中式狀態）
- ✅ 較易實作
- ✅ 許多成熟函式庫

**缺點：**

- ❌ 需要執行伺服器
- ❌ 延遲稍高（需經過伺服器）

### 3. 函式庫推薦

#### A. NetplayJS ⭐ P2P 首選

**提供：**

- WebRTC 基礎 P2P 多人框架
- 回滾網路程式碼
- 自動對等發現
- 狀態同步

**適合：** P2P 遊戲，需要回滾網路程式碼

#### B. PeerJS ⭐ WebRTC 推薦

**提供：**

- 簡單 WebRTC 包裝
- 對等發現（PeerJS 雲端或自架）
- 資料通道
- 易用 API

**適合：** 簡單 P2P 連線，自訂遊戲邏輯

#### C. Socket.io ⭐ 客戶端-伺服器最佳

**提供：**

- WebSocket 包裝與備援
- 房間管理
- 事件式通訊

**適合：** 客戶端-伺服器架構，房間式遊戲

### 4. 本地網路發現方法

#### 方法 1：信令伺服器與發現

**方法：**

- 本地網路上的輕量 Node.js 伺服器
- 伺服器維護可用遊戲清單
- 玩家查詢伺服器取得可用遊戲
- 伺服器協助 WebRTC 連線設定

#### 方法 2：QR 碼 + 手動輸入

**方法：**

- 主機產生帶唯一 ID 的遊戲
- 主機顯示含連線資訊的 QR 碼（IP + 埠 + 遊戲 ID）
- 玩家掃描 QR 或手動輸入連線詳情
- 初始握手後直接 WebRTC 連線

### 5. 推薦架構

**架構：WebRTC P2P + 輕量信令伺服器**

**元件：**

1. **信令伺服器**（Node.js，最小化）

   - 遊戲發現
   - 連線設定
   - 房間管理
   - 可在玩家機器或專用裝置上執行

2. **客戶端（瀏覽器）**
   - WebRTC 對等連線
   - 遊戲邏輯
   - UI 渲染

**函式庫選擇：PeerJS 或 NetplayJS**

### 6. 實作計畫

**階段 1：信令伺服器設定**

- 選項 A：使用 PeerJS 雲端（最簡單）
- 選項 B：自架信令伺服器

**階段 2：客戶端整合**

- 使用 PeerJS 建立連線
- 實作主機/加入功能

**階段 3：遊戲狀態同步**

- 鎖步或狀態同步
- 撲克建議使用鎖步

**階段 4：連線管理**

- 自動重連
- 連線狀態指示
- 優雅處理斷線

### 7. 伺服器部署選項

**選項 A：一名玩家主機伺服器**

- 一名玩家在其機器上執行 Node.js 伺服器
- 其他玩家連線至該 IP

**選項 B：專用裝置**

- Raspberry Pi 或舊電腦執行伺服器
- 網路中始終可用

**選項 C：PeerJS 雲端（僅測試）**

- 使用 PeerJS 免費雲端信令
- 無需伺服器設定

### 8. 推薦堆疊

**撲克遊戲推薦：**

**信令伺服器：**

- Node.js + Express
- Socket.io（用於信令）
- 簡單 REST API 用於遊戲發現

**客戶端：**

- PeerJS（用於 WebRTC）

**原因：**

- ✅ PeerJS 簡單且文件完善
- ✅ Socket.io 用於信令成熟
- ✅ 簡單與功能平衡良好
- ✅ 易於設定與維護

### 9. 總結與建議

**撲克遊戲最佳方法：**

1. **函式庫：PeerJS**（簡單、文件完善、適合 P2P）
2. **架構：** WebRTC P2P + 輕量信令伺服器
3. **信令：** 自架 Node.js 伺服器（或測試用 PeerJS 雲端）
4. **發現：** 信令伺服器維護遊戲清單
5. **同步：** 回合制撲克動作使用鎖步

**下一步：**

1. 在專案中設定 PeerJS
2. 建立最小信令伺服器
3. 實作基本連線（主機/加入）
4. 加入遊戲狀態同步
5. 在本地網路上測試

---

> **注意：** 此為計畫文件，實際實作將在後續階段進行。建議先完成基本紙牌模擬，再加入多人連線功能。
