import http from "http";
import url from "url";
import querystring from "querystring";
import members from "./route/members";
import goods from "./route/goods";
import purchases from "./route/purchases";

const response = (res, packet) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(packet));
};

const onRequest = (res, method, pathname, params) => {
  switch (pathname) {
    case "/members":
      members(res, method, pathname, params, response);
      break;
    case "/goods":
      goods(res, method, pathname, params, response);
      break;
    case "/purchases":
      purchases(res, method, pathname, params, response);
      break;
    default:
      res.writeHead(404);
      return res.end("<h1>404 Not Found</h1>");
  }
};
const server = http
  .createServer((req, res) => {
    let method = req.method;
    let uri = url.parse(req.url, true);
    let pathname = uri.pathname;

    if (method === "POST" || method === "GET") {
      let body = "";
      req.on("data", function (data) {
        body += data;
      });
      req.on("end", function () {
        let params;
        if (req.headers["content-type"] === "application/json") {
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
  .listen(8000);
