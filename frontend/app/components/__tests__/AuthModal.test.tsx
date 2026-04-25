import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AuthModal } from "../AuthModal"

const mockLogin = jest.fn()
const mockRegister = jest.fn()
const mockOnClose = jest.fn()
const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}))

describe("AuthModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  it("renders login tab by default", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText("authModal.welcomeBack")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("auth.email")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /common.signIn/i }).length).toBeGreaterThanOrEqual(1)
  })

  it("switches to register tab", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByText("auth.createAccount"))
    expect(screen.getByRole("heading", { name: /authModal.createAccount/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/profile.username/)).toBeInTheDocument()
  })

  it("calls login on submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.change(screen.getByPlaceholderText("auth.email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("auth.password"), { target: { value: "password123" } })
    fireEvent.click(screen.getAllByRole("button", { name: /common.signIn/i }).pop()!)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("a@b.com", "password123")
    })
    expect(mockOnClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/app")
  })

  it("shows error on login failure", async () => {
    mockLogin.mockRejectedValueOnce(new Error("bad creds"))
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    fireEvent.change(screen.getByPlaceholderText("auth.email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("auth.password"), { target: { value: "password123" } })
    fireEvent.click(screen.getAllByRole("button", { name: /common.signIn/i }).pop()!)

    await waitFor(() => {
      expect(screen.getByText("bad creds")).toBeInTheDocument()
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it("calls register on submit in register tab", async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    render(<AuthModal isOpen={true} onClose={mockOnClose} defaultTab="register" />)

    fireEvent.change(screen.getByPlaceholderText("auth.email"), { target: { value: "a@b.com" } })
    fireEvent.change(screen.getByPlaceholderText("auth.password"), { target: { value: "password123" } })
    fireEvent.change(screen.getByPlaceholderText(/profile.username/), { target: { value: "alice" } })
    fireEvent.click(screen.getByRole("button", { name: /authModal.createAccount/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123", "alice")
    })
    expect(mockOnClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/app")
  })
})
