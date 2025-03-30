
import { Route, Switch } from "wouter";
import { WithMatch } from "./components/WithMatch";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import Subscribe from "./pages/Subscribe";
import AddPoem from "./pages/AddPoem";
import Subscribers from "./pages/Subscribers";
import PoemManagement from "./pages/PoemManagement";
import AdminDashboard from "./pages/AdminDashboard";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/not-found";

export default function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <WithMatch>
          <AuthPage />
        </WithMatch>
      </Route>

      <ProtectedRoute path="/profile">
        <WithMatch>
          <UserProfile />
        </WithMatch>
      </ProtectedRoute>

      <ProtectedRoute path="/subscribe">
        <WithMatch>
          <Subscribe />
        </WithMatch>
      </ProtectedRoute>

      <ProtectedRoute path="/add-poem">
        <WithMatch>
          <AddPoem />
        </WithMatch>
      </ProtectedRoute>

      <ProtectedRoute path="/admin-dashboard">
        <WithMatch>
          <AdminDashboard />
        </WithMatch>
      </ProtectedRoute>

      <ProtectedRoute path="/poems-management">
        <WithMatch>
          <PoemManagement />
        </WithMatch>
      </ProtectedRoute>

      <ProtectedRoute path="/subscribers">
        <WithMatch>
          <Subscribers />
        </WithMatch>
      </ProtectedRoute>

      <Route path="/">
        <WithMatch>
          <Home />
        </WithMatch>
      </Route>

      <Route path="/:rest*">
        <WithMatch>
          <NotFound />
        </WithMatch>
      </Route>
    </Switch>
  );
}
