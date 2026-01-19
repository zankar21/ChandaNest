import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import { router } from "./app/router";
import { OwnerAuthProvider } from "./hooks/useOwnerAuth";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <OwnerAuthProvider>
        <RouterProvider router={router} />
      </OwnerAuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);



