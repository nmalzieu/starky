import type { Relation } from "typeorm";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import type { StarkyModuleConfig } from "../../types/starkyModules";

import { DiscordServer } from "./DiscordServer";

@Entity()
export class DiscordServerConfig {
  @PrimaryGeneratedColumn("increment")
  id: string;

  @Column()
  discordServerId: string;

  @Column()
  starknetNetwork: "goerli" | "mainnet";

  @Column()
  discordRoleId: string;

  @Column()
  starkyModuleType: string;

  @Column("jsonb", { nullable: false, default: {} })
  starkyModuleConfig: StarkyModuleConfig;

  @ManyToOne((type) => DiscordServer, (server) => server.serverConfigs)
  discordServer: Relation<DiscordServer>;
}
