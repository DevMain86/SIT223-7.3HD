import { apiUrl } from "../utils/api";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

function Post() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");

  // Core post settings
  const [postType, setPostType] = useState("question"); 
  const [plan, setPlan] = useState("free");             

  // Shared fields
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");

  // Question-only field
  const [problem, setProblem] = useState("");

  // Article-only fields
  const [abstract, setAbstract] = useState("");
  const [articleText, setArticleText] = useState("");

  // Logged-out users see a guard screen (backend still enforces auth)
  if (!user) {
    return (
      <div className="post-page">
        <div className="post-card">
          <h2 className="post-card__title">New Post</h2>
          <p>You need to be logged in to create a post.</p>
          <Link to="/login">Log in</Link>
        </div>
      </div>
    );
  }

  const handlePost = async () => {
    // Shared validation
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    // Type-specific validation
    if (postType === "question") {
      if (!problem.trim()) {
        setError("Please describe your problem.");
        return;
      }
    } else {
      if (!abstract.trim()) {
        setError("Please enter an abstract.");
        return;
      }
      if (!articleText.trim()) {
        setError("Please enter the article text.");
        return;
      }
    }

    // Tags required
    if (!tags.trim()) {
      setError("Please add at least one tag.");
      return;
    }

    setError("");

    // Build request body based on post type
    const body =
      postType === "question"
        ? { type: "question", plan, title, tags, problem }
        : { type: "article", plan, title, tags, abstract, articleText };

    try {
      const response = await fetch(apiUrl("/posts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to create post.");
        return;
      }

      // Reset form on success
      setTitle("");
      setTags("");
      setProblem("");
      setAbstract("");
      setArticleText("");
      setError("");

      toast.success("Post created successfully!");
      navigate("/browse");
    } catch {
      toast.error("Could not reach the server.");
    }
  };

  return (
    <div className="post-page">
      <div className="post-card">
        <h2 className="post-card__title">New Post</h2>

        {/* Choose question or article */}
        <div className="post-type">
          <span className="post-type__label">Select Post Type:</span>

          <label className="post-type__option">
            <input
              type="radio"
              name="postType"
              value="question"
              checked={postType === "question"}
              onChange={(e) => setPostType(e.target.value)}
            />
            Question
          </label>

          <label className="post-type__option">
            <input
              type="radio"
              name="postType"
              value="article"
              checked={postType === "article"}
              onChange={(e) => setPostType(e.target.value)}
            />
            Article
          </label>
        </div>

        {/* Choose free or paid visibility */}
        <div className="post-type">
          <span className="post-type__label">Select Post Plan:</span>

          <label className="post-type__option">
            <input
              type="radio"
              name="postPlan"
              value="free"
              checked={plan === "free"}
              onChange={(e) => setPlan(e.target.value)}
            />
            Free
          </label>

          <label className="post-type__option">
            <input
              type="radio"
              name="postPlan"
              value="paid"
              checked={plan === "paid"}
              onChange={(e) => setPlan(e.target.value)}
            />
            Paid
          </label>
        </div>

        <p className="post-hint">What do you want to ask or share?</p>

        {/* Title field */}
        <label className="post-label">Title</label>
        <input
          className="post-input"
          type="text"
          placeholder={
            postType === "question"
              ? "Start your question with how, what, why, etc."
              : "Enter a descriptive title"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Fields that depend on post type */}
        {postType === "question" ? (
          <>
            <label className="post-label">Describe your problem</label>
            <textarea
              className="post-textarea"
              rows={8}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="post-label">Abstract</label>
            <textarea
              className="post-textarea"
              rows={3}
              placeholder="Enter a 1-paragraph abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
            />

            <label className="post-label">Article Text</label>
            <textarea
              className="post-textarea"
              rows={8}
              placeholder="Enter your article content"
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
            />
          </>
        )}

        {/* Tags */}
        <label className="post-label">Tags</label>
        <input
          className="post-input"
          type="text"
          placeholder={
            postType === "question"
              ? "Add up to 3 tags describing your question"
              : "Add up to 3 tags describing your article"
          }
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        {error && <p className="post-error">{error}</p>}

        <button className="post-button" onClick={handlePost}>
          Post
        </button>
      </div>
    </div>
  );
}

export default Post;
