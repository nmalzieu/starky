import { AppDataSource } from "./data-source";

export const setupMigrations = async () => {
  // We launched migrations after launching the project so
  // the initial migration cannot be applied on old projects,
  // this fixes it by marking it as applied if tables
  // already exist (= db sync has already happened)
  const tableCountQuery = await AppDataSource.query(
    "select count(*) from information_schema.tables where table_schema = 'public';"
  );
  await AppDataSource.showMigrations();
  if (parseInt(tableCountQuery[0].count, 10) > 0) {
    const migrationsCountQuery = await AppDataSource.query(
      "select count(*) from migrations;"
    );
    if (parseInt(migrationsCountQuery[0].count, 10) === 0) {
      // We have already synchronized tables, so let's mark the
      // initial migration as applied
      await AppDataSource.query(
        `INSERT INTO migrations(timestamp,name) VALUES(extract(epoch from now())*1000,'initialDatabase1663853728182') ON CONFLICT DO NOTHING;`
      );
    }
  }
};
