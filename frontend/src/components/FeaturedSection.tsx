import PostCard from "./PostCard";
import type { Post } from "../data/posts";

// Props passed down from app
interface FeaturedSectionProps {
  title: string;
  items: Post[];
  ctaLabel: string;
}

function FeaturedSection({ title, items, ctaLabel }: FeaturedSectionProps) {
  return (
    <section className="featured-section">
      <h2 className="featured-section__title">{title}</h2>

      {/* Turn each post object into a postcard. */}
      <div className="card-grid">
        {items.map((item) => (
          <PostCard key={item.id} {...item} />
        ))}
      </div>

      <button className="see-all-btn" onClick={() => alert(`${ctaLabel} clicked`)}>
        {ctaLabel}
      </button>
    </section>
  );
}

export default FeaturedSection;