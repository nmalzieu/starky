import { DiscordMember } from "../db/entity/DiscordMember";

export type BlockMember = {
  contractAddress: string;
  discordMember: DiscordMember;
};
