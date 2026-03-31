"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("ascencio_token");
    router.replace(token ? "/pipeline" : "/login");
  }, []);
  return null;
}
