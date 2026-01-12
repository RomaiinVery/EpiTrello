-- Rename tables
ALTER TABLE "public"."Tableau" RENAME TO "Workspace";
ALTER TABLE "public"."_TableauMembers" RENAME TO "_WorkspaceMembers";

-- Rename columns
ALTER TABLE "public"."Board" RENAME COLUMN "tableauId" TO "workspaceId";

-- Rename Primary Key constraints
ALTER TABLE "public"."Workspace" RENAME CONSTRAINT "Tableau_pkey" TO "Workspace_pkey";
ALTER TABLE "public"."_WorkspaceMembers" RENAME CONSTRAINT "_TableauMembers_AB_pkey" TO "_WorkspaceMembers_AB_pkey";

-- Rename Indexes
ALTER INDEX "public"."_TableauMembers_B_index" RENAME TO "_WorkspaceMembers_B_index";

-- Rename Foreign Key Constraints on Board (to match Prisma conventions if possible, or usually just re-establishing them is fine, but renames are safer)
ALTER TABLE "public"."Board" RENAME CONSTRAINT "Board_tableauId_fkey" TO "Board_workspaceId_fkey";

-- Rename Foreign Key Constraints on Workspace
ALTER TABLE "public"."Workspace" RENAME CONSTRAINT "Tableau_userId_fkey" TO "Workspace_userId_fkey";

-- Rename Foreign Key Constraints on _WorkspaceMembers
ALTER TABLE "public"."_WorkspaceMembers" RENAME CONSTRAINT "_TableauMembers_A_fkey" TO "_WorkspaceMembers_A_fkey";
ALTER TABLE "public"."_WorkspaceMembers" RENAME CONSTRAINT "_TableauMembers_B_fkey" TO "_WorkspaceMembers_B_fkey";
