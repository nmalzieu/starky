import { Entity, OneToMany, PrimaryColumn } from "typeorm";

import { DiscordMember } from "./DiscordMember";
import { DiscordServerConfig } from "./DiscordServerConfig";

@Entity({
  name: "discord_server",
})
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

  @OneToMany("discord_analytics_token", "discord_server")
  analyticsTokens: any;
}
