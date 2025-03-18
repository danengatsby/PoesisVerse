import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import PoemDisplay from "@/components/PoemDisplay";
import RelatedPoems from "@/components/RelatedPoems";
import { usePoems } from "@/hooks/usePoems";

export default function Home({ match }: { match?: { params: Record<string, string> } }) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { poems, setSelectedPoemId, selectedPoemId, refetchPoems } = usePoems();

  // Initialize with first load
  useEffect(() => {
    refetchPoems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Set first poem as selected when poems load
  useEffect(() => {
    if (!selectedPoemId && poems && poems.length > 0) {
      setSelectedPoemId(poems[0].id);
    }
  }, [poems, selectedPoemId, setSelectedPoemId]);

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar 
          onPoemSelect={setSelectedPoemId} 
          selectedPoemId={selectedPoemId}
        />
        
        {/* Mobile Sidebar */}
        {showMobileSidebar && (
          <Sidebar 
            onPoemSelect={setSelectedPoemId} 
            selectedPoemId={selectedPoemId}
            isMobile={true}
            onCloseMobile={() => setShowMobileSidebar(false)}
          />
        )}
        
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden fixed bottom-4 left-4 z-20">
          <button 
            className="bg-primary text-white p-3 rounded-full shadow-md hover:bg-primary/90 transition-colors"
            onClick={() => setShowMobileSidebar(true)}
            aria-label="Open poem list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <PoemDisplay selectedPoemId={selectedPoemId} />
            
            <RelatedPoems
              selectedPoemId={selectedPoemId}
              onPoemSelect={setSelectedPoemId}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
