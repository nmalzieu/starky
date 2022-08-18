import { AppDataSource } from "./data-source";
import { DiscordMember } from "./entity/DiscordMember";
import { DiscordServer } from "./entity/DiscordServer";

export const setupDb = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  // console.log("Inserting a new user into the database...");
  // const user = new User();
  // user.firstName = "Timber";
  // user.lastName = "Saw";
  // user.age = 25;
  // await AppDataSource.manager.save(user);
  // console.log("Saved a new user with id: " + user.id);

  // console.log("Loading users from the database...");
  // const users = await AppDataSource.manager.find(User);
  // console.log("Loaded users: ", users);

  // console.log(
  //   "Here you can setup and run express / fastify / any other framework."
  // );
};

export const DiscordServerRepository =
  AppDataSource.getRepository(DiscordServer);
export const DiscordMemberRepository =
  AppDataSource.getRepository(DiscordMember);
