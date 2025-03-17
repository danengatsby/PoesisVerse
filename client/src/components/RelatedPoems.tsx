import { usePoems, type Poem } from "@/hooks/usePoems";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPoemsProps {
  selectedPoemId: number | null;
  onPoemSelect: (id: number) => void;
}

export default function RelatedPoems({ selectedPoemId, onPoemSelect }: RelatedPoemsProps) {
  const { relatedPoems, isLoadingRelatedPoems } = usePoems();

  if (!selectedPoemId) {
    return null;
  }

  if (isLoadingRelatedPoems) {
    return (
      <div className="mt-10">
        <h2 className="font-heading text-xl font-semibold mb-4">You might also enjoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-soft overflow-hidden flex h-32">
              <div className="w-1/3">
                <Skeleton className="h-full w-full" />
              </div>
              <div className="w-2/3 p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!relatedPoems || relatedPoems.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl font-semibold mb-4">You might also enjoy</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatedPoems.map((poem: Poem) => (
          <div
            key={poem.id}
            className="bg-white rounded-lg shadow-soft overflow-hidden flex h-32 hover:shadow-medium transition-shadow cursor-pointer"
            onClick={() => onPoemSelect(poem.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPoemSelect(poem.id);
              }
            }}
          >
            <div className="w-1/3 relative">
              <img
                src={poem.thumbnailUrl}
                alt={`${poem.title} thumbnail`}
                className="w-full h-full object-cover"
              />
              {poem.isPremium && (
                <div className="absolute top-2 right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  <i className="fas fa-star text-[10px]"></i>
                </div>
              )}
            </div>
            <div className="w-2/3 p-4">
              <h3 className="font-heading font-semibold text-neutral-800 mb-1">{poem.title}</h3>
              <p className="text-sm text-neutral-600">{poem.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
