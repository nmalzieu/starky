import { MigrationInterface, QueryRunner } from "typeorm";

export class addingNetworkStatus1698140496726 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "network_status" ("network" character varying NOT NULL, "lastBlockNumber" integer NOT NULL, CONSTRAINT "PK_8f4f1e2b4f4b9a7a8d7f6c5d6b8" PRIMARY KEY ("network"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "network_status"`);
  }
}
