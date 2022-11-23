import { MigrationInterface, QueryRunner } from "typeorm";

export class addingDiscordServerConfig1669216155900 implements MigrationInterface {
    name = 'addingDiscordServerConfig1669216155900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_bae91edec1a1f5d4de62c99f66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2715af5bf86b0f7ab6d361ab7e"`);
        await queryRunner.query(`CREATE TABLE "discord_server_config" ("id" SERIAL NOT NULL, "DiscordServerId" character varying NOT NULL, "starknetNetwork" character varying NOT NULL, "discordRoleId" character varying NOT NULL, "starkyModuleType" character varying NOT NULL, "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}', "deletedAt" TIMESTAMP, "discordServerId" character varying, CONSTRAINT "PK_42cff3583fdfec30b0c08f24771" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_49f0a20052e94a4fe263836e9f" ON "discord_server_config" ("id", "DiscordServerId") WHERE "deletedAt" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_689673e78dfc10c7d6158099e7" ON "discord_server_config" ("id", "DiscordServerId", "deletedAt") WHERE "deletedAt" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_server" DROP COLUMN "starknetNetwork"`);
        await queryRunner.query(`ALTER TABLE "discord_server" DROP COLUMN "discordRoleId"`);
        await queryRunner.query(`ALTER TABLE "discord_server" DROP COLUMN "starkyModuleType"`);
        await queryRunner.query(`ALTER TABLE "discord_server" DROP COLUMN "starkyModuleConfig"`);
        await queryRunner.query(`ALTER TABLE "discord_member" ADD "DiscordServerId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_member" ADD "starknetNetwork" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`);
        await queryRunner.query(`ALTER TABLE "discord_member" ALTER COLUMN "discordServerId" DROP NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c240e9caf2f7193202cf5ce058" ON "discord_member" ("discordMemberId", "DiscordServerId") WHERE "deletedAt" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ca78841c1a05bd094ed9918a42" ON "discord_member" ("discordMemberId", "DiscordServerId", "deletedAt") WHERE "deletedAt" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_server_config" ADD CONSTRAINT "FK_d1e14920aa449199417c60e4167" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "discord_member" DROP CONSTRAINT "FK_20b29204205a768ef8b22b54f06"`);
        await queryRunner.query(`ALTER TABLE "discord_server_config" DROP CONSTRAINT "FK_d1e14920aa449199417c60e4167"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca78841c1a05bd094ed9918a42"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c240e9caf2f7193202cf5ce058"`);
        await queryRunner.query(`ALTER TABLE "discord_member" ALTER COLUMN "discordServerId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_member" ADD CONSTRAINT "FK_20b29204205a768ef8b22b54f06" FOREIGN KEY ("discordServerId") REFERENCES "discord_server"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "discord_member" DROP COLUMN "starknetNetwork"`);
        await queryRunner.query(`ALTER TABLE "discord_member" DROP COLUMN "DiscordServerId"`);
        await queryRunner.query(`ALTER TABLE "discord_server" ADD "starkyModuleConfig" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "discord_server" ADD "starkyModuleType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_server" ADD "discordRoleId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "discord_server" ADD "starknetNetwork" character varying NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_689673e78dfc10c7d6158099e7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49f0a20052e94a4fe263836e9f"`);
        await queryRunner.query(`DROP TABLE "discord_server_config"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2715af5bf86b0f7ab6d361ab7e" ON "discord_member" ("discordMemberId", "discordServerId", "deletedAt") WHERE ("deletedAt" IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bae91edec1a1f5d4de62c99f66" ON "discord_member" ("discordMemberId", "discordServerId") WHERE ("deletedAt" IS NULL)`);
    }

}
