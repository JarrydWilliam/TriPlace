import app, { serverPromise } from "../server/index.js";

export default async function handler(req: any, res: any) {
  // Ensure the server (and routes) are initialized before handling the request
  await serverPromise;

  // On Vercel, rewrite rules can set req.url to /api/index.ts.
  // Restore the original incoming request path so Express matches /api/* routes properly.
  const matchedPath = req.headers["x-matched-path"];
  if (matchedPath && typeof matchedPath === "string" && matchedPath.startsWith("/api")) {
    req.url = matchedPath;
  }

  return app(req, res);
}
