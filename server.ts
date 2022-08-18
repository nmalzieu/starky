import "reflect-metadata";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { launchBot } from "./discord";
import { setupDb } from "./db";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const launchServer = async () => {
  await setupDb();
  await app.prepare();
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  }).listen(port, async (err: any) => {
    if (err) throw err;
    try {
      await launchBot();
    } catch (e) {
      throw new Error(`[Starkbot] ${e}`);
    }
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
};

launchServer();

export {};
