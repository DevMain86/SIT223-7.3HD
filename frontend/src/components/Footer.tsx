import { FaFacebook, FaInstagram, FaXTwitter } from "react-icons/fa6";
import FooterColumn from "./FooterColumn";
import SubscribeBar from "./SubscribeBar";

function Footer() {
  return (
    <footer className="footer">
      <SubscribeBar />
      
      {/* Explore site and support - currently they are place holders */}
      <div className="footer__columns">
        <FooterColumn heading="Explore" links={["Home", "Questions", "Articles", "Tutorials"]} />
        <FooterColumn heading="Support" links={["FAQs", "Help", "Contact Us"]} />

        <div className="footer-column">
          <h4 className="footer-column__heading">Stay connected</h4>

          {/* Logos for social medias */}
          <div className="footer__socials">
              <a href="#" aria-label="Facebook"><FaFacebook /></a>
              <a href="#" aria-label="Instagram"><FaInstagram /></a>
              <a href="#" aria-label="X"><FaXTwitter /></a>
          </div>
        </div>
      </div>
      
      {/* Copyright and legal links - currently they are placeholders */}
      <div className="footer__bottom">
        <p className="footer__copyright">DEV@Deakin 2026</p>
        <div className="footer__legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
          <a href="#">Code of Conduct</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;