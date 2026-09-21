import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import type { Post } from "../types/post";
import BrowsePostCard from "../components/BrowsePostCards";

function Browse() {
  const { token } = useAuth();

  // Source list from backend
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Expanded card ID; null means all collapsed
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  // Filter state; "all" means no filtering applied
  const [typeFilter, setTypeFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // IDs of posts the user has hidden from view (client-side only)
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const hidePost = (id: string) => {
    setHiddenIds((current) => [...current, id]);
  };

  // Fetch posts; include auth only when logged in
  useEffect(() => {
    const fetchPosts = async () => {
      setError("");

      try {
        const response = await fetch("http://localhost:3000/posts", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to fetch posts.");
          return;
        }

        setPosts(data.posts);
        setExpandedId(null); // clear stale expansion
      } catch {
        setError("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [token]);

  // All unique tags across posts, sorted
  const availableTags = useMemo(() => {
    const tags = posts.flatMap((post) => post.tags);
    return [...new Set(tags)].sort();
  }, [posts]);

  // Filtered + hidden view of posts; derived, never stored
  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (hiddenIds.includes(post.id)) return false;
      if (typeFilter !== "all" && post.type !== typeFilter) return false;
      if (planFilter !== "all" && post.plan !== planFilter) return false;
      if (tagFilter !== "all" && !post.tags.includes(tagFilter)) return false;

      if (dateFilter !== "all") {
        const days = dateFilter === "week" ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (post.createdAt._seconds * 1000 < cutoff) return false;
      }

      return true;
    });
  }, [posts, hiddenIds, typeFilter, planFilter, tagFilter, dateFilter]);

  // Loading
  if (loading) {
    return (
      <div className="browse-page">
        <p className="browse-loading">Loading posts...</p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="browse-page">
        <p className="browse-error">{error}</p>
      </div>
    );
  }

  // Backend returned no posts at all
  if (posts.length === 0) {
    return (
      <div className="browse-page">
        <p className="browse-empty">No posts available.</p>
      </div>
    );
  }

  return (
    <div className="browse-page">
      <h2 className="browse-title">Browse Posts</h2>

      {/* Filter controls */}
      <div className="browse-filters">
        <label>
          Type:
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="question">Questions</option>
            <option value="article">Articles</option>
          </select>
        </label>

        <label>
          Plan:
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </label>

        <label>
          Tag:
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="all">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>

        <label>
          Date:
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">Any time</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
          </select>
        </label>

        {/* Reset button — only shown when something is active */}
        {(typeFilter !== "all" ||
          planFilter !== "all" ||
          tagFilter !== "all" ||
          dateFilter !== "all" ||
          hiddenIds.length > 0) && (
          <button
            className="browse-reset"
            onClick={() => {
              setTypeFilter("all");
              setPlanFilter("all");
              setTagFilter("all");
              setDateFilter("all");
              setHiddenIds([]);
              setExpandedId(null);
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Count of visible posts */}
      <p className="browse-count">
        Showing {visiblePosts.length} of {posts.length} posts
      </p>

      {/* List or filtered-empty message */}
      {visiblePosts.length === 0 ? (
        <p className="browse-empty">No posts match your filters.</p>
      ) : (
        <div className="browse-list">
          {visiblePosts.map((post) => (
            <BrowsePostCard
              key={post.id}
              post={post}
              isExpanded={post.id === expandedId}
              onToggle={() => toggleExpanded(post.id)}
              onHide={() => hidePost(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Browse;