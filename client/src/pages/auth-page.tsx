import { useEffect, useState } from "react";
import { useRouter } from "@/lib/SimpleRouter";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";

export default function AuthPage() {
  const { navigateTo } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigateTo("/");
    }
  }, [isAuthenticated, isLoading, navigateTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Form section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold font-heading text-neutral-900">
              {showLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-lg text-neutral-600">
              {showLogin
                ? "Log in to access your poetry collection"
                : "Start your poetic journey today"}
            </p>
          </div>

          {showLogin ? (
            <LoginModal
              isOpen={true}
              onClose={() => {}}
              onSwitchToSignup={() => setShowLogin(false)}
            />
          ) : (
            <SignupModal
              isOpen={true}
              onClose={() => {}}
              onSwitchToLogin={() => setShowLogin(true)}
            />
          )}
        </div>
      </div>

      {/* Hero section */}
      <div className="hidden lg:flex w-1/2 bg-neutral-100 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="text-3xl font-bold font-heading text-neutral-900 mb-4">
            Discover the World of Poetry
          </h2>
          <p className="text-lg text-neutral-600 mb-8">
            Join our community of poetry lovers. Access a curated collection of classic
            and contemporary poems, with beautiful imagery and insightful commentary.
          </p>
          <ul className="space-y-4 text-left">
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-primary mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Access our complete collection of poems
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-primary mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save your favorite poems
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-primary mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Enjoy high-quality poem imagery
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}