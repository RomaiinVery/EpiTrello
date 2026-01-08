/*
  Warnings:

  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[githubId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
ADD COLUMN     "githubAccessToken" TEXT,
ADD COLUMN     "githubAvatarUrl" TEXT,
ADD COLUMN     "githubId" TEXT,
ADD COLUMN     "githubUsername" TEXT;

-- DropTable
DROP TABLE "public"."Account";

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
