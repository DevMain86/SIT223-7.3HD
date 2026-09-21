// Renders a single portfolio project. Rendered once per item by Projects map().
import type { Project } from "../data/projects";

function ProjectCard({ image, name, description, link }: Project) {
  return (
    <article className="project">
      <img src={image} alt={name} className="project__img" />
      <div className="project__body">
        <h3 className="project__name">{name}</h3>
        <p className="project__desc">{description}</p>
        <a className="project__link" href={link} target="_blank" rel="noopener">
          {link}
        </a>
      </div>
    </article>
  );
}

export default ProjectCard;