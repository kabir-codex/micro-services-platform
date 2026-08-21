const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("./app");

function request(method, path, body, headers = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, method, path, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        server.close();
        resolve({
          status: res.statusCode,
          contentType: res.headers["content-type"],
          body: data ? JSON.parse(data) : null,
        });
      });
    });
    req.on("error", (err) => {
      server.close();
      reject(err);
    });
    if (body !== undefined) req.write(body);
    req.end();
  });
}

test("unknown routes get a JSON 404, not Express's HTML error page", async () => {
  const res = await request("GET", "/nope");
  assert.strictEqual(res.status, 404);
  assert.match(res.contentType, /application\/json/);
  assert.strictEqual(res.body.error, "not found");
});

test("malformed JSON bodies get a JSON 400, not an HTML parse-error page", async () => {
  const res = await request("POST", "/orders", "{not json", { "Content-Type": "application/json" });
  assert.strictEqual(res.status, 400);
  assert.match(res.contentType, /application\/json/);
  assert.strictEqual(res.body.error, "malformed JSON body");
});
