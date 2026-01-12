/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Keys on prisma:', Object.keys(prisma));
    console.log('Checking prisma.workspace...');
    if (prisma.workspace) {
        console.log('prisma.workspace exists!');
        try {
            const count = await prisma.workspace.count();
            console.log('Workspace count:', count);
        } catch (e) {
            console.error('Error querying workspace:', e.message);
        }
    } else {
        console.error('prisma.workspace IS UNDEFINED');
        console.log('Did you mean:', Object.keys(prisma).filter(k => k.toLowerCase().includes('work') || k.toLowerCase().includes('tab')));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
