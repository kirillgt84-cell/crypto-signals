import React from "react"
import { render, screen, waitFor } from "@testing-library/react"

const mockUseAuth = jest.fn()

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}))

const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

import { ProtectedRoute } from "../ProtectedRoute"

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows spinner while loading", () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false })
    render(<ProtectedRoute><div>Secret</div></ProtectedRoute>)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true })
    render(<ProtectedRoute><div>Secret Content</div></ProtectedRoute>)
    expect(screen.getByText("Secret Content")).toBeInTheDocument()
  })

  it("redirects when not authenticated", async () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false })
    render(<ProtectedRoute><div>Secret</div></ProtectedRoute>)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/?login=true")
    })
  })
})
