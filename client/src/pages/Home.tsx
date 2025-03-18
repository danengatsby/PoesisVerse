import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import PoemDisplay from "@/components/PoemDisplay";
import RelatedPoems from "@/components/RelatedPoems";
import { usePoems } from "@/hooks/usePoems";

export default function Home() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { poems, setSelectedPoemId, selectedPoemId, refetchPoems } = usePoems();

  // Inițializăm cu prima încărcare
  useEffect(() => {
    refetchPoems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Setăm primul poem ca selectat când poemele se încarcă
  useEffect(() => {
    if (!selectedPoemId && poems && poems.length > 0) {
      setSelectedPoemId(poems[0].id);
    }
  }, [poems, selectedPoemId, setSelectedPoemId]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
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
            className="bg-primary text-white p-3 rounded-full shadow-medium hover:bg-primary-dark transition-colors"
            onClick={() => setShowMobileSidebar(true)}
            aria-label="Open poem list"
          >
            <i className="fas fa-book"></i>
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
