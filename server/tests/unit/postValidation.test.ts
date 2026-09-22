// Unit tests for post validation: pure functions, no mocking required.

import { describe, it, expect } from "vitest";
import { normaliseTags, validatePost } from "../../src/validation/postValidation.js";

describe("normaliseTags", () => {
  it("splits, trims and lowercases comma-separated tags", () => {
    expect(normaliseTags(" React, TypeScript ,Node ")).toEqual(["react", "typescript", "node"]);
  });

  it("drops empty entries between commas", () => {
    expect(normaliseTags("react,, ,node")).toEqual(["react", "node"]);
  });

  it("caps the result at three tags", () => {
    expect(normaliseTags("a,b,c,d,e")).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for non-string input", () => {
    expect(normaliseTags(undefined)).toEqual([]);
    expect(normaliseTags(42)).toEqual([]);
    expect(normaliseTags(["react"])).toEqual([]);
  });
});

describe("validatePost", () => {
  const validQuestion = {
    type: "question",
    plan: "free",
    title: "How do hooks work?",
    problem: "I am confused by useEffect.",
    tags: "react",
  };

  const validArticle = {
    type: "article",
    plan: "paid",
    title: "Intro to TypeScript",
    abstract: "A short introduction.",
    articleText: "The full article text.",
    tags: "typescript",
  };

  it("accepts a valid question", () => {
    expect(validatePost(validQuestion)).toBeNull();
  });

  it("accepts a valid article", () => {
    expect(validatePost(validArticle)).toBeNull();
  });

  it.each([
    ["an unknown post type", { ...validQuestion, type: "poll" }, "Post type must be either a question or an article."],
    ["an unknown plan", { ...validQuestion, plan: "gold" }, "Post plan must be either free or paid."],
    ["a missing title", { ...validQuestion, title: "" }, "Please enter a title."],
    ["a whitespace-only title", { ...validQuestion, title: "   " }, "Please enter a title."],
    ["a non-string title", { ...validQuestion, title: 123 }, "Please enter a title."],
    ["a question with no problem", { ...validQuestion, problem: "" }, "Please describe your problem."],
    ["an article with no abstract", { ...validArticle, abstract: "" }, "Please enter an abstract."],
    ["an article with blank text", { ...validArticle, articleText: "  " }, "Please enter the article text."],
    ["no usable tags", { ...validQuestion, tags: " , , " }, "Please add at least one tag."],
  ])("rejects %s", (_label, body, expected) => {
    expect(validatePost(body)).toBe(expected);
  });
});