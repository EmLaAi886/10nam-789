const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = 10000;

// ================== Biến toàn cục ==================
let latestResult = {
  Ket_qua: "Chưa có kết quả",
  Phien: 0,
  Tong: 0,
  Xuc_xac_1: 0,
  Xuc_xac_2: 0,
  Xuc_xac_3: 0,
  Du_doan: "Chưa có dự đoán",
  id: "binhkogay"
};

let lastEventId = 19;

// ================== WebSocket ==================
const WS_URL = "wss://websocket.atpman.net/websocket";
const HEADERS = {
  'Host': 'websocket.atpman.net',
  'Origin': 'https://play.789club.sx',
  'User-Agent': 'Mozilla/5.0',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache'
};

// ----- Đăng nhập bằng tài khoản mới -----
const LOGIN_MESSAGE = [
  1,
  "MiniGame",
  "wanglin2019a",        // user mới
  "WangFlang1",          // pass mới
  {
    "info": "{\"ipAddress\":\"113.185.47.3\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJ3YW5nbGluOTE5MjkiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZablNlLCJjdXN0b21lcklkIjo2MjYwNjIwNSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiI3ODkuY2x1YiIsInRpbWVzdGFtcCI6MTc1ODEzMjUzNzYyMywibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIxMTMuMTg1LjQ3LjMiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9hcGkueGV1aS5pby9pbWFnZXMvYXZhdGFyL2F2YXRhcl8xMy5wbmciLCJwbGF0Zm9ybUlkIjo1LCJ1c2VySWQiOiJjMTQ2ODVlMS1mOGExLTRlYTMtYmEwYS01Y2M4Yjc1NzczNjAiLCJyZWdUaW1lIjoxNzU4MTMyNDcyMDkzLCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IlM4X3dhbmdsaW4yMDE5YSJ9.FEtg0oB1mkGhpzSCPmO3k6q-U5O-MQqVwu4HjrBG1O0\",\"locale\":\"vi\",\"userId\":\"c14685e1-f8a1-4ea3-ba0a-5cc8b7577360\",\"username\":\"S8_wanglin2019a\",\"timestamp\":1758132537623,\"refreshToken\":\"70cb336ff95a46d292f16c4fafe0a973.a46444d78db54b44a0cc4e812f979db2\"}",
    "signature": "261EECD1A140C46175B081A912CFBCCA1C78727084352D38F8A83FF7D9ED132DEA65B76F84C61465218DED52BA5D90C96807DF7FB48C90D8DDE133955A09C9FB09DA617FC9F19C1D9024B4381149BAC7C771379013FE4FF99924B4CCAD128021663FFF4809F9B141CC8B5CE8D5721EF87932805124D0349CFD3F923178156052"
  }
];

const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", {"cmd": 2000}];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", {"cmd": 10001}];

// Hàm tạo dự đoán ngẫu nhiên
function generateDuDoan() {
  const options = ["Tài", "Xỉu"];
  return options[Math.floor(Math.random() * options.length)];
}

function connectWebSocket() {
  const ws = new WebSocket(WS_URL, {
    headers: HEADERS
  });

  ws.on('open', function open() {
    console.log('✅ Đã kết nối WebSocket');
    ws.send(JSON.stringify(LOGIN_MESSAGE));

    // Gửi các message subscribe sau 1 giây
    setTimeout(() => {
      ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT));
      ws.send(JSON.stringify(SUBSCRIBE_LOBBY));
    }, 1000);

    // Ping định kỳ và gửi lại subscribe
    setInterval(() => {
      ws.send('2'); // ping
      ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT));
      ws.send(JSON.stringify([7, "Simms", lastEventId, 0, {"id": 0}]));
    }, 10000);
  });

  ws.on('message', function message(data) {
    try {
      const parsedData = JSON.parse(data);
      
      if (Array.isArray(parsedData)) {
        // Cập nhật lastEventId
        if (parsedData.length >= 3 && parsedData[0] === 7 && parsedData[1] === "Simms" && typeof parsedData[2] === 'number') {
          lastEventId = parsedData[2];
        }

        // Xử lý dữ liệu kết quả Tài/Xỉu
        if (typeof parsedData[1] === 'object' && parsedData[1].cmd === 2006) {
          const sid = parsedData[1].sid;
          const d1 = parsedData[1].d1;
          const d2 = parsedData[1].d2;
          const d3 = parsedData[1].d3;
          const tong = d1 + d2 + d3;
          const ketqua = tong >= 11 ? "Tài" : "Xỉu";
          
          // Tạo dự đoán cho phiên tiếp theo
          const du_doan = generateDuDoan();

          latestResult = {
            Ket_qua: ketqua,
            Phien: sid,
            Tong: tong,
            Xuc_xac_1: d1,
            Xuc_xac_2: d2,
            Xuc_xac_3: d3,
            Du_doan: du_doan,
            id: "binhkogay"
          };

          console.log('🎲 Cập nhật:', latestResult);
        }
      }
    } catch (e) {
      console.log('❌ Lỗi message:', e.message);
    }
  });

  ws.on('close', function close() {
    console.log('🔌 WebSocket đóng. Kết nối lại sau 5s...');
    setTimeout(connectWebSocket, 5000);
  });

  ws.on('error', function error(err) {
    console.log('❌ Lỗi WebSocket:', err.message);
  });
}

// ================== HTTP SERVER ==================
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Xử lý CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/taixiu' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(latestResult));
  } else {
    res.writeHead(404);
    res.end('Khong tim thay');
  }
});

// ================== RUN ==================
console.log(`🌐 HTTP Server chạy tại http://localhost:${PORT}/taixiu`);
server.listen(PORT);
connectWebSocket();
