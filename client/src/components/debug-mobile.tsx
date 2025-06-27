import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

export function DebugMobile() {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => setWindowWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="fixed top-0 right-0 bg-black/80 text-white p-2 text-xs z-50 rounded-bl">
      <div>Width: {windowWidth}px</div>
      <div>Mobile: {isMobile ? 'YES' : 'NO'}</div>
      <div>Breakpoint: 768px</div>
    </div>
  );
}