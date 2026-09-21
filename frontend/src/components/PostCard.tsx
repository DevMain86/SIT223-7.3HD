// Renders a single article/tutorial card. Rendered once per item by
// FeaturedSection's map(). Reuses the Post type as its props, so the
// data shape and the component's inputs are guaranteed to match.
import Rating from "./Rating";
import type { Post } from "../data/posts";

function PostCard({ image, title, description, rating, author }: Post) {
  return (
    <article className="post-card">
      <img className="post-card__image" src={image} alt={title} />
      <h3 className="post-card__title">{title}</h3>
      <p className="post-card__desc">{description}</p>
      <hr />
      <div className="post-card__footer">
        <Rating score={rating} />
        <span className="post-card__author">{author}</span>
      </div>
    </article>
  );
}

export default PostCard;