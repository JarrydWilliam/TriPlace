import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// NOTE: Native iOS/Android API URL routing is handled centrally by getApiUrl()
// in lib/queryClient.ts. Do NOT add a global fetch override here — it conflicts.

createRoot(document.getElementById("root")!).render(<App />);
