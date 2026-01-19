import { Outlet } from "react-router-dom";
import TopNav from "./components/TopNav";

export default function App() {
  return (
    <div className="theme-dark min-h-screen bg-app text-primary">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}


