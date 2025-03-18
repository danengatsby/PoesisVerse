import React, { useEffect } from 'react';

interface DebugComponentProps {
  children: React.ReactNode;
  name?: string;
}

export function DebugComponent({ children, name = 'Unknown' }: DebugComponentProps) {
  useEffect(() => {
    console.log(`DebugComponent ${name} mounted`);
    return () => console.log(`DebugComponent ${name} unmounted`);
  }, [name]);

  try {
    return <>{children}</>;
  } catch (error) {
    console.error(`Error in DebugComponent ${name}:`, error);
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
        <h3 className="font-bold">Component Error in {name}:</h3>
        <pre className="mt-2 whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</pre>
        <pre className="mt-2 text-sm opacity-75 whitespace-pre-wrap">{error instanceof Error && error.stack ? error.stack : 'No stack trace available'}</pre>
      </div>
    );
  }
}