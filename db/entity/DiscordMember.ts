import {
  Entity,
  Column,
  ManyToOne,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";
import { DiscordServerConfig } from "./DiscordServerConfig";

@Entity()
@Index(["discordMemberId", "DiscordServerConfigId", "deletedAt"], {
  unique: true,
  where: '"deletedAt" IS NOT NULL',
})
@Index(["discordMemberId", "DiscordServerConfigId"], {
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

  @Column()
  DiscordServerConfigId: string;

  @ManyToOne(
    (type) => DiscordServerConfig,
    (serverConfig) => serverConfig.members
  )
  DiscordServerConfig: DiscordServerConfig;

  @Column({ nullable: true })
  starknetWalletAddress?: string;

  @Column()
  customLink: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
