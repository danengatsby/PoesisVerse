import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Poem {
  id: number;
  title: string;
  content: string;
  author: string;
  imageUrl: string;
  audioUrl: string;
  description?: string;
  year?: string;
  category?: string;
  isPremium: boolean;
  isPremiumLocked?: boolean;
}

interface PoemDisplayProps {
  selectedPoemId: number | null;
}

export default function PoemDisplay({ selectedPoemId }: PoemDisplayProps) {
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkedPoems, setBookmarkedPoems] = useState<Poem[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const { isAuthenticated, isSubscribed, subscribe } = useAuth();
  const { toast } = useToast();
  
  // Fetch selected poem when ID changes
  useEffect(() => {
    async function fetchPoemData() {
      if (!selectedPoemId) return;
      
      setIsLoading(true);
      try {
        const response = await apiRequest("GET", `/api/poems/${selectedPoemId}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedPoem(data);
        } else {
          console.error("Failed to fetch poem");
          setSelectedPoem(null);
        }
      } catch (error) {
        console.error("Error fetching poem:", error);
        setSelectedPoem(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPoemData();
  }, [selectedPoemId]);
  
  // Fetch bookmarks if authenticated
  useEffect(() => {
    async function fetchBookmarks() {
      if (!isAuthenticated) {
        setBookmarkedPoems([]);
        return;
      }
      
      setIsLoadingBookmarks(true);
      try {
        const response = await apiRequest("GET", `/api/bookmarks`);
        if (response.ok) {
          const data = await response.json();
          setBookmarkedPoems(data);
        } else {
          setBookmarkedPoems([]);
        }
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
        setBookmarkedPoems([]);
      } finally {
        setIsLoadingBookmarks(false);
      }
    }
    
    fetchBookmarks();
  }, [isAuthenticated]);

  const isBookmarked = bookmarkedPoems?.some((poem) => poem.id === selectedPoemId);

  const toggleBookmark = async () => {
    if (!selectedPoemId || !isAuthenticated) return;
    
    try {
      if (isBookmarked) {
        await apiRequest("DELETE", `/api/bookmarks/${selectedPoemId}`);
        setBookmarkedPoems(prev => prev.filter(poem => poem.id !== selectedPoemId));
        toast({
          title: "Bookmark removed",
          description: "Poem removed from your bookmarks"
        });
      } else {
        await apiRequest("POST", "/api/bookmarks", { poemId: selectedPoemId });
        // Re-fetch bookmarks to get updated list
        const response = await apiRequest("GET", `/api/bookmarks`);
        if (response.ok) {
          const data = await response.json();
          setBookmarkedPoems(data);
        }
        toast({
          title: "Bookmark added",
          description: "Poem added to your bookmarks"
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Could not update bookmark status",
        variant: "destructive"
      });
    }
  };

  if (!selectedPoemId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h2 className="font-heading text-2xl mb-4 text-neutral-800">Welcome to PoesisVerse</h2>
          <p className="text-neutral-600">Select a poem from the sidebar to start exploring our collection of beautiful poetry.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <Skeleton className="w-full h-56 md:h-80" />
          <CardContent className="p-6 md:p-8">
            <Skeleton className="w-2/3 h-8 mb-2" />
            <Skeleton className="w-1/3 h-6 mb-6" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-3/4 h-4 mb-3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPoem) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-neutral-600">Poem not found or could not be loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPremiumLocked = selectedPoem.isPremium && !isSubscribed;

  return (
    <div className="max-w-3xl mx-auto poem-appear">
      {isPremiumLocked && (
        <div className="relative overflow-hidden rounded-lg shadow-medium mb-8 bg-white">
          <div className="absolute inset-0 bg-neutral-800/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 p-6 text-center">
            <i className="fas fa-lock text-3xl mb-3"></i>
            <h3 className="font-heading text-xl font-bold mb-2">Premium Content</h3>
            <p className="mb-4 max-w-md">Subscribe to PoesisVerse to unlock this and all other premium poems in our collection.</p>
            <Button 
              onClick={subscribe}
              className="px-6 py-2 bg-primary hover:bg-primary-dark transition-colors rounded-md font-ui font-medium"
            >
              View Subscription Plans
            </Button>
          </div>
          
          <div className="filter blur-sm">
            <Card className="overflow-hidden">
              <div className="relative h-56 md:h-80 overflow-hidden">
                <img
                  src={selectedPoem.imageUrl}
                  alt={`${selectedPoem.title} - poem image`}
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6">
                  <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">{selectedPoem.title}</h1>
                  <p className="text-white/80 font-ui">{selectedPoem.author}</p>
                </div>
              </div>
              
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-lg max-w-none">
                  <div className="italic mb-6 text-neutral-600 font-medium">
                    {selectedPoem.description}
                  </div>
                  <div className="whitespace-pre-line leading-relaxed poem-text">
                    {selectedPoem.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {!isPremiumLocked && (
        <Card className="overflow-hidden">
          <div className="relative h-56 md:h-80 overflow-hidden">
            <img
              src={selectedPoem.imageUrl}
              alt={`${selectedPoem.title} - poem image`}
              className="w-full h-full object-cover object-center transform hover:scale-105 transition duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6">
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">{selectedPoem.title}</h1>
              <p className="text-white/80 font-ui">{selectedPoem.author}</p>
            </div>
          </div>
          
          <CardContent className="p-6 md:p-8">
            <div className="prose prose-lg max-w-none">
              {selectedPoem.description && (
                <div className="italic mb-6 text-neutral-600 font-medium">
                  {selectedPoem.description}
                </div>
              )}
              
              {selectedPoem.audioUrl && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-500 mb-2">Ascultă recitarea:</h3>
                  <audio 
                    controls 
                    src={selectedPoem.audioUrl}
                    className="w-full"
                  >
                    Browserul dvs. nu suportă redarea audio.
                  </audio>
                </div>
              )}
              
              <div className="whitespace-pre-line leading-relaxed poem-text">
                {selectedPoem.content}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  {selectedPoem.year && <span>{selectedPoem.year} · </span>}
                  {selectedPoem.category && <span>{selectedPoem.category}</span>}
                </div>
                
                <div className="flex space-x-2">
                  {/* Audio player removed from here and moved above poem content */}

                  <button
                    className="p-2 text-neutral-600 hover:text-primary transition-colors"
                    aria-label="Share poem"
                  >
                    <i className="fas fa-share-alt"></i>
                  </button>
                  
                  {isAuthenticated && (
                    <button
                      className={`p-2 transition-colors ${
                        isBookmarked ? "text-primary" : "text-neutral-600 hover:text-primary"
                      }`}
                      onClick={toggleBookmark}
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark poem"}
                    >
                      <i className={isBookmarked ? "fas fa-bookmark" : "far fa-bookmark"}></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
