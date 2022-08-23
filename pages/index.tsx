import type { NextPage } from "next";
import Logo from "../components/Logo";
import SocialLinks from "../components/SocialLinks";
import styles from "../styles/Home.module.scss";

const Home: NextPage = () => (
  <div className={styles.home}>
    <Logo />
    <h1>TOKEN-GATE YOUR DISCORD CHANNELS WITH STARKNET ASSETS</h1>
    <a
      href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=268435456&scope=applications.commands%20bot`}
    >
      <h2>install our discord bot</h2>
    </a>
    <SocialLinks />
  </div>
);

export default Home;
