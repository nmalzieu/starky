import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class NetworkStatus {
  @PrimaryColumn()
  network: string;

  @Column()
  lastBlockNumber: number;
}
