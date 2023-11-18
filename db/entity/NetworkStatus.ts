import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({
  name: "network_status",
})
export class NetworkStatus {
  @PrimaryColumn()
  network: string;

  @Column()
  lastBlockNumber: number;
}
