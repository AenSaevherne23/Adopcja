import { PrismaClient, RoleEnum } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam seeding bazy danych...');

  // 1. Tworzenie ról (jeśli nie istnieją)
  const rolesData = [
    { name: RoleEnum.ADMIN },
    { name: RoleEnum.NORMAL_USER },
    { name: RoleEnum.MODERATOR },
  ];

  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { role_id: rolesData.indexOf(role) + 1 }, // Zakładamy ID 1, 2, 3
      update: {},
      create: role,
    });
  }
  console.log('Role zostały utworzone/zaktualizowane.');

  // Pobieramy ID ról, żeby mieć pewność co przypisujemy
  const adminRole = await prisma.role.findFirst({ where: { name: RoleEnum.ADMIN } });
  const userRole = await prisma.role.findFirst({ where: { name: RoleEnum.NORMAL_USER } });

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Tworzenie konta ADMINISTRATORA
  await prisma.user.upsert({
    where: { email: 'admin@schronisko.pl' },
    update: {},
    create: {
      email: 'admin@schronisko.pl',
      password: hashedPassword,
      roleId: adminRole!.role_id,
    },
  });
  console.log('Użytkownik ADMIN stworzony (admin@schronisko.pl)');

  // 3. Tworzenie konta ZWYKŁEGO UŻYTKOWNIKA
  await prisma.user.upsert({
    where: { email: 'user@test.pl' },
    update: {},
    create: {
      email: 'user@test.pl',
      password: hashedPassword,
      roleId: userRole!.role_id,
    },
  });
  console.log('Użytkownik NORMAL stworzony (user@test.pl)');

  console.log('Seeding zakończony sukcesem!');
}

main()
  .catch((e) => {
    console.error('Błąd podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });