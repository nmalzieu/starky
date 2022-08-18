import "reflect-metadata";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "http";
import { parse } from "url";
import next from "next";
import { launchBot } from "./discord";
import { setupDb } from "./db";
import launchCron from "./cron";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const launchServer = async () => {
  // Setup the database
  await setupDb();
  // Prepare the next app
  await app.prepare();
  // Create the http server ready to receive requests
  // TODO => handle HTTPS
  createHttpServer(async (req, res) => {
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
    console.log(`> Server ready on http://${hostname}:${port}`);
    // Launch the Discord bot
    try {
      await launchBot();
    } catch (e) {
      throw new Error(`[Starkcord Discord Bot Error] ${e}`);
    }
    // Launch the cron
    launchCron();
  });
};

launchServer();

export {};
