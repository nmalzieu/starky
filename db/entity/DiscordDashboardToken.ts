import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from "typeorm";
  
  @Entity({ name: "discord_dashboard_token" })
  export class DiscordDashboardToken {
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
  
    @ManyToOne("discord_server", "discord_dashboard_token")
    discordServer: any;
  }
  