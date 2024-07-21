import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { Session, sessionMiddleware } from "hono-sessions";
import { BunSqliteStore } from "hono-sessions/bun-sqlite-store";
import { serveStatic } from "hono/bun";
import PocketBase from "pocketbase";
import { z } from "zod";
import { pull } from "./replicache/pull";
import { push } from "./replicache/push";

const app = new Hono<{
  Variables: {
    session: Session;
  };
}>();

const db = new Database(
  process.env.NODE_ENV === "production" ? "/data/sessions.db" : "./sessions.db",
);
const store = new BunSqliteStore(db);

app.use(
  sessionMiddleware({
    store,
    // encryptionKey: "password_at_least_32_characters_long", // Required for CookieStore, recommended for others
    expireAfterSeconds: 14 * 24 * 60, // Expire session after 14 days of inactivity
    cookieOptions: {
      sameSite: "Lax", // Recommended for basic CSRF protection in modern browsers
      path: "/", // Required for this library to work properly
      httpOnly: true, // Recommended to avoid XSS attacks
    },
  }),
);

function getPocketbase(token: string) {
  if (!process.env.POCKETBASE_PRIVATE_URL) {
    throw new Error("POCKETBASE_PRIVATE_URL not defined");
  }
  console.log("POCKETBASE_PRIVATE_URL", process.env.POCKETBASE_PRIVATE_URL);

  const pb = new PocketBase(process.env.POCKETBASE_PRIVATE_URL);
  pb.authStore.save(token);
  pb.autoCancellation(false);

  return pb;
}

app.post("/api/push", async (c) => {
  const token = c.req.header("authorization");
  if (!token) {
    return c.text("Unauthorized", 401);
  }
  const pb = getPocketbase(token);

  const userID = z.string().parse(c.req.query("userID"));
  const requestBody = await c.req.json();
  await push(pb, userID, requestBody);

  return c.json({}, 200);
});

app.post("/api/pull", async (c) => {
  const token = c.req.header("authorization");
  if (!token) {
    return c.text("Unauthorized", 401);
  }
  const pb = getPocketbase(token);
  const session = c.get("session");

  const userID = z.string().parse(c.req.query("userID"));
  const requestBody = await c.req.json();
  return c.json(await pull(session, pb, userID, requestBody));
});

app
  .use("*", serveStatic({ root: "./dist" }))
  .use("*", serveStatic({ path: "index.html", root: "./dist" }));

export default {
  fetch: app.fetch,
  port: process.env.PORT ? Number(process.env.PORT) : 3001,
};
