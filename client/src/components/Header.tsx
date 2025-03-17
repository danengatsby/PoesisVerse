import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import LoginModal from "./auth/LoginModal";
import SignupModal from "./auth/SignupModal";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const openLoginModal = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
    setShowMobileMenu(false);
  };

  const openSignupModal = () => {
    setShowSignupModal(true);
    setShowLoginModal(false);
    setShowMobileMenu(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowMobileMenu(false);
  };

  return (
    <>
      <header className="bg-white shadow-md border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <a className="flex-shrink-0">
                  <span className="font-heading text-xl text-primary font-bold">PoesisVerse</span>
                </a>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-neutral-600">
                    Welcome, {user?.username}
                  </span>
                  <Button variant="ghost" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={openLoginModal}>
                    Log in
                  </Button>
                  <Button className="bg-primary hover:bg-primary-dark text-white" onClick={openSignupModal}>
                    Sign up
                  </Button>
                </>
              )}
            </div>
            
            <div className="md:hidden flex items-center">
              <button 
                onClick={toggleMobileMenu}
                className="text-neutral-800"
                aria-label="Toggle mobile menu"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-t border-neutral-200 py-2">
            <div className="px-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 text-sm text-neutral-600">
                    Signed in as {user?.username}
                  </div>
                  <button 
                    className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition"
                    onClick={openLoginModal}
                  >
                    Log in
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition"
                    onClick={openSignupModal}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />
      
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}
