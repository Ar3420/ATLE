"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      theme="light"
      toastOptions={{
        className: "border border-[#e4d7ba] bg-[#fffdf8] text-[#4d556f]",
      }}
    />
  );
}
