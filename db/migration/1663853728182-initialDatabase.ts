import { MigrationInterface, QueryRunner } from "typeorm";

export class initialDatabase1663853728182 implements MigrationInterface {
  name = "initialDatabase1663853728182";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "discord_server" ("id" character varying NOT NULL, "starknetNetwork" character varying NOT NULL, "discordRoleId" character varying NOT NULL, "starkyModuleType" character varying NOT NULL, "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_a4db655f3e40126e5eed1769c90" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "discord_member" ("id" character varying NOT NULL, "discordServerId" character varying NOT NULL, "starknetWalletAddress" character varying, "customLink" character varying NOT NULL, "deletedAt" TIMESTAMP, CONSTRAINT "PK_07def0434c8a02d063cb094210f" PRIMARY KEY ("id", "discordServerId"))`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`
    );
    await queryRunner.query(`DROP TABLE "discord_member"`);
    await queryRunner.query(`DROP TABLE "discord_server"`);
  }
}
