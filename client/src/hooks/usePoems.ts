import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useAuth } from "./useAuth";

export interface Poem {
  id: number;
  title: string;
  content: string;
  author: string;
  imageUrl: string;
  thumbnailUrl: string;
  description?: string;
  year?: string;
  category?: string;
  isPremium: boolean;
  isPremiumLocked?: boolean;
}

export function usePoems() {
  const { token } = useAuth();
  const [selectedPoemId, setSelectedPoemId] = useState<number | null>(null);

  // Fetch all poems
  const { data: poems, isLoading: isLoadingPoems } = useQuery({
    queryKey: ["/api/poems"],
    queryFn: async () => {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/poems", { headers });
      if (!response.ok) {
        throw new Error("Failed to fetch poems");
      }
      return response.json() as Promise<Poem[]>;
    },
  });

  // Fetch a specific poem
  const { data: selectedPoem, isLoading: isLoadingSelectedPoem } = useQuery({
    queryKey: ["/api/poems", selectedPoemId],
    queryFn: async ({ queryKey }) => {
      const poemId = queryKey[1];
      if (!poemId) return null;
      
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/poems/${poemId}`, { headers });
      if (!response.ok) {
        throw new Error("Failed to fetch poem");
      }
      return response.json() as Promise<Poem>;
    },
    enabled: !!selectedPoemId,
  });

  // Fetch related poems
  const { data: relatedPoems, isLoading: isLoadingRelatedPoems } = useQuery({
    queryKey: ["/api/poems/related", selectedPoemId],
    queryFn: async ({ queryKey }) => {
      const poemId = queryKey[1];
      if (!poemId) return [];
      
      const response = await fetch(`/api/poems/${poemId}/related`);
      if (!response.ok) {
        throw new Error("Failed to fetch related poems");
      }
      return response.json() as Promise<Poem[]>;
    },
    enabled: !!selectedPoemId,
  });

  // Bookmark a poem
  const { mutate: bookmarkPoem } = useMutation({
    mutationFn: async (poemId: number) => {
      if (!token) {
        throw new Error("You need to be logged in to bookmark poems");
      }
      
      await apiRequest("POST", "/api/bookmarks", { poemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  // Get user bookmarks
  const { data: bookmarkedPoems, isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: async () => {
      if (!token) return [];
      
      const response = await apiRequest("GET", "/api/bookmarks");
      return response.json() as Promise<Poem[]>;
    },
    enabled: !!token,
  });

  // Remove a bookmark
  const { mutate: removeBookmark } = useMutation({
    mutationFn: async (poemId: number) => {
      if (!token) {
        throw new Error("You need to be logged in to remove bookmarks");
      }
      
      await apiRequest("DELETE", `/api/bookmarks/${poemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
  });

  return {
    poems,
    selectedPoem,
    relatedPoems,
    bookmarkedPoems,
    isLoadingPoems,
    isLoadingSelectedPoem,
    isLoadingRelatedPoems,
    isLoadingBookmarks,
    setSelectedPoemId,
    bookmarkPoem,
    removeBookmark,
  };
}
