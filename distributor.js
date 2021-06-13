import tcpServer from "./server.js";

let map = {};

class distributor extends tcpServer {
  constructor() {
    // port, name, url
    super("distributor", 9000, ["POST/distributes", "GET/distributes"]);
  }
  // 접속
  onCreate(socket) {
    console.log("-----tcp distributor 접속-----");
    console.log("onCreate", socket.remoteAddress, socket.remotePort);
  }
  // 해제
  onClose() {}
  // 접속 정보 전파
  onRead(socket, json) {
    let key = socket.remoteAddress + ":" + socket.remotePort;
    console.log("onRead", socket.remoteAddress, socket.remotePort, json);
    if (json.uri === "/distributes" && json.method === "POST") {
      map[key] = {
        socket: socket,
      };
      map[key].info = json.params;
      map[key].info.host = socket.remoteAddress;
      this.sendInfo();
    }
  }
  write(socket, packet) {
    socket.write(JSON.stringify(packet) + "#");
  }
  sendInfo(socket) {
    let packet = {
      uri: "/distributes",
      method: "GET",
      key: 0,
      params: [],
    };
    for (let n in map) {
      packet.params.push(map[n].info);
    }
    if (socket) {
      this.write(socket, packet);
    } else {
      for (let n in map) {
        this.write(map[n].socket, packet);
      }
    }
  }
}

new distributor();
