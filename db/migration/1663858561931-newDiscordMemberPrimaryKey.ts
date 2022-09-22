import { MigrationInterface, QueryRunner } from "typeorm";

export class newDiscordMemberPrimaryKey1663858561931
  implements MigrationInterface
{
  name = "newDiscordMemberPrimaryKey1663858561931";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD "id" SERIAL NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_361af250c7e45ac0c2ed7a55b5e"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_14e8c5b1386ba1c91f683359e8b" PRIMARY KEY ("discordMemberId", "discordServerId", "id")`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_14e8c5b1386ba1c91f683359e8b"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_07def0434c8a02d063cb094210f" PRIMARY KEY ("discordServerId", "id")`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_07def0434c8a02d063cb094210f"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_ec27aec1ba5f9985d02544d2c4e" PRIMARY KEY ("id")`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bae91edec1a1f5d4de62c99f66" ON "discord_member" ("discordMemberId", "discordServerId") WHERE "deletedAt" IS NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2715af5bf86b0f7ab6d361ab7e" ON "discord_member" ("discordMemberId", "discordServerId", "deletedAt") WHERE "deletedAt" IS NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2715af5bf86b0f7ab6d361ab7e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bae91edec1a1f5d4de62c99f66"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_ec27aec1ba5f9985d02544d2c4e"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_07def0434c8a02d063cb094210f" PRIMARY KEY ("discordServerId", "id")`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_07def0434c8a02d063cb094210f"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_14e8c5b1386ba1c91f683359e8b" PRIMARY KEY ("discordMemberId", "discordServerId", "id")`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" DROP CONSTRAINT "PK_14e8c5b1386ba1c91f683359e8b"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" ADD CONSTRAINT "PK_361af250c7e45ac0c2ed7a55b5e" PRIMARY KEY ("discordMemberId", "discordServerId")`
    );
    await queryRunner.query(`ALTER TABLE "discord_member" DROP COLUMN "id"`);
  }
}
