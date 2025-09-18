const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

let latestResult = {
  id: "binhtool90",
  id_phien: 0,
  ket_qua: "Chưa có kết quả"
};

// Lưu lịch sử kết quả T/X tối đa 20 lần
let patternHistory = "";

// Thông tin phiên hiện tại
let currentSessionInfo = {
  Phien: 0,
  Xuc_xac_1: 0,
  Xuc_xac_2: 0,
  Xuc_xac_3: 0,
  Tong: 0,
  Ket_qua: "Chưa có",
  Phien_hien_tai: 0,
  Du_doan: "Chưa dự đoán"
};

function updatePatternHistory(result) {
  if (patternHistory.length >= 20) {
    patternHistory = patternHistory.slice(1);
  }
  patternHistory += result;
}

function predictNextFromPattern(history) {
  if (history.length < 6) return "Chưa đủ dữ liệu dự đoán";
  const lastChar = history[history.length - 1];
  const predicted = lastChar === 't' ? 'x' : 't';
  return predicted === 't' ? "Tài" : "Xỉu";
}

const WS_URL = "wss://websocket.atpman.net/websocket";
const HEADERS = {
  "Host": "websocket.atpman.net",
  "Origin": "https://play.789club.sx",
  "User-Agent": "Mozilla/5.0",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache"
};

let lastEventId = 19;

const LOGIN_MESSAGE = [
  1,
  "MiniGame",
  "binhdepzai113",
  "123321",
  {
    "info": "{\"ipAddress\":\"116.110.42.48\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJvaWRvaW9pMTIzIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6ZmFsc2UsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6NjI2MTI5MjEsImFmZklkIjoiZTRjMzI2YzUtZmI2OS00Mjk4LThlNmItMzZiMDBlMjQ3MjUwIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiI3ODkuY2x1YiIsInRpbWVzdGFtcCI6MTc1ODE1MTI2OTQ4NiwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOmZhbHNlLCJpcEFkZHJlc3MiOiIxMTYuMTEwLjQyLjQ4IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vYXBpLnhldWkuaW8vaW1hZ2VzL2F2YXRhci9hdmF0YXJfMjQucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiZTRjMzI2YzUtZmI2OS00Mjk4LThlNmItMzZiMDBlMjQ3MjUwIiwicmVnVGltZSI6MTc1ODE1MTI2OTQ4MCwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJTOF9iaW5oZGVwemFpMTEzIn0.GRYovVURM2XH7fgewq_QJy7I6Xd9sfgWGtfEBHavzHE\",\"locale\":\"vi\",\"userId\":\"e4c326c5-fb69-4298-8e6b-36b00e247250\",\"username\":\"S8_binhdepzai113\",\"timestamp\":1758151269486,\"refreshToken\":\"65fd3201c9a04221b4deec8c07776402.cc32f7e5933b41e1856eaf04fa25062e\"}",
    "signature": "2FCD740705D1A7BC6C669D9AA4F699A83B96D085EF021ECA8219B262A76BD84A492317A9B99A587DF510501982B58A307B60D00F75E746282E9F6E12EC6FF6BCBD57ADE86F74058CE5C1011643FAE544FAE01AD0676F9833EB65692A1A5493A36FA1312DC2B1CC329581482E90C763481550E358F96BEE2CCB96B2ED9754F4EB"
  }
];

const SUBSCRIBE_TX_RESULT = [6, "MiniGame", "taixiuUnbalancedPlugin", { cmd: 2000 }];
const SUBSCRIBE_LOBBY = [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }];
const GET_CURRENT_SESSION = [5, { "cmd": 2005, "sid": 0 }];

function connectWebSocket() {
  const ws = new WebSocket(WS_URL, { headers: HEADERS });

  ws.on('open', () => {
    console.log("✅ Đã kết nối WebSocket");

    ws.send(JSON.stringify(LOGIN_MESSAGE));
    setTimeout(() => {
      ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT));
      ws.send(JSON.stringify(SUBSCRIBE_LOBBY));
      // Lấy thông tin phiên hiện tại
      ws.send(JSON.stringify(GET_CURRENT_SESSION));
    }, 1000);

    setInterval(() => ws.send("2"), 10000);
    setInterval(() => ws.send(JSON.stringify(SUBSCRIBE_TX_RESULT)), 30000);
    setInterval(() => ws.send(JSON.stringify([7, "Simms", lastEventId, 0, { id: 0 }])), 15000);
    // Cập nhật thông tin phiên hiện tại mỗi 10 giây
    setInterval(() => ws.send(JSON.stringify(GET_CURRENT_SESSION)), 10000);
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (Array.isArray(data)) {
        if (data[0] === 7 && data[1] === "Simms" && Number.isInteger(data[2])) {
          lastEventId = data[2];
        }

        // Xử lý thông tin phiên hiện tại (cmd 2005)
        if (data[1]?.cmd === 2005) {
          const sessionInfo = data[1];
          currentSessionInfo = {
            Phien: sessionInfo.sid || 0,
            Xuc_xac_1: sessionInfo.d1 || 0,
            Xuc_xac_2: sessionInfo.d2 || 0,
            Xuc_xac_3: sessionInfo.d3 || 0,
            Tong: (sessionInfo.d1 || 0) + (sessionInfo.d2 || 0) + (sessionInfo.d3 || 0),
            Ket_qua: sessionInfo.result || "Chưa có",
            Phien_hien_tai: sessionInfo.currentSid || 0,
            Du_doan: predictNextFromPattern(patternHistory)
          };
          
          console.log("📊 Thông tin phiên hiện tại:", currentSessionInfo);
        }

        // Xử lý kết quả mới (cmd 2006)
        if (data[1]?.cmd === 2006) {
          const { sid, d1, d2, d3 } = data[1];
          const tong = d1 + d2 + d3;
          const ketqua = tong >= 11 ? "Tài" : "Xỉu";

          latestResult = {
            id: "binhtool90",
            id_phien: sid,
            ket_qua: `${d1}-${d2}-${d3} = ${tong} (${ketqua})`
          };

          const resultTX = ketqua === "Tài" ? 't' : 'x';
          updatePatternHistory(resultTX);

          // Cập nhật dự đoán cho phiên hiện tại
          currentSessionInfo.Du_doan = predictNextFromPattern(patternHistory);

          console.log(latestResult);
          console.log("🔮 Dự đoán pattern tiếp theo:", currentSessionInfo.Du_doan);
          
          // Lấy lại thông tin phiên hiện tại sau khi có kết quả mới
          setTimeout(() => ws.send(JSON.stringify(GET_CURRENT_SESSION)), 1000);
        }
      }
    } catch (err) {
      console.error("❌ Lỗi message:", err.message);
    }
  });

  ws.on('close', () => {
    console.log("🔌 WebSocket đóng. Kết nối lại sau 5s...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on('error', (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
  });
}

// ✅ HTTP server có cấu hình CORS CHO DOMAIN CỤ THỂ
const server = http.createServer((req, res) => {
  // Chỉ cho phép domain sau truy cập:
  res.setHeader("Access-Control-Allow-Origin", "http://tooltxsieuvip.site");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/taixiu") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      latestResult,
      patternHistory,
      duDoanPattern: predictNextFromPattern(patternHistory),
      currentSession: currentSessionInfo
    }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Không tìm thấy");
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
