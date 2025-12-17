'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyBoardsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tableaux");
  }, [router]);

  return null;
}
