import purchases from "../route/purchases";
import tcpServer from "../server";

class purchasesServer extends tcpServer {
  constructor() {
    super("purchases", process.argv[2] ? Number(process.argv[2]) : 9020, [
      "POST/purchases",
      "GET/purchases",
      "DELETE/purchases",
    ]);
    // distributor 실행
    this.connectToDistributor("127.0.0.1", 9000, (data) => {
      console.log("Distributor Notification", data);
    });
  }

  onRead(socket, data) {
    console.log("onRead", socket.remoteAddress, socket.remotePort, data);
    purchases.onRequest(
      socket,
      data.method,
      data.uri,
      data.params,
      (s, packet) => {
        socket.write(JSON.stringify(packet) + "#");
      }
    );
  }
}

new purchasesServer();
