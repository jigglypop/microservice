import http from "http";
import url from "url";
import querystring from "querystring";
import tcpClient from "./client";

let mapClients = {};
let mapUrls = {};
let mapResponse = {};
let mapRR = {};
let index = 0;

// Distributor 접속 처리
const onDistribute = (data) => {
  for (let n in data.params) {
    let node = data.params[n];
    let key = node.host + ":" + node.port;
    if (mapClients[key] == null && node.name != "gate") {
      let client = new tcpClient(
        node.host,
        node.port,
        onCreateClient,
        onReadClient,
        onEndClient,
        onErrorClient
      );
      mapClients[key] = {
        client: client,
        info: node,
      };
      for (let m in node.urls) {
        let key = node.urls[m];
        if (mapUrls[key] == null) {
          mapUrls[key] = [];
        }
        mapUrls[key].push(client);
      }
      client.connect();
    }
  }
};

// 마이크로서비스 접속 이벤트 처리
const onCreateClient = (options) => {
  console.log("클라이언트 접속 : ", options);
};

// 마이크로서비스 응답 처리
const onReadClient = (options, packet) => {
  console.log("클라이언트 응답 : ", packet);
  mapResponse[packet.key].writeHead(200, {
    "Content-Type": "application/json",
  });
  mapResponse[packet.key].end(JSON.stringify(packet));
  delete mapResponse[packet.key]; // http 응답객체 삭제
};

// 마이크로서비스 접속 종료 처리
const onEndClient = (options) => {
  let key = options.host + ":" + options.port;
  console.log("클라이언트 접속 종료 : ", mapClients[key]);
  for (let n in mapClients[key].info.urls) {
    let node = mapClients[key].info.urls[n];
    delete mapUrls[node];
  }
  delete mapClients[key];
};

// 마이크로서비스 접속 에러 처리
const onErrorClient = (options) => {
  console.log("onErrorClient");
};

// HTTP 서버 생성
// API 호출 처리
const onRequest = (res, method, pathname, params) => {
  let key = method + pathname;
  let client = mapUrls[key];
  // API 요청이 오면 현재 처리 가능한 마이크로 서비스 API들을 확인해 처리 가능한 API만 처리하도록 함
  console.log("현재 가능한 url : ", mapUrls);
  if (client == null) {
    res.writeHead(404);
    res.end();
    return;
    // 클라이언트 목록에 있으면 처리
  } else {
    params.key = index; // API호출에 대한 고유 키값 설정
    let packet = {
      uri: pathname,
      method: method,
      params: params,
    };
    mapResponse[index] = res;
    index++;
    console.log("응답 : ", index, mapResponse);
    // 라운드 로빈 처리
    if (mapRR[key] == null) {
      mapRR[key] = 0;
    }
    mapRR[key]++;
    client[mapRR[key] % client.length].write(packet);
    console.log(
      "라운드 로빈 : ",
      mapRR,
      key,
      index,
      mapRR[key] % client.length,
      client[mapRR[key] % client.length]
    );
  }
};

const server = http
  .createServer((req, res) => {
    let method = req.method;
    let uri = url.parse(req.url, true);
    let pathname = uri.pathname;

    if (method === "POST" || method === "PUT") {
      let body = "";
      req.on("data", function (data) {
        body += data;
      });
      req.on("end", function () {
        let params;
        if (req.headers["content-type"] == "application/json") {
          params = JSON.parse(body);
        } else {
          params = querystring.parse(body);
        }
        onRequest(res, method, pathname, params);
      });
    } else {
      onRequest(res, method, pathname, uri.query);
    }
  })
  .listen(8000, () => {
    console.log("gate 서버 시작 : ", server.address());

    // Distributor와 의 통신 처리
    let packet = {
      uri: "/distributes",
      method: "POST",
      key: 0,
      params: {
        port: 8000,
        name: "gate",
        urls: [],
      },
    };
    let isConnectedDistributor = false;

    let clientDistributor = new tcpClient(
      "127.0.0.1",
      9000,
      (options) => {
        // 접속 이벤트
        isConnectedDistributor = true;
        clientDistributor.write(packet);
      },
      (options, data) => {
        onDistribute(data);
      }, // 데이터 수신 이벤트
      (options) => {
        isConnectedDistributor = false;
      }, // 접속종료 이벤트
      (options) => {
        isConnectedDistributor = false;
      } // 에러 이벤트
    );

    // 주기적인 Distributor 접속 상태 확인
    setInterval(() => {
      if (isConnectedDistributor != true) {
        clientDistributor.connect();
      }
    }, 3000);
  });
