"use client";

export function DebugConfigTab() {
  console.log('🔴 DEBUG COMPONENT LOADED');
  
  return (
    <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-center py-2 z-50">
      🔴 DEBUG: Si ves esto, React está funcionando. Tab de configuración debería aparecer abajo.
    </div>
  );
}