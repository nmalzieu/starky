import { Entity, Column, PrimaryColumn, OneToMany } from "typeorm";
import { DiscordMember } from "./DiscordMember";
import { DiscordServerConfig } from "./DiscordServerConfig";

@Entity()
export class DiscordServer {
  @PrimaryColumn()
  id: string;

  @OneToMany((type) => DiscordMember, (member) => member.DiscordServer)
  members: DiscordMember[];

  @OneToMany(
    (type) => DiscordServerConfig,
    (serverConfig) => serverConfig.DiscordServer
  )
  serverConfigs: DiscordServerConfig[];
}
