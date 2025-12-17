-- CreateTable
CREATE TABLE "_TableauMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TableauMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TableauMembers_B_index" ON "_TableauMembers"("B");

-- AddForeignKey
ALTER TABLE "_TableauMembers" ADD CONSTRAINT "_TableauMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Tableau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TableauMembers" ADD CONSTRAINT "_TableauMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
