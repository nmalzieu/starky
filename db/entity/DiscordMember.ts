import {
  Entity,
  Column,
  ManyToOne,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";
import { DiscordServer } from "./DiscordServer";

@Entity()
@Index(["discordMemberId", "DiscordServerId", "starknetNetwork", "deletedAt"], {
  unique: true,
  where: '"deletedAt" IS NOT NULL',
})
@Index(["discordMemberId", "DiscordServerId", "starknetNetwork"], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class DiscordMember {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  discordMemberId: string;

  @Column()
  DiscordServerId: string;

  @ManyToOne((type) => DiscordServer, (server) => server.members)
  DiscordServer: DiscordServer;

  @Column()
  starknetNetwork: string;

  @Column({ nullable: true })
  starknetWalletAddress?: string;

  @Column()
  customLink: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
