import { MigrationInterface, QueryRunner } from "typeorm";

export class EthereumFieldsToTable1742925758569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_member"
            ADD COLUMN "ethereumNetwork" character varying,
            ADD COLUMN "ethereumWalletAddress" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_member"
            DROP COLUMN "ethereumNetwork",
            DROP COLUMN "ethereumWalletAddress"
        `);
  }
}
