import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  DeleteDateColumn,
} from "typeorm";
import { DiscordServer } from "./DiscordServer";

@Entity()
export class DiscordMember {
  @PrimaryColumn()
  discordMemberId: string;

  @PrimaryColumn()
  discordServerId: string;

  @ManyToOne((type) => DiscordServer, (server) => server.members)
  discordServer: DiscordServer;

  @Column({ nullable: true })
  starknetWalletAddress?: string;

  @Column()
  customLink: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
