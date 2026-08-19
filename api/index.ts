import app, { serverPromise } from "../server/index.js";

export default async function handler(req: any, res: any) {
  // Ensure the server (and routes) are initialized before handling the request
  await serverPromise;
  return app(req, res);
}
