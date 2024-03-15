# Basic of Socket.io
Socket.IO의 기본 아이디어는 원하는 데이터와 함께 원하는 이벤트를 보내고 받을 수 있다는 것입니다.
JSON으로 인코딩할 수 있는 모든 개체가 가능하며 이진 데이터 도 지원됩니다.


# [Connection state recovery](https://socket.io/docs/v4/tutorial/step-6)
연결 상태 복구
먼저 연결 해제가 없었던 것처럼 가장하여 연결 해제를 처리해 보겠습니다. 이 기능을 "연결 상태 복구"라고 합니다.

이 기능은 서버에서 보낸 모든 이벤트를 임시로 저장하고 클라이언트가 다시 연결될 때 클라이언트 상태를 복원하려고 시도합니다.

하지만 이것은 정말 놀라운 기능인데 왜 기본적으로 활성화되어 있지 않습니까?

여기에는 몇 가지 이유가 있습니다.

항상 작동하는 것은 아닙니다. 예를 들어 서버가 갑자기 충돌하거나 다시 시작되면 클라이언트 상태가 저장되지 않을 수 있습니다.
확장할 때 이 기능을 활성화하는 것이 항상 가능한 것은 아닙니다.

즉, 일시적인 연결 끊김 후(예: 사용자가 WiFi에서 4G로 전환하는 경우) 클라이언트 상태를 동기화할 필요가 없기 때문에 이는 정말 훌륭한 기능입니다.

#  [Server delivery](https://socket.io/docs/v4/tutorial/step-7)

목적 :  build a chat working both after a temporary disconnection and a full page refresh.

There are two common ways to synchronize the state of the client upon reconnection:
재연결할 때 상태를 동기화하는 일반적 방법은 2가지가 있습니다.

    - either the server sends the whole state
      서버가 모든 상태를 다 보내거나
    - or the client keeps track of the last event it has processed and the server sends the missing pieces
      클라이언트가 마지막 진행된 이벤트를 추적을 진행하며 서버가 빠진 부분을 보내줍니다.

Both are totally valid solutions and choosing one will depend on your use case. In this tutorial, we will go with the latter.
두 개의 방법 모두 유효한 솔루션이며 당신의 상황에 근거해 방법을 선택하면 됩니다. 이 튜토리얼에서는 후자를 진행하겠습니다.
First, let's persist the messages of our chat application. Today there are plenty of great options, we will use SQLite here.
우선, 채팅 어플리케이션의 메세지를 유지하도록 하겠습니다. 오늘날 많은 옵션이 있지만 sqlite를 이용할 것입니다.
| TIP
| If you are not familiar with SQLite, there are plenty of tutorials available online, like (this one)[https://www.sqlitetutorial.net/].

Let's install the necessary packages:

```
npm install sqlite sqlite3
```

We will simply store each message in a SQL table:

```javascript
// index.js
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function main() {
  // open the database file
  const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
  });

  // create our 'messages' table (you can ignore the 'client_offset' column for now)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}
  });

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', (socket) => {
    socket.on('chat message', async (msg) => {
      let result;
      try {
        // store the message in the database
        result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
      } catch (e) {
        // TODO handle the failure
        return;
      }
      // include the offset with the message
      io.emit('chat message', msg, result.lastID);
    });
  });

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });
}

main();
```

The client will then keep track of the offset:
offset을 트랙하도록 client에 명령합시다

```html
<!-- index.html -->
<script>
  const socket = io({
    auth: {
      serverOffset: 0
    }
  });

생략

  socket.on('chat message', (msg, serverOffset) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    socket.auth.serverOffset = serverOffset;
  });
</script>
```

```javascript
// index.js
  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      await db.each('SELECT id, content FROM messages WHERE id > ?',
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit('chat message', row.content, row.id);
        }
      )
    } catch (e) {
      // something went wrong
    }
  }
```