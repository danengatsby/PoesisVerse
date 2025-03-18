import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePoems, Poem } from "@/hooks/usePoems";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/lib/SimpleRouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SidebarProps {
  onPoemSelect: (poemId: number) => void;
  selectedPoemId: number | null;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onPoemSelect, selectedPoemId, isMobile, onCloseMobile }: SidebarProps) {
  const { poems, recentPoems, isLoadingPoems, isLoadingRecentPoems } = usePoems();
  const { isAuthenticated, isSubscribed, subscribe } = useAuth();
  const [selectedTab, setSelectedTab] = useState("all");

  const handlePoemClick = (poemId: number) => {
    onPoemSelect(poemId);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderPoemItem = (poem: Poem) => (
    <li key={poem.id} className="px-4 py-2">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handlePoemClick(poem.id);
        }}
        className={`poem-title block transition-colors duration-200 font-medium ${
          selectedPoemId === poem.id
            ? "text-primary font-semibold relative pl-4 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[70%] before:bg-primary before:rounded-sm"
            : "text-neutral-700 hover:text-primary"
        }`}
      >
        {poem.title}
        {poem.isPremium && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-sm inline-flex items-center ${isSubscribed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            <i className={`${isSubscribed ? 'fas fa-unlock' : 'fas fa-lock'} text-[10px] mr-1`}></i>
            {isSubscribed ? 'Premium' : 'Locked'}
          </span>
        )}
      </a>
    </li>
  );

  const renderAllPoems = () => {
    if (isLoadingPoems) {
      return Array.from({ length: 6 }).map((_, index) => (
        <li key={`all-${index}`} className="px-4 py-2">
          <Skeleton className="h-6 w-full" />
        </li>
      ));
    }

    if (!poems || poems.length === 0) {
      return (
        <li className="px-4 py-2 text-neutral-600">
          No poems available.
        </li>
      );
    }

    return poems.map(renderPoemItem);
  };
  
  const renderRecentPoems = () => {
    if (isLoadingRecentPoems) {
      return Array.from({ length: 3 }).map((_, index) => (
        <li key={`recent-${index}`} className="px-4 py-2">
          <Skeleton className="h-6 w-full" />
        </li>
      ));
    }

    if (!recentPoems || recentPoems.length === 0) {
      return (
        <li className="px-4 py-2 text-neutral-600">
          No recent poems available. Add a new poem to see it here!
        </li>
      );
    }

    return recentPoems.map(renderPoemItem);
  };

  return (
    <aside className={`bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out ${
      isMobile ? "w-full h-full fixed inset-0 z-30" : "w-64 hidden md:block"
    }`}>
      <div className="h-full flex flex-col">
        {isMobile && (
          <div className="p-4 flex justify-between items-center border-b border-neutral-200">
            <h2 className="font-heading text-lg font-semibold text-neutral-800">Poem Collection</h2>
            <button
              onClick={onCloseMobile}
              className="text-neutral-500 hover:text-neutral-700"
              aria-label="Close sidebar"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {!isMobile && (
          <div className="p-4 border-b border-neutral-200">
            <h2 className="font-heading text-lg font-semibold text-neutral-800">Poem Collection</h2>
            <p className="text-sm text-neutral-600 mt-1">Discover beautiful verses</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <div className="px-4 pt-2">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="all">All Poems</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <div className="py-2">
                <ul className="space-y-1">
                  {renderAllPoems()}
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="recent" className="mt-0">
              <div className="py-2">
                <ul className="space-y-1">
                  {renderRecentPoems()}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="p-4 border-t border-neutral-200 bg-secondary/20">
          <div className="text-center">
            {isAuthenticated && isSubscribed ? (
              <div className="text-sm text-neutral-600">
                <span className="flex items-center justify-center mb-2">
                  <i className="fas fa-check-circle text-accent mr-2"></i>
                  Premium Access Active
                </span>
                <p>You have access to all premium poems.</p>
              </div>
            ) : (
              <>
                <Button 
                  onClick={subscribe}
                  className="w-full px-4 py-2 bg-accent text-white rounded-md shadow-sm hover:bg-accent-dark font-ui font-medium text-sm transition-colors"
                >
                  Subscribe Now
                </Button>
                <p className="mt-2 text-xs text-neutral-600">Unlock all poems with premium access</p>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
