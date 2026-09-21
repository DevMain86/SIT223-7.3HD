// Images are imported so Vite can process and fingerprint them at build time
import img1 from "../assets/images/cover_hotdog.jpg";
import img2 from "../assets/images/RPi.jpg";
import img3 from "../assets/images/arduino.jpg";
import img4 from "../assets/images/EnvMonitor.jpg";

// Photo data kept inline
const photos = [
  { id: 1, src: img1, alt: "Project Hot Dog cover" },
  { id: 2, src: img2, alt: "Raspberry Pi" },
  { id: 3, src: img3, alt: "Arduino board" },
  { id: 4, src: img4, alt: "Office Environment Monitor" },
];

function Gallery() {
  return (
    <section className="gallery">
      <hr className="rule" />
      <h2 className="section-title">My photos</h2>
      <div className="gallery__grid">
        {photos.map((photo) => (
          <img key={photo.id} src={photo.src} alt={photo.alt} />
        ))}
      </div>
    </section>
  );
}

export default Gallery;