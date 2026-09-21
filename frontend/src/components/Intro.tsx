// Profile photo, tagline, and the heading that introduces the projects below.
import profileImg from "../assets/images/profile.jpg";

function Intro() {
  return (
    <section className="intro">
      <img src={profileImg} alt="Stuart's profile photo" className="intro__photo" />
      <p className="intro__tagline">
        Embedded Systems &amp; Full Stack Developer based in Geelong.
      </p>
      <hr className="rule" />
      <h2 className="section-title">Here's what I've done so far</h2>
    </section>
  );
}

export default Intro;