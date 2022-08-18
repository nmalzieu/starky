import { Entity, Column, PrimaryColumn, OneToMany } from "typeorm";
import type { StarkcordModuleConfig } from "../../starkcordModules/types";
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
  starkcordModuleType: "erc721";

  @Column("jsonb", { nullable: false, default: {} })
  starkcordModuleConfig: StarkcordModuleConfig;

  @OneToMany((type) => DiscordMember, (member) => member.discordServer)
  members: DiscordMember[];
}
