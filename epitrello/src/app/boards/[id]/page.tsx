import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function BoardPage({ params }: { params: { id: string } }) {
  const board = await prisma.board.findUnique({
    where: { id: params.id },
  });

  if (!board) {
    return <div className="p-6 text-center text-gray-500">Board introuvable</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{board.title}</h1>
      {board.description && (
        <p className="text-gray-600 mb-4">{board.description}</p>
      )}
      <div className="border-t pt-4 text-gray-400 italic">
        (Ici, tu ajouteras plus tard les listes et cartes 👇)
      </div>
    </div>
  );
}