import axios from "axios";
import { validateDashboardToken } from "../../utils/validateDashboardToken";
import { NextApiRequest, NextApiResponse } from "next";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the validateDashboardToken function
jest.mock("../../utils/validateDashboardToken", () => ({
  validateDashboardToken: jest.fn(),
}));

// Mock DB repositories
jest.mock("../../db", () => ({
  setupDb: jest.fn(),
  DiscordServerConfigRepository: {
    findOneBy: jest.fn(),
    save: jest.fn(),
  },
  DiscordServerRepository: {
    findOneBy: jest.fn(),
  },
}));

// Mock handler
import handler from "../../pages/api/guilds/[guildId]/configs/[configId]";

// Mock NextApiRequest and NextApiResponse
const createMockReq = (method: string, query: any = {}, body: any = {}) => {
  return {
    method,
    query,
    body,
  } as unknown as NextApiRequest;
};

const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as NextApiResponse;
};

describe("Config Edit API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if parameters are missing", async () => {
    const req = createMockReq("GET", { guildId: "123" });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Missing or invalid"),
    });
  });

  it("should return 403 if token is invalid", async () => {
    (validateDashboardToken as jest.Mock).mockResolvedValue(false);

    const req = createMockReq("GET", {
      guildId: "123",
      configId: "456",
      token: "invalid-token",
    });
    const res = createMockRes();

    await handler(req, res);

    expect(validateDashboardToken).toHaveBeenCalledWith("123", "invalid-token");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Invalid or expired token"),
    });
  });

  it("should handle GET requests for existing configs", async () => {
    // Mock successful token validation
    (validateDashboardToken as jest.Mock).mockResolvedValue(true);

    // Mock server repository to return a server
    const mockDiscordServer = { id: "123" };
    jest
      .requireMock("../../db")
      .DiscordServerRepository.findOneBy.mockResolvedValue(mockDiscordServer);

    // Mock config repository to return a config
    const mockConfig = {
      id: "456",
      discordServerId: "123",
      starknetNetwork: "mainnet",
      discordRoleId: "789",
      starkyModuleType: "token",
      starkyModuleConfig: { contractAddress: "0x123" },
    };
    jest
      .requireMock("../../db")
      .DiscordServerConfigRepository.findOneBy.mockResolvedValue(mockConfig);

    const req = createMockReq("GET", {
      guildId: "123",
      configId: "456",
      token: "valid-token",
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: "456",
      starknetNetwork: "mainnet",
      discordRoleId: "789",
      starkyModuleType: "token",
      starkyModuleConfig: { contractAddress: "0x123" },
    });
  });

  it("should handle PUT requests to update configs", async () => {
    // Mock successful token validation
    (validateDashboardToken as jest.Mock).mockResolvedValue(true);

    // Mock server repository to return a server
    const mockDiscordServer = { id: "123" };
    jest
      .requireMock("../../db")
      .DiscordServerRepository.findOneBy.mockResolvedValue(mockDiscordServer);

    // Mock config repository to return a config
    const mockConfig = {
      id: "456",
      discordServerId: "123",
      starknetNetwork: "mainnet",
      discordRoleId: "789",
      starkyModuleType: "token",
      starkyModuleConfig: { contractAddress: "0x123" },
    };
    jest
      .requireMock("../../db")
      .DiscordServerConfigRepository.findOneBy.mockResolvedValue(mockConfig);
    jest
      .requireMock("../../db")
      .DiscordServerConfigRepository.save.mockResolvedValue({
        ...mockConfig,
        starknetNetwork: "sepolia",
        starkyModuleConfig: { contractAddress: "0x456" },
      });

    const req = createMockReq(
      "PUT",
      {
        guildId: "123",
        configId: "456",
        token: "valid-token",
      },
      {
        starknetNetwork: "sepolia",
        starkyModuleConfig: { contractAddress: "0x456" },
      }
    );
    const res = createMockRes();

    await handler(req, res);

    expect(
      jest.requireMock("../../db").DiscordServerConfigRepository.save
    ).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        starknetNetwork: "sepolia",
        starkyModuleConfig: { contractAddress: "0x456" },
      })
    );
  });
});
