import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { DiscordServer } from "./DiscordServer";

@Entity({ name: "discord_member" })
@Index(["discordMemberId", "discordServerId", "starknetNetwork", "deletedAt"], {
  unique: true,
  where: '"deletedAt" IS NOT NULL',
})
@Index(["discordMemberId", "discordServerId", "starknetNetwork"], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class DiscordMember {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: "discord_member_id" })
  discordMemberId: string;

  @Column({ name: "discord_server_id" })
  discordServerId: string;

  @ManyToOne(() => DiscordServer, (server) => server.members)
  @JoinColumn({ name: "discord_server_id" })
  discordServer: DiscordServer;

  @Column({ name: "starknet_network" })
  starknetNetwork: string;

  @Column({ name: "starknet_wallet_address", nullable: true })
  starknetWalletAddress?: string;

  @Column({ name: "custom_link" })
  customLink: string;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
