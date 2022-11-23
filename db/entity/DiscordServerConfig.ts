import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  DeleteDateColumn,
  Index,
} from "typeorm";
import type { StarkyModuleConfig } from "../../starkyModules/types";
import { DiscordServer } from "./DiscordServer";

@Entity()
@Index(["id", "DiscordServerId", "deletedAt"], {
  unique: true,
  where: '"deletedAt" IS NOT NULL',
})
@Index(["id", "DiscordServerId"], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class DiscordServerConfig {
  @PrimaryGeneratedColumn("increment")
  id: string;

  @Column()
  DiscordServerId: string;

  @Column()
  starknetNetwork: string;

  @Column()
  discordRoleId: string;

  @Column()
  starkyModuleType: string;

  @Column("jsonb", { nullable: false, default: {} })
  starkyModuleConfig: StarkyModuleConfig;

  @ManyToOne((type) => DiscordServer, (server) => server.serverConfigs)
  DiscordServer: DiscordServer;

  @DeleteDateColumn()
  deletedAt?: Date;
}
