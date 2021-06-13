import net from "net";
import tcpClient from "./client";

export default class tcpServer {
  constructor(name, port, urls) {
    // 이름, 포트번호, urlhd
    this.context = {
      name: name,
      port: port,
      urls: urls,
    };
    this.merge = {};
    // 서버 설정
    this.server = net.createServer((socket) => {
      this.onCreate(socket);
      // 에러, 접속 종료 이벤트
      socket.on("error", (exception) => {
        this.onClose(socket);
      });
      socket.on("close", () => {
        this.onClose(socket);
      });
      socket.on("data", (data) => {
        let key = socket.remoteAddress + ":" + socket.remotePort;
        let sz = this.merge[key]
          ? this.merge[key] + data.toString()
          : data.toString();
        let arr = sz.split("#");
        for (let n in arr) {
          if (sz.charAt(sz.length - 1) !== "#" && n === arr.length - 1) {
            this.merge[key] = arr[n];
            break;
          } else if (arr[n] === "") {
            break;
          } else {
            this.onRead(socket, JSON.parse(arr[n]));
          }
        }
      });
    });
    // 서버 connect
    this.server.listen(port, () => {
      console.log("tcp 서버 connect", this.server.address());
    });
  }

  // 접속
  onCreate(socket) {
    console.log("onCreate", socket.remoteAddress, socket.remotePort);
  }
  // 닫기
  onClose(socket) {
    console.log("onClose", socket.remoteAddress, socket.remotePort);
  }
  // distributor 연결
  connectToDistributor(host, port, onNoti) {
    let packet = {
      uri: "/distributes",
      method: "POST",
      key: 0,
      params: this.context,
    };
    let isConnectedDistributor = false;
    // client 연결
    this.clientDistributor = new tcpClient(
      host,
      port,
      // distributor 접속
      (options) => {
        isConnectedDistributor = true;
        this.clientDistributor.write(packet);
      },
      // distributor 수신
      (options, data) => {
        onNoti(data);
      },
      // distributor 종료
      (options) => {
        isConnectedDistributor = false;
      },
      // distributor 에러
      (options) => {
        isConnectedDistributor = false;
      }
    );
    setInterval(() => {
      if (isConnectedDistributor !== true) {
        this.clientDistributor.connect();
      }
    }, 3000);
  }
}
