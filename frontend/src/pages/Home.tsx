// The DEV@Deakin home page
// NavBar and Footer are NOT here; Layout wraps them around every page instead.
import Header from "../components/Header";
import Intro from "../components/Intro";
import Projects from "../components/Projects";
import Gallery from "../components/Gallery";
import FeaturedSection from "../components/FeaturedSection";
import { articles, tutorials } from "../data/posts";

function Home() {
  return (
    <>
      <Header />
      <Intro />
      <Projects />
      <Gallery />
      <FeaturedSection title="Featured Articles" items={articles} ctaLabel="See all articles" />
      <FeaturedSection title="Featured Tutorials" items={tutorials} ctaLabel="See all tutorials" />
    </>
  );
}

export default Home;