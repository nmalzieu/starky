import {
  Entity,
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import type { StarkyModuleConfig } from "../../starkyModules/types";
import { DiscordMember } from "./DiscordMember";

@Entity()
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

  @OneToMany((type) => DiscordMember, (member) => member.DiscordServerConfig)
  members: DiscordMember[];
}
