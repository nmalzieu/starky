import { MigrationInterface, QueryRunner } from "typeorm";

export class renameDiscordMemberPrimaryKey1663856675812
  implements MigrationInterface
{
  name = "renameDiscordMemberPrimaryKey1663856675812";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" RENAME COLUMN "id" TO "discordMemberId"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" RENAME CONSTRAINT "PK_07def0434c8a02d063cb094210f" TO "PK_361af250c7e45ac0c2ed7a55b5e"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "discord_member" RENAME CONSTRAINT "PK_361af250c7e45ac0c2ed7a55b5e" TO "PK_07def0434c8a02d063cb094210f"`
    );
    await queryRunner.query(
      `ALTER TABLE "discord_member" RENAME COLUMN "discordMemberId" TO "id"`
    );
  }
}
