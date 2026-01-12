-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "isDone" BOOLEAN NOT NULL DEFAULT false;
