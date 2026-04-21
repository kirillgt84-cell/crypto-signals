import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ProfilePage from "../page"

const mockUpdateProfile = jest.fn()
const mockUpdatePreferences = jest.fn()
const mockChangePassword = jest.fn()
const mockRefreshUser = jest.fn()

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: "test@test.com",
      username: "testuser",
      avatar_url: null,
      is_email_verified: true,
      subscription_tier: "free",
      preferences: {
        theme: "dark",
        language: "en",
        notifications_enabled: true,
        daily_report: false,
        weekly_report: false,
        telegram_alerts: false,
      },
      connected_oauth: ["google"],
    },
    isLoading: false,
    isPro: false,
    updateProfile: mockUpdateProfile,
    updatePreferences: mockUpdatePreferences,
    changePassword: mockChangePassword,
    refreshUser: mockRefreshUser,
  }),
}))

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: jest.fn() }),
}))

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders profile sidebar and default content", () => {
    render(<ProfilePage />)
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Security/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Preferences/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Subscription/i })).toBeInTheDocument()

    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument()
    expect(screen.getByText("test@test.com")).toBeInTheDocument()
    expect(screen.getByText("Verified")).toBeInTheDocument()
    expect(screen.getByText("google")).toBeInTheDocument()
  })

  it("updates profile on save", async () => {
    mockUpdateProfile.mockResolvedValue(undefined)
    render(<ProfilePage />)
    const input = screen.getByDisplayValue("testuser")
    fireEvent.change(input, { target: { value: "newname" } })
    fireEvent.click(screen.getByRole("button", { name: /common.save/i }))
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ username: "newname", avatar_url: null })
    })
  })
})
