import { MigrationInterface, QueryRunner } from "typeorm";

export class addingConfigIdPrimary1666718424020 implements MigrationInterface {
  name = "addingConfigIdPrimary1666718424020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bae91edec1a1f5d4de62c99f66"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2715af5bf86b0f7ab6d361ab7e"`
    );
    await queryRunner.query(
      `CREATE TABLE "discord_server_config" ("id" SERIAL NOT NULL, "DiscordServerId" character varying NOT NULL, "starknetNetwork" character varying NOT NULL, "discordRoleId" character varying NOT NULL, "starkyModuleType" character varying NOT NULL, "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_42cff3583fdfec30b0c08f24771" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP COLUMN "discordServerId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "DiscordServerId" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "DiscordServerConfigId" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "discordServerConfigId" integer`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_06ed31786584ada3c96cfd1255" ON "discord_member" ("discordMemberId", "DiscordServerConfigId", "deletedAt") WHERE "deletedAt" IS NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "FK_7ae608308ec562b8e249fe7f18d" FOREIGN KEY ("discordServerConfigId") REFERENCES "discord_server_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "FK_7ae608308ec562b8e249fe7f18d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_06ed31786584ada3c96cfd1255"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP COLUMN "discordServerConfigId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP COLUMN "DiscordServerConfigId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP COLUMN "DiscordServerId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "discordServerId" character varying NOT NULL`
    );
    await queryRunner.query(`DROP TABLE "discord_server_config"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2715af5bf86b0f7ab6d361ab7e" ON "discord_member" ("discordMemberId", "discordServerId", "deletedAt") WHERE ("deletedAt" IS NOT NULL)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bae91edec1a1f5d4de62c99f66" ON "discord_member" ("discordMemberId", "discordServerId") WHERE ("deletedAt" IS NULL)`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
