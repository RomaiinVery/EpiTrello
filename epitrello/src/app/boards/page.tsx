'use client';
import { useEffect, useState } from "react";

type Board = { id: string; title: string };

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    fetch("/api/boards")
      .then(res => res.json())
      .then(data => setBoards(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Boards</h1>
      <ul>
        {boards.map(b => (
          <li key={b.id} className="mb-2 p-2 border rounded-md">{b.title}</li>
        ))}
      </ul>
    </div>
  );
}