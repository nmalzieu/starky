import { StarkyModules } from "../types/starkyModules";

import * as erc20 from "./erc20";
import * as erc721 from "./erc721";
import * as erc721Metadata from "./erc721Metadata";
import * as walletDetector from "./walletDetector";

const modules: StarkyModules = {
  erc20,
  erc721,
  erc721Metadata,
  walletDetector,
};

export default modules;
