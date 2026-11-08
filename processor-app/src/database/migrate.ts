import { AppDataSource } from './data-source.js';

AppDataSource.setOptions({ migrationsRun: false });
await AppDataSource.initialize();
try {
  if (process.argv[2] === 'down') await AppDataSource.undoLastMigration();
  else await AppDataSource.runMigrations();
} finally {
  await AppDataSource.destroy();
}
