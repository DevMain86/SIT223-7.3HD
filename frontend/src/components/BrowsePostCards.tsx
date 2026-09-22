import type { Post } from "../types/post";
import { formatDate } from "../utils/formatDate";

interface BrowsePostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggle: () => void;
  onHide: () => void;   // user hides this post from view
}

function BrowsePostCard({ post, isExpanded, onToggle, onHide }: BrowsePostCardProps) {
  // Collapsed preview text
  const snippet =
    post.type === "question"
      ? post.problem
      : post.abstract;

  // Keyboard accessibility: Enter + Space toggle expansion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {

    if (e.target !== e.currentTarget) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      className="browse-card"
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      {/* Title */}
      <h3 className="browse-card__title">{post.title}</h3>

      {/* Meta */}
      <p className="browse-card__meta">
        {post.authorName} • {formatDate(post.createdAt)}
      </p>

      {/* Badges */}
      <div className="browse-card__badges">
        <span className="badge">{post.type}</span>
        <span className={`badge ${post.plan === "paid" ? "badge--paid" : ""}`}>
          {post.plan}
        </span>
      </div>

      {/* Hide button (stopPropagation prevents accidental expand) */}
      <button
        className="browse-card__hide"
        aria-label="Hide this post"
        onClick={(e) => {
          e.stopPropagation();   // prevent expand on hide
          onHide();
        }}
      >
        Hide
      </button>

      {/* Body: snippet when collapsed, full content when expanded */}
      {isExpanded ? (
        post.type === "question" ? (
          <p className="browse-card__full">{post.problem}</p>
        ) : (
          <>
            <p className="browse-card__abstract">{post.abstract}</p>
            <p className="browse-card__full">{post.articleText}</p>
          </>
        )
      ) : (
        <p className="browse-card__snippet">{snippet}</p>
      )}

      {/* Tags */}
      <div className="browse-card__tags">
        {post.tags.map((tag, i) => (
          <span key={i} className="tag">{tag}</span>
        ))}
      </div>

      {/* Toggle affordance */}
      <p className="browse-card__toggle">
        {isExpanded ? "Show less" : "Read more"}
      </p>
    </div>
  );
}

export default BrowsePostCard;