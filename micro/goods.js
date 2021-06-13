import goods from "../route/goods";
import tcpServer from "../server";

class goodsServer extends tcpServer {
  constructor() {
    super("goods", process.argv[2] ? Number(process.argv[2]) : 9010, [
      "POST/goods",
      "GET/goods",
      "DELETE/goods",
    ]);
    // distributor 실행
    this.connectToDistributor("127.0.0.1", 9000, (data) => {
      console.log("Distributor Notification", data);
    });
  }

  onRead(socket, data) {
    console.log("onRead", socket.remoteAddress, socket.remotePort, data);
    goods.onRequest(socket, data.method, data.uri, data.params, (s, packet) => {
      socket.write(JSON.stringify(packet) + "#");
    });
  }
}

new goodsServer();
