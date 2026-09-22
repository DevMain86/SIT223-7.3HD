// Unit tests for the auth middleware, driven with minimal fake request/response objects.
// Tokens are signed with the same test secret that vitest.config.ts supplies.

import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, optionalAuth } from "../../src/middleware/auth.js";

const TEST_SECRET = "test-jwt-secret";
const USER = { userId: "user-123", email: "test@example.com" };

const signToken = (payload: object = USER, secret = TEST_SECRET) =>
  jwt.sign(payload, secret, { expiresIn: "1h" });

function fakeReq(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as Request;
}

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

type Middleware = (req: Request, res: Response, next: NextFunction) => unknown;

function run(middleware: Middleware, authorization?: string) {
  const req = fakeReq(authorization);
  const res = fakeRes();
  const next = vi.fn() as NextFunction;
  middleware(req, res as unknown as Response, next);
  return { req, res, next };
}

describe("requireAuth", () => {
  it("rejects a request with no Authorization header", () => {
    const { res, next } = run(requireAuth);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "You must be logged in to do that." });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a header that does not use the Bearer scheme", () => {
    const { res, next } = run(requireAuth, `Basic ${signToken()}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a malformed token", () => {
    const { res, next } = run(requireAuth, "Bearer not-a-real-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired session. Please log in again." });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token signed with a different secret", () => {
    const { res, next } = run(requireAuth, `Bearer ${signToken(USER, "attacker-secret")}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ ...USER, exp: Math.floor(Date.now() / 1000) - 60 }, TEST_SECRET);
    const { res, next } = run(requireAuth, `Bearer ${expired}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token and attaches the user to the request", () => {
    const { req, res, next } = run(requireAuth, `Bearer ${signToken()}`);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject(USER);
  });
});

describe("optionalAuth", () => {
  it("continues as a guest when no token is supplied", () => {
    const { req, next } = run(optionalAuth);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it("attaches the user when a valid token is supplied", () => {
    const { req, next } = run(optionalAuth, `Bearer ${signToken()}`);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject(USER);
  });

  it("treats an invalid token as a guest rather than rejecting", () => {
    const { req, res, next } = run(optionalAuth, "Bearer not-a-real-token");
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});