import React from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import PoemPage from "./pages/PoemPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserProfile from "./pages/UserProfile";


function Header() {
  return (
    <header>
      <nav>
        <Link to="/poems">Poems</Link>
        <Link to="/admin-dashboard">Admin</Link>
        <Link to="/profile">Profile</Link> {/* Added Profile link */}
      </nav>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div>
        <Header />
        <Route path="/poems/:id" component={PoemPage} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        <Route path="/profile" component={UserProfile} /> {/* Added Profile route */}
      </div>
    </Router>
  );
}

// Dummy components for compilation
const UserProfile = () => {
  return (
    <div>
      <h1>User Profile</h1>
      <p>Logged in user information would go here.</p>
      <button>Logout</button>
    </div>
  );
};

const PoemPage = () => <div>Poem Page</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

export default App;