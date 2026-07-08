"use client";
import { useEffect, useState } from "react";

// Listens for `toast()` CustomEvents and shows a transient message.
export default function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener("bpa-toast", onToast);
    return () => {
      window.removeEventListener("bpa-toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
