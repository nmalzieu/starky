import { Entity, Column, PrimaryColumn, OneToMany } from "typeorm";
import type { StarkyModuleConfig } from "../../starkyModules/types";
import { DiscordMember } from "./DiscordMember";

@Entity()
export class DiscordServer {
  @PrimaryColumn()
  id: string;

  @Column()
  starknetNetwork: string;

  @Column()
  discordRoleId: string;

  @Column()
  starkyModuleType: string;

  @Column("jsonb", { nullable: false, default: {} })
  starkyModuleConfig: StarkyModuleConfig;

  @OneToMany((type) => DiscordMember, (member) => member.discordServer)
  members: DiscordMember[];
}
