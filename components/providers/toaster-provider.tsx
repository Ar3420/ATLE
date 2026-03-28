"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      theme="light"
      toastOptions={{
        className: "border border-[#e5dcc8] bg-white text-[#434c60]",
      }}
    />
  );
}
