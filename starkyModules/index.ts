import { StarkyModules } from "../types/starkyModules";

import * as erc721 from "./erc721";
import * as erc721Metadata from "./erc721Metadata";
import * as walletDetector from "./walletDetector";

const modules: StarkyModules = {
  erc721,
  erc721Metadata,
  walletDetector,
};

export default modules;
