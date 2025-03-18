import React from 'react';

interface DebugComponentProps {
  children: React.ReactNode;
}

export function DebugComponent({ children }: DebugComponentProps) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Error in DebugComponent:', error);
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        <h3 className="font-bold">Component Error:</h3>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
}