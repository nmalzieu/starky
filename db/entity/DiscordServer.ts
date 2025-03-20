import { Entity, OneToMany, PrimaryColumn } from "typeorm";

import { DiscordAnalyticsToken } from "./DiscordAnalyticsToken";
import { DiscordMember } from "./DiscordMember";
import { DiscordServerConfig } from "./DiscordServerConfig";

@Entity({
  name: "discord_server",
})
export class DiscordServer {
  @PrimaryColumn()
  id: string;

  @OneToMany(() => DiscordMember, (member) => member.discordServer)
  members: DiscordMember[];

  @OneToMany(() => DiscordServerConfig, (config) => config.discordServer)
  serverConfigs: DiscordServerConfig[];

  @OneToMany(() => DiscordAnalyticsToken, (token) => token.discordServer)
  analyticsTokens: DiscordAnalyticsToken[];
}
