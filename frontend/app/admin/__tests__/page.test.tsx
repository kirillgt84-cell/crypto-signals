import React from "react"
import { render, screen, waitFor } from "@testing-library/react"

const mockReplace = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

jest.mock("../../context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
  LanguageProvider: ({ children }: any) => <>{children}</>,
}))

jest.mock("../../components/admin/AdminLayout", () => {
  return ({ children }: any) => <div data-testid="admin-layout">{children}</div>
})

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}))

describe("AdminPage", () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  it("redirects non-admin to home", async () => {
    const { useAuth } = require("../../context/AuthContext")
    useAuth.mockReturnValue({
      user: { id: 1, subscription_tier: "pro" },
      isLoading: false,
    })

    const AdminPage = (await import("../page")).default
    render(<AdminPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"))
  })

  it("renders for admin", async () => {
    const { useAuth } = require("../../context/AuthContext")
    useAuth.mockReturnValue({
      user: { id: 1, subscription_tier: "admin" },
      isLoading: false,
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [], stats: {} }),
    })

    const AdminPage = (await import("../page")).default
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByTestId("admin-layout")).toBeInTheDocument())
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
