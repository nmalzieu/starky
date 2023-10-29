import { MigrationInterface, QueryRunner } from "typeorm";

export class removingAddressToRefresh1698614370733
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "address_to_refresh"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
