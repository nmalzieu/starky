import { MigrationInterface, QueryRunner } from "typeorm";

export class addingDiscordServerConfig1669304570811
  implements MigrationInterface
{
  name = "addingDiscordServerConfig1669304570811";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bae91edec1a1f5d4de62c99f66"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2715af5bf86b0f7ab6d361ab7e"`
    );
    await queryRunner.query(
      `CREATE TABLE "discord_server_config" ("id" SERIAL NOT NULL, "discordServerId" character varying NOT NULL, "starknetNetwork" character varying NOT NULL, "discordRoleId" character varying NOT NULL, "starkyModuleType" character varying NOT NULL, "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_42cff3583fdfec30b0c08f24771" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      'INSERT INTO discord_server_config( "discordServerId","starknetNetwork", "discordRoleId", "starkyModuleType", "starkyModuleConfig") select * from discord_server'
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "starknetNetwork" character varying`
    );
    await queryRunner.query(
      'UPDATE discord_member SET "starknetNetwork" = (SELECT "starknetNetwork" FROM discord_server WHERE discord_server."id"= discord_member."discordServerId") '
    );
    await queryRunner.query(
      'ALTER TABLE "discord_member" ALTER COLUMN "starknetNetwork" SET NOT NULL'
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" DROP COLUMN "starknetNetwork"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" DROP COLUMN "discordRoleId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" DROP COLUMN "starkyModuleType"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" DROP COLUMN "starkyModuleConfig"`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ab33e9fae2e02c53317a3fa570" ON "discord_member" ("discordMemberId", "discordServerId", "starknetNetwork") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bd764a6b4638ea91314d644a5e" ON "discord_member" ("discordMemberId", "discordServerId", "starknetNetwork", "deletedAt") WHERE "deletedAt" IS NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server_config" ADD CONSTRAINT "FK_d1e14920aa449199417c60e4167" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_server_config" DROP CONSTRAINT "FK_d1e14920aa449199417c60e4167"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd764a6b4638ea91314d644a5e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab33e9fae2e02c53317a3fa570"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" ADD "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" ADD "starkyModuleType" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" ADD "discordRoleId" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_server" ADD "starknetNetwork" character varying NOT NULL`
    );

    await queryRunner.query(
      'UPDATE "discord_server" SET "starknetNetwork" = (SELECT "starknetNetwork" FROM "discord_member" WHERE "discord_server"."id"= "discord_member"."discordServerId") '
    );

    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP COLUMN "starknetNetwork"`
    );
    await queryRunner.query(
      'insert into "discord_server" ("discordServerId", "starknetNetwork", "discordRoleId", "starkyModuleType", "starkyModuleConfig") select ("discordServerId", "starknetNetwork", "discordRoleId", "starkyModuleType", "starkyModuleConfig") from "discord_server_config"'
    );
    await queryRunner.query(
      'INSERT INTO discord_server select "discordServerId","starknetNetwork", "discordRoleId", "starkyModuleType", "starkyModuleConfig" from discord_server_config'
    );
    await queryRunner.query(`DROP TABLE "discord_server_config"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2715af5bf86b0f7ab6d361ab7e" ON "discord_member" ("discordMemberId", "discordServerId", "deletedAt") WHERE ("deletedAt" IS NOT NULL)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bae91edec1a1f5d4de62c99f66" ON "discord_member" ("discordMemberId", "discordServerId") WHERE ("deletedAt" IS NULL)`
    );
  }
}
