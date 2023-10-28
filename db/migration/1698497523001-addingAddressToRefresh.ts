import { MigrationInterface, QueryRunner } from "typeorm";

export class addingAddressToRefresh1698488377078 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "address_to_refresh" ("id" SERIAL NOT NULL, "network" character varying NOT NULL, "walletAddress" character varying NOT NULL, CONSTRAINT "PK_4e3f0e3e0e3e3e3e3e3e3e3e3e3" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "address_to_refresh"`);
  }
}
