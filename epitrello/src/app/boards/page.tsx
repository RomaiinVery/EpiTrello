import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function BoardsPage() {
  const boards = await prisma.board.findMany();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Boards</h1>
      <ul>
        {boards.map((b) => (
          <li key={b.id} className="mb-2 p-2 border rounded-md">{b.title}</li>
        ))}
      </ul>
    </div>
  );
}