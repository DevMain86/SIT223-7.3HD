// Titled list of footer links

interface FooterColumnProps {
  heading: string;
  links: string[]; 
}

function FooterColumn({ heading, links }: FooterColumnProps) {
  return (
    <div className="footer-column">
      <h4 className="footer-column__heading">{heading}</h4>
      <ul className="footer-column__list">
        {links.map((link) => (
          <li key={link}>
            <a href="#">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FooterColumn;