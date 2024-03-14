const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app); // Express는 appHTTP 서버에 제공할 수 있는 함수 핸들러로 초기화됩니다

// (HTTP 서버) 개체를 socket.io전달하여 새 인스턴스를 초기화
const io = new Server(server, {
  connectionStateRecovery: {}, // 임시로 저장하기 위해서 서버 측에서 활성화해야 합니다.
});

// 우리는 웹사이트 홈에 접속할 때 호출되는 경로 핸들러를 정의합니다 .
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// server그런 다음 들어오는 소켓에 대한 이벤트를 수신 connection하고 이를 콘솔에 기록합니다.
io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });
  socket.on("disconnect", () => {
    console.log("message is disconnected");
    socket.disconnect();
  });
});

// 서버와 연결된 모든이에게 emit 합니다


// 우리는 http 서버가 포트 8000에서 수신 대기하도록 만듭니다.
server.listen(8000, () => {
  console.log('server running at http://localhost:8000');
});

//node index.js 로 실행한다