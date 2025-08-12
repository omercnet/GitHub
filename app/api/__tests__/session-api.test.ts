import { GET, DELETE } from "../session/route";

// Mock iron-session
jest.mock("iron-session", () => ({
  getIronSession: jest.fn(),
}));

// Mock Next.js cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({}),
}));

// Mock octokit
const mockOctokit = {
  request: jest.fn(),
};
jest.mock("@/app/lib/octokit", () => ({
  createOctokit: () => mockOctokit,
}));

describe("/api/session API", () => {
  let mockSession: {
    token?: string;
    user?: { login: string };
    save: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(() => {
    mockSession = {
      token: "test-token",
      user: { login: "testuser" },
      save: jest.fn(),
      destroy: jest.fn(),
    };

    const { getIronSession } = require("iron-session");
    getIronSession.mockResolvedValue(mockSession);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it("validates valid session on GET", async () => {
    mockOctokit.request.mockResolvedValue({
      data: { login: "testuser", avatar_url: "http://avatar.com" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(true);
  });

  it("handles logout on DELETE", async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mockSession.destroy).toHaveBeenCalled();

    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
