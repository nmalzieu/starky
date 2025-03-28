import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "discord_analytics_token" })
export class DiscordAnalyticsToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamptz" }) // Use UTC timestamps
  expiresAt: Date;

  @ManyToOne("DiscordServer", "analyticsTokens")
  discordServer: any;
}
