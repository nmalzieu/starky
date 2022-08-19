import "reflect-metadata";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "http";
import { parse } from "url";
import next from "next";
import { launchBot } from "./discord";
import { setupDb } from "./db";
import launchCron from "./cron";
import config from "./config";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: config.HOST, port: config.PORT });
const handle = app.getRequestHandler();

const launchServer = async () => {
  // Setup the database
  await setupDb();
  // Prepare the next app
  await app.prepare();
  // Create the http server ready to receive requests
  // TODO => handle HTTPS
  const isHttps = false;
  const createServer = isHttps ? createHttpsServer : createHttpServer;
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  }).listen(config.PORT, async () => {
    console.log(
      `> Server ready on http${isHttps ? "s" : ""}://${config.HOST}:${
        config.PORT
      }`
    );
    // Launch the Discord bot
    try {
      await launchBot();
    } catch (e) {
      throw new Error(`[Starky Discord Bot Error] ${e}`);
    }
    // Launch the cron
    launchCron();
  });
};

launchServer();

export {};
