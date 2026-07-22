import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { HomePage } from "../features/home/home-page.js";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    element: <HomePage />,
    path: "/",
  },
]);

export function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
