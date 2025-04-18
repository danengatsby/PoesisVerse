import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrownIcon, PlusCircleIcon, LogOutIcon, MenuIcon, MailIcon, FileText, LayoutDashboard, FilePlus, Upload, User } from "lucide-react";
import LoginModal from "./auth/LoginModal";
import SignupModal from "./auth/SignupModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserCircle } from "lucide-react"; // Added import for UserCircle icon

export default function Header() {
  const { isAuthenticated, user, logout, isSubscribed } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const navigateToSubscribe = () => {
    setLocation("/subscribe");
    setShowMobileMenu(false);
  };

  const testEmail = async () => {
    try {
      setIsTestingEmail(true);
      const response = await apiRequest("POST", "/api/test-email");
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Email trimis cu succes",
          description: `Un email de test a fost trimis la ${user?.email}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Eroare la trimiterea email-ului",
          description: data.error || "A apărut o eroare la trimiterea email-ului de test",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Eroare la trimiterea email-ului:", error);
      toast({
        title: "Eroare la trimiterea email-ului",
        description: "A apărut o eroare la trimiterea email-ului de test",
        variant: "destructive",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-md border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <span className="font-heading text-xl text-primary font-bold">PoesisVerse</span>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="text-sm text-neutral-600 mr-2">
                        Bine ai venit, {user?.username}
                      </span>
                      {isSubscribed && (
                        <Badge className="bg-amber-500" variant="secondary">
                          <CrownIcon className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    {isSubscribed && user?.subscriptionInfo && (
                      <div className="text-xs">
                        <span className="text-emerald-600 font-medium">
                          Abonat • Acces complet la toate poemele
                        </span>
                        <span className="text-gray-500 block">
                          Expiră pe {user.subscriptionInfo.endDate} ({user.subscriptionInfo.daysRemaining} zile rămase)
                        </span>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" className="mr-2" asChild>
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-1" />
                      Profil
                    </Link>
                  </Button>
                  {user?.username === "Administrator" && (
                    <Button variant="outline" className="mr-2" asChild>
                      <Link href="/admin-dashboard">
                        <LayoutDashboard className="h-4 w-4 mr-1" />
                        Dashboard
                      </Link>
                    </Button>
                  )}

                  {/* Toate butoanele pentru utilizatori autentificați */}
                  {isAuthenticated && (
                    <>
                      <Button variant="outline" className="mr-2" asChild>
                        <Link href="/add-poem">
                          <PlusCircleIcon className="h-4 w-4 mr-1" />
                          Adăugare poem
                        </Link>
                      </Button>
                      <Button variant="default" className="mr-2 bg-green-500 hover:bg-green-700 text-white font-bold px-5 py-2" asChild>
                        <Link href="/mass-add">
                          <FilePlus className="h-5 w-5 mr-2" />
                          MASS-ADD
                        </Link>
                      </Button>
                    </>
                  )}

                  {!isSubscribed && (
                    <Button variant="default" className="mr-2 bg-amber-500 hover:bg-amber-600" onClick={navigateToSubscribe}>
                      <CrownIcon className="h-4 w-4 mr-1" />
                      Abonare
                    </Button>
                  )}

                  <Button variant="ghost" onClick={handleLogout}>
                    <LogOutIcon className="h-4 w-4 mr-1" />
                    Deconectare
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={openLoginModal}>
                    Autentificare
                  </Button>
                  <Button className="bg-primary hover:bg-primary-dark text-white" onClick={openSignupModal}>
                    Înregistrare
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
                <MenuIcon className="h-6 w-6" />
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
                  <div className="px-4 py-2 text-sm">
                    <div className="flex items-center text-neutral-600">
                      <span className="mr-2">Cont: {user?.username}</span>
                      {isSubscribed && (
                        <Badge className="bg-amber-500" variant="secondary">
                          <CrownIcon className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    {isSubscribed && user?.subscriptionInfo && (
                      <div className="text-xs mt-1 block">
                        <span className="text-emerald-600 font-medium block">
                          Abonat • Acces complet la toate poemele
                        </span>
                        <span className="text-gray-500 block">
                          Expiră pe {user.subscriptionInfo.endDate} ({user.subscriptionInfo.daysRemaining} zile rămase)
                        </span>
                      </div>
                    )}
                  </div>

                  <Link href="/profile" className="block w-full">
                    <div className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Profil
                    </div>
                  </Link>
                  {user?.username === "Administrator" && (
                    <>
                      <Link href="/admin-dashboard" className="block w-full">
                        <div className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Dashboard
                        </div>
                      </Link>
                      <Link href="/poems-management" className="block w-full">
                        <div className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Poeme
                        </div>
                      </Link>
                      <Link href="/subscribers" className="block w-full">
                        <div className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center">
                          <CrownIcon className="h-4 w-4 mr-2" />
                          Abonați
                        </div>
                      </Link>
                    </>
                  )}

                  {/* Regular user links */}
                  {isAuthenticated && (
                    <>
                      <Link href="/add-poem" className="block w-full">
                        <div className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center">
                          <PlusCircleIcon className="h-4 w-4 mr-2" />
                          Adăugare poem
                        </div>
                      </Link>
                      <Link href="/mass-add" className="block w-full">
                        <div className="w-full text-left px-4 py-3 bg-green-500 text-white hover:bg-green-700 transition flex items-center font-bold rounded">
                          <FilePlus className="h-5 w-5 mr-2" />
                          MASS-ADD
                        </div>
                      </Link>
                    </>
                  )}

                  {!isSubscribed && (
                    <button 
                      className="w-full text-left px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition flex items-center"
                      onClick={navigateToSubscribe}
                    >
                      <CrownIcon className="h-4 w-4 mr-2" />
                      Abonare
                    </button>
                  )}

                  <button 
                    className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition flex items-center"
                    onClick={handleLogout}
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Deconectare
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="w-full text-left px-4 py-2 rounded-md text-neutral-800 hover:bg-neutral-100 transition"
                    onClick={openLoginModal}
                  >
                    Autentificare
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition"
                    onClick={openSignupModal}
                  >
                    Înregistrare
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