import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class AddressToRefresh {
  @PrimaryColumn()
  id: number;

  @Column()
  network: string;

  @Column()
  walletAddress: string;
}
