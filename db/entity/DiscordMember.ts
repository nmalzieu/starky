import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { DiscordServer } from "./DiscordServer";

@Entity({
  name: "discord_member",
})
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

  @Column()
  discordMemberId: string;

  @Column()
  discordServerId: string;

  @ManyToOne((type) => DiscordServer, (server) => server.members)
  discordServer: DiscordServer;

  @Column()
  starknetNetwork: string;

  @Column({ nullable: true })
  starknetWalletAddress?: string;

  @Column()
  customLink: string;

  @Column({ nullable: true })
  stellarWalletAddress: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
