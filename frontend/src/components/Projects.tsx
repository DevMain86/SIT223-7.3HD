// Maps the projects data into ProjectCards
import ProjectCard from "./ProjectCard";
import { projects } from "../data/projects";

function Projects() {
  return (
    <section className="work" id="work">
      {projects.map((project) => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </section>
  );
}

export default Projects;