import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" aria-label="Home"></Link>

        <div className="nav-center">
          <Link to="/">Live Data Visualization</Link>
          <Link to="/LiveDataTable">Live Data Table</Link>
        </div>
      </div>
    </header>
  );
}
