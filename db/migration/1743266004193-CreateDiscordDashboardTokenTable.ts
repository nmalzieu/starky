import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiscordDashboardTokenTable1743266004193 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "discord_dashboard_token" (
              "id" SERIAL PRIMARY KEY,
              "guildId" VARCHAR NOT NULL,
              "userId" VARCHAR NOT NULL,
              "token" VARCHAR UNIQUE NOT NULL,
              "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
              "expiresAt" TIMESTAMP NOT NULL,
              "discordServerId" VARCHAR REFERENCES "discord_server"("id")
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "discord_dashboard_token"`);
    }

}
