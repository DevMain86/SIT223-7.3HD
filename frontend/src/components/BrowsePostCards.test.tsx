import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BrowsePostCard from "./BrowsePostCards";
import type { ArticlePost, Post, QuestionPost } from "../types/post";

const createdAt = { _seconds: Date.parse("2026-09-22T12:00:00Z") / 1000, _nanoseconds: 0 };

const question: QuestionPost = {
  id: "q1",
  type: "question",
  plan: "free",
  title: "How do I use useMemo?",
  tags: ["react", "hooks", "performance"],
  authorId: "u1",
  authorName: "Erling Haaland",
  createdAt,
  problem: "I am not sure when useMemo is actually worth using.",
};

const article: ArticlePost = {
  id: "a1",
  type: "article",
  plan: "paid",
  title: "Tips for learning TS",
  tags: ["typescript"],
  authorId: "u2",
  authorName: "John McGinn",
  createdAt,
  abstract: "Hello world, lets talk about TS...",
  articleText: "The full article body about TypeScript.",
};

function renderCard(post: Post, isExpanded = false) {
  const onToggle = vi.fn();
  const onHide = vi.fn();
  const user = userEvent.setup();
  render(
    <BrowsePostCard post={post} isExpanded={isExpanded} onToggle={onToggle} onHide={onHide} />
  );
  const card = screen.getByRole("button", { name: new RegExp(post.title) });
  const hideButton = screen.getByRole("button", { name: "Hide this post" });
  return { onToggle, onHide, user, card, hideButton };
}

describe("BrowsePostCard content", () => {
  it("shows the title, author and formatted date", () => {
    renderCard(question);
    expect(screen.getByRole("heading", { name: "How do I use useMemo?" })).toBeInTheDocument();
    expect(screen.getByText("Erling Haaland • 22/09/2026")).toBeInTheDocument();
  });

  it("renders every tag", () => {
    renderCard(question);
    for (const tag of question.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it("styles the plan badge differently for paid posts", () => {
    renderCard(article);
    expect(screen.getByText("paid")).toHaveClass("badge--paid");
  });

  it("does not apply paid styling to free posts", () => {
    renderCard(question);
    expect(screen.getByText("free")).not.toHaveClass("badge--paid");
  });
});

describe("BrowsePostCard expand and collapse", () => {
  it("shows a question's problem as the collapsed preview", () => {
    renderCard(question);
    expect(screen.getByText(question.problem)).toHaveClass("browse-card__snippet");
    expect(screen.getByText("Read more")).toBeInTheDocument();
  });

  it("previews an article with its abstract, hiding the full text", () => {
    renderCard(article);
    expect(screen.getByText(article.abstract)).toHaveClass("browse-card__snippet");
    expect(screen.queryByText(article.articleText)).not.toBeInTheDocument();
  });

  it("shows an expanded article's abstract and full text", () => {
    renderCard(article, true);
    expect(screen.getByText(article.abstract)).toHaveClass("browse-card__abstract");
    expect(screen.getByText(article.articleText)).toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });
});

describe("BrowsePostCard interaction", () => {
  it("toggles when the card is clicked", async () => {
    const { user, card, onToggle } = renderCard(question);
    await user.click(card);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("is reachable by keyboard", async () => {
    const { user, card } = renderCard(question);
    await user.tab();
    expect(card).toHaveFocus();
  });

  it("toggles on Enter and on Space", async () => {
    const { user, onToggle } = renderCard(question);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys", async () => {
    const { user, onToggle } = renderCard(question);
    await user.tab();
    await user.keyboard("a");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("hides the post on click without expanding it", async () => {
    const { user, hideButton, onHide, onToggle } = renderCard(question);
    await user.click(hideButton);
    expect(onHide).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("hides the post from the keyboard without expanding it", async () => {
    const { user, hideButton, onHide, onToggle } = renderCard(question);
    await user.tab();
    await user.tab();
    expect(hideButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onHide).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });
});