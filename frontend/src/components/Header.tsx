// Full-width banner with a caption that fades in on hover.
import headerImg from"../assets/images/header.jpg";

function Header() {
    return (
        <header className="header" id="about">
            <img src={headerImg} alt="Header banner" className="header__img" />
            <div className="header__caption">
                <span>Hey, I'm Stuart</span>
            </div>
        </header>
    );
}

export default Header;