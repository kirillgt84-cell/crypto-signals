import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AuthModal } from "../AuthModal"

const mockLogin = jest.fn()
const mockRegister = jest.fn()
const mockOAuth = jest.fn()
const mockTelegram = jest.fn()
const mockOnClose = jest.fn()

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    loginWithOAuth: mockOAuth,
    loginWithTelegram: mockTelegram,
  }),
}))

describe("AuthModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders login tab by default", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText("Welcome Back")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("switches to register tab", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByText("Register"))
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Username (optional)")).toBeInTheDocument()
  })

  it("calls login on submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("a@b.com", "password123")
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("shows error on login failure", async () => {
    mockLogin.mockRejectedValueOnce(new Error("bad creds"))
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText("bad creds")).toBeInTheDocument()
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it("calls register on submit in register tab", async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    render(<AuthModal isOpen={true} onClose={mockOnClose} defaultTab="register" />)

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } })
    fireEvent.change(screen.getByPlaceholderText("Username (optional)"), { target: { value: "alice" } })
    fireEvent.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123", "alice")
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it("triggers oauth for google, twitter, discord", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.click(screen.getByText("Google"))
    expect(mockOAuth).toHaveBeenCalledWith("google")

    fireEvent.click(screen.getByText("Twitter"))
    expect(mockOAuth).toHaveBeenCalledWith("twitter")

    fireEvent.click(screen.getByText("Discord"))
    expect(mockOAuth).toHaveBeenCalledWith("discord")
  })

  it("opens telegram bot link on click", () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.click(screen.getByText("Telegram"))
    expect(openSpy).toHaveBeenCalledWith(
      "https://t.me/your_bot_username?start=auth",
      "_blank",
      "width=400,height=600"
    )
    openSpy.mockRestore()
  })
})
