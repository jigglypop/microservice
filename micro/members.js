import members from "../route/members";
import tcpServer from "../server";

class membersServer extends tcpServer {
  constructor() {
    super("members", process.argv[2] ? Number(process.argv[2]) : 9030, [
      "POST/members",
      "GET/members",
      "DELETE/members",
    ]);
    // distributor 실행
    this.connectToDistributor("127.0.0.1", 9000, (data) => {
      console.log("Distributor Notification", data);
    });
  }

  onRead(socket, data) {
    console.log("onRead", socket.remoteAddress, socket.remotePort, data);
    members.onRequest(
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

new membersServer();
