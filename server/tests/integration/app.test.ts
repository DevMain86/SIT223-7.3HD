// Integration tests: drive the real Express app through Supertest.
// Firestore and SendGrid are replaced with controllable fakes, so the tests
// exercise routing, middleware, validation and response shapes without any network.

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// --- Fakes -----------------------------------------------------------------
// vi.hoisted runs before the mocked modules are imported, so the fakes exist
// by the time app.ts pulls in firebaseAdmin and SendGrid.

const fake = vi.hoisted(() => {
  // A chainable Firestore query: where()/orderBy() return the query itself
  const query = { where: vi.fn(), orderBy: vi.fn(), get: vi.fn() };
  query.where.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);

  const docRef = { get: vi.fn(), update: vi.fn() };
  const collection = { ...query, doc: vi.fn(() => docRef), add: vi.fn() };
  const db = { collection: vi.fn(() => collection) };

  const sendgrid = { setApiKey: vi.fn(), send: vi.fn() };

  return { query, docRef, collection, db, sendgrid };
});

vi.mock("../../src/firebaseAdmin.js", () => ({ db: fake.db }));
vi.mock("@sendgrid/mail", () => ({ default: fake.sendgrid }));

import app from "../../src/app.js";

// --- Helpers ---------------------------------------------------------------

const TEST_SECRET = "test-jwt-secret";
const tokenFor = (userId = "user-1", email = "user@example.com") =>
  jwt.sign({ userId, email }, TEST_SECRET, { expiresIn: "1h" });

const userDoc = (data: object) => ({ exists: true, data: () => data });
const missingDoc = { exists: false, data: () => undefined };
const snapshot = (docs: { id: string; data: object }[]) => ({
  empty: docs.length === 0,
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

// Expected failures log errors by design; keep test output readable
const silenceErrors = () => vi.spyOn(console, "error").mockImplementation(() => {});

// --- Service endpoints -----------------------------------------------------

describe("service endpoints", () => {
  it("GET / confirms the backend is running", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("DEV@Deakin backend is running.");
  });

  it("GET /health reports status and the running version", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", version: "test" });
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /metrics exposes Prometheus metrics", async () => {
    await request(app).get("/health"); // generate at least one counted request
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain('app_info{version="test"} 1');
    expect(res.text).toContain("http_requests_total");
  });

  it("returns 404 for an unknown route", async () => {
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
  });
});

// --- GET /posts ------------------------------------------------------------

describe("GET /posts", () => {
  it("shows visitors free posts only", async () => {
    fake.query.get.mockResolvedValueOnce(
      snapshot([{ id: "p1", data: { title: "A free post", plan: "free" } }])
    );

    const res = await request(app).get("/posts");

    expect(res.status).toBe(200);
    expect(res.body.posts).toEqual([{ id: "p1", title: "A free post", plan: "free" }]);
    expect(fake.query.where).toHaveBeenCalledWith("plan", "==", "free");
  });

  it("shows paid users every post, with no plan filter", async () => {
    fake.docRef.get.mockResolvedValueOnce(userDoc({ plan: "paid" }));
    fake.query.get.mockResolvedValueOnce(
      snapshot([
        { id: "p1", data: { plan: "free" } },
        { id: "p2", data: { plan: "paid" } },
      ])
    );

    const res = await request(app).get("/posts").set("Authorization", `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(fake.query.where).not.toHaveBeenCalled();
  });

  it("treats a logged-in free user like a visitor", async () => {
    fake.docRef.get.mockResolvedValueOnce(userDoc({ plan: "free" }));
    fake.query.get.mockResolvedValueOnce(snapshot([]));

    await request(app).get("/posts").set("Authorization", `Bearer ${tokenFor()}`);

    expect(fake.query.where).toHaveBeenCalledWith("plan", "==", "free");
  });

  it("returns 500 when the database fails", async () => {
    silenceErrors();
    fake.query.get.mockRejectedValueOnce(new Error("Firestore unavailable"));

    const res = await request(app).get("/posts");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Something went wrong fetching posts.");
  });
});

// --- POST /posts -----------------------------------------------------------

describe("POST /posts", () => {
  const validQuestion = {
    type: "question",
    plan: "free",
    title: "  How do hooks work?  ",
    problem: "I am confused by useEffect.",
    tags: "React, Hooks",
  };

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/posts").send(validQuestion);
    expect(res.status).toBe(401);
    expect(fake.collection.add).not.toHaveBeenCalled();
  });

  it("rejects an invalid post before touching the database", async () => {
    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ ...validQuestion, title: "" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please enter a title.");
    expect(fake.collection.add).not.toHaveBeenCalled();
  });

  it("stores a valid post with trimmed title and normalised tags", async () => {
    fake.docRef.get.mockResolvedValueOnce(userDoc({ name: "Test User" }));
    fake.collection.add.mockResolvedValueOnce({ id: "new-post" });

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${tokenFor("user-1")}`)
      .send(validQuestion);

    expect(res.status).toBe(201);
    expect(res.body.postId).toBe("new-post");
    expect(fake.collection.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "How do hooks work?",
        tags: ["react", "hooks"],
        authorId: "user-1",
        authorName: "Test User",
      })
    );
  });

  it("rejects a token whose user no longer exists", async () => {
    fake.docRef.get.mockResolvedValueOnce(missingDoc);

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send(validQuestion);

    expect(res.status).toBe(401);
    expect(fake.collection.add).not.toHaveBeenCalled();
  });
});

// --- POST /register --------------------------------------------------------

describe("POST /register", () => {
  const valid = { name: "New User", email: "new@example.com", password: "secret123" };

  it.each([
    ["a missing name", { ...valid, name: "" }, "All fields are required."],
    ["a malformed email", { ...valid, email: "not-an-email" }, "Please enter a valid email address."],
    ["a short password", { ...valid, password: "12345" }, "Password must be at least 6 characters."],
  ])("rejects %s", async (_label, body, message) => {
    const res = await request(app).post("/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it("rejects a duplicate email with 409", async () => {
    fake.query.get.mockResolvedValueOnce(snapshot([{ id: "existing", data: {} }]));

    const res = await request(app).post("/register").send(valid);

    expect(res.status).toBe(409);
    expect(fake.collection.add).not.toHaveBeenCalled();
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    fake.query.get.mockResolvedValueOnce(snapshot([]));
    fake.collection.add.mockResolvedValueOnce({ id: "new-user" });

    const res = await request(app).post("/register").send(valid);

    expect(res.status).toBe(201);
    const stored = fake.collection.add.mock.calls[0][0];
    expect(stored.password).not.toBe(valid.password);
    expect(bcrypt.compareSync(valid.password, stored.password)).toBe(true);
    expect(stored.plan).toBe("free");
  });
});

// --- POST /login -----------------------------------------------------------

describe("POST /login", () => {
  const passwordHash = bcrypt.hashSync("correct-password", 4); // low cost keeps tests fast
  const storedUser = {
    id: "user-1",
    data: { name: "Test User", email: "user@example.com", password: passwordHash, plan: "free" },
  };

  it("rejects missing credentials", async () => {
    const res = await request(app).post("/login").send({ email: "" });
    expect(res.status).toBe(400);
  });

  it("gives the same response for an unknown email as a wrong password", async () => {
    fake.query.get.mockResolvedValueOnce(snapshot([]));
    const unknown = await request(app)
      .post("/login")
      .send({ email: "nobody@example.com", password: "whatever" });

    fake.query.get.mockResolvedValueOnce(snapshot([storedUser]));
    const wrong = await request(app)
      .post("/login")
      .send({ email: "user@example.com", password: "wrong-password" });

    // Identical responses stop attackers discovering which emails are registered
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("issues a valid JWT and never returns the password hash", async () => {
    fake.query.get.mockResolvedValueOnce(snapshot([storedUser]));

    const res = await request(app)
      .post("/login")
      .send({ email: "user@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, TEST_SECRET) as { userId: string };
    expect(decoded.userId).toBe("user-1");
    expect(res.body.user).not.toHaveProperty("password");
  });
});

// --- POST /upgrade ---------------------------------------------------------

describe("POST /upgrade", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/upgrade");
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user does not exist", async () => {
    fake.docRef.get.mockResolvedValueOnce(missingDoc);
    const res = await request(app).post("/upgrade").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(404);
  });

  it("refuses to upgrade a user who is already paid", async () => {
    fake.docRef.get.mockResolvedValueOnce(userDoc({ plan: "paid" }));
    const res = await request(app).post("/upgrade").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(400);
    expect(fake.docRef.update).not.toHaveBeenCalled();
  });

  it("upgrades a free user to paid", async () => {
    fake.docRef.get.mockResolvedValueOnce(userDoc({ plan: "free" }));
    const res = await request(app).post("/upgrade").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(fake.docRef.update).toHaveBeenCalledWith({ plan: "paid" });
  });
});

// --- POST /subscribe -------------------------------------------------------

describe("POST /subscribe", () => {
  it("rejects an invalid email without calling SendGrid", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await request(app).post("/subscribe").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(fake.sendgrid.send).not.toHaveBeenCalled();
  });

  it("sends a welcome email to a valid address", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    fake.sendgrid.send.mockResolvedValueOnce([{ statusCode: 202 }]);

    const res = await request(app).post("/subscribe").send({ email: "reader@example.com" });

    expect(res.status).toBe(200);
    expect(fake.sendgrid.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "reader@example.com", from: "noreply@test.dev" })
    );
  });

  it("returns 500 when SendGrid fails", async () => {
    silenceErrors();
    fake.sendgrid.send.mockRejectedValueOnce(new Error("SendGrid down"));

    const res = await request(app).post("/subscribe").send({ email: "reader@example.com" });

    expect(res.status).toBe(500);
  });
});