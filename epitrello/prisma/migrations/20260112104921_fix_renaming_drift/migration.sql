-- DropForeignKey
ALTER TABLE "public"."_WorkspaceMembers" DROP CONSTRAINT "_WorkspaceMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_WorkspaceMembers" DROP CONSTRAINT "_WorkspaceMembers_B_fkey";

-- AddForeignKey
ALTER TABLE "_WorkspaceMembers" ADD CONSTRAINT "_WorkspaceMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkspaceMembers" ADD CONSTRAINT "_WorkspaceMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
