import { Entity, OneToMany, PrimaryColumn } from "typeorm";

import { DiscordMember } from "./DiscordMember";
import { DiscordServerConfig } from "./DiscordServerConfig";

@Entity()
export class DiscordServer {
  @PrimaryColumn()
  id: string;

  @OneToMany((type) => DiscordMember, (member) => member.discordServer)
  members: DiscordMember[];

  @OneToMany(
    (type) => DiscordServerConfig,
    (serverConfig) => serverConfig.discordServer
  )
  serverConfigs: DiscordServerConfig[];
}
