import { Entity, Column, PrimaryColumn, ManyToOne } from "typeorm";
import { DiscordServer } from "./DiscordServer";

@Entity()
export class DiscordMember {
  @PrimaryColumn()
  id: string;

  @PrimaryColumn()
  discordServerId: string;

  @ManyToOne((type) => DiscordServer, (server) => server.members)
  discordServer: DiscordServer;

  @Column({ nullable: true })
  starknetWalletAddress?: string;

  @Column()
  customLink: string;
}
