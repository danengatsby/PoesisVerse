import React from 'react';
import { RouterProvider, Route, Link } from "./lib/SimpleRouter";

// Simple test components
const HomePage = () => <div>Home Page</div>;
const AboutPage = () => <div>About Page</div>;

// Router component
const Router = () => {
  return (
    <>
      <Route path="/" component={HomePage} />
      <Route path="/about" component={AboutPage} />
    </>
  );
};

// Nav component with links
const Navigation = () => {
  return (
    <nav>
      <ul>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/about">About</Link></li>
      </ul>
    </nav>
  );
};

// App component that combines everything
export default function RouterTest() {
  return (
    <RouterProvider>
      <div>
        <h1>Router Test</h1>
        <Navigation />
        <div>
          <Router />
        </div>
      </div>
    </RouterProvider>
  );
}