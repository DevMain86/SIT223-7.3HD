// Express application: middleware and routes.
// Exported without calling listen() so tests can drive it directly via Supertest.

import express from "express";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Timestamp } from "firebase-admin/firestore";
import { config } from "./config.js";
import { db } from "./firebaseAdmin.js";
import { requireAuth, optionalAuth } from "./middleware/auth.js";
import { validatePost, normaliseTags } from "./validation/postValidation.js";

const app = express();

// Load SendGrid key from environment
sgMail.setApiKey(config.sendgridApiKey);

// Core middleware
app.use(cors());          // allow frontend requests
app.use(express.json());  // parse JSON bodies

// Basic server check
app.get("/", (_req, res) => {
  res.send("DEV@Deakin backend is running.");
});

// Email subscription: validate + send welcome email
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  // Basic email validation
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    console.log("Rejected: invalid email received");
    return res.status(400).json({ message: "A valid email address is required." });
  }

  const msg = {
    to: email,
    from: config.senderEmail,
    subject: "Welcome to DEV@Deakin!",
    text: "Thanks for subscribing to DEV@Deakin. Glad to have you on board!",
    html: "<strong>Thanks for subscribing to DEV@Deakin.</strong><p>Glad to have you on board!</p>",
  };

  try {
    const [response] = await sgMail.send(msg);
    console.log("SendGrid status:", response.statusCode); // success indicator
    return res.status(200).json({ message: "Subscription successful! Check your inbox." });
  } catch (error) {
    console.error("SendGrid error:", error);
    return res.status(500).json({ message: "Failed to send welcome email." });
  }
});

// Registration: validate, hash password, store user
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Basic field checks
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    // Prevent duplicate accounts
    const existing = await db.collection("users").where("email", "==", email).get();
    if (!existing.empty) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Secure password storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      plan: "free",
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection("users").add(newUser);

    return res.status(201).json({ message: "Account created successfully.", userId: docRef.id });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// Login: verify credentials + issue JWT
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Find user
    const snapshot = await db.collection("users").where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Check password
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Create session token
    const token = jwt.sign(
      { userId: userDoc.id, email: user.email },
      config.jwtSecret,
      { expiresIn: "1h" }
    );

    // Return safe user info
    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: userDoc.id, name: user.name, email: user.email, plan: user.plan },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// Upgrade: requires authentication, updates plan to paid
app.post("/upgrade", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId; // guaranteed by requireAuth

    // Fetch user
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    // Skip if already paid
    if (userDoc.data()?.plan === "paid") {
      return res.status(400).json({ message: "You are already on the Paid plan." });
    }

    // Update plan
    await userRef.update({ plan: "paid" });

    return res.status(200).json({ message: "Upgrade successful! You are now on the Paid plan." });
  } catch (error) {
    console.error("Upgrade error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// Create post: validate + store post, only for logged-in users
app.post("/posts", requireAuth, async (req, res) => {
  const validationError = validatePost(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const userId = req.user!.userId;

    // Confirm author exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }

    const { type, plan, title, problem, abstract, articleText } = req.body;

    // Shared fields
    const basePost = {
      type,
      plan,
      title: title.trim(),
      tags: normaliseTags(req.body.tags),
      authorId: userId,
      authorName: userDoc.data()!.name,
      createdAt: Timestamp.now(),
    };

    // Type-specific fields
    const newPost =
      type === "question"
        ? { ...basePost, problem: problem.trim() }
        : { ...basePost, abstract: abstract.trim(), articleText: articleText.trim() };

    const docRef = await db.collection("posts").add(newPost);

    return res.status(201).json({ message: "Post created successfully.", postId: docRef.id });
  } catch (error) {
    console.error("Create post error:", error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// Browse posts: free users see free posts; paid users see all
app.get("/posts", optionalAuth, async (req, res) => {
  try {
    let plan = "free"; // default for visitors

    // If logged in, read current plan from DB
    if (req.user) {
      const userDoc = await db.collection("users").doc(req.user.userId).get();
      if (userDoc.exists) {
        plan = userDoc.data()!.plan;
      }
    }

    // Query based on plan
    let query = db.collection("posts").orderBy("createdAt", "desc");
    if (plan !== "paid") {
      query = query.where("plan", "==", "free");
    }

    const snapshot = await query.get();

    // Attach IDs for frontend use
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ posts });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return res.status(500).json({ message: "Something went wrong fetching posts." });
  }
});

export default app;