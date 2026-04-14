import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "../AuthContext"

const mockOpen = jest.fn()
const originalOpen = window.open

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()

Object.defineProperty(global, "localStorage", { value: localStorageMock })

const eventListeners: Record<string, ((e: any) => void)[]> = {}
const originalAddEventListener = window.addEventListener
window.addEventListener = jest.fn((type: string, listener: any) => {
  if (!eventListeners[type]) eventListeners[type] = []
  eventListeners[type].push(listener)
})

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.username : "null"}</span>
      <span data-testid="auth">{auth.isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="loading">{auth.isLoading ? "yes" : "no"}</span>
      <button onClick={() => auth.login("u", "p")}>login</button>
      <button onClick={() => auth.register("u", "p")}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.refreshToken()}>refresh</button>
      <button onClick={() => auth.loginWithOAuth("google")}>oauth</button>
      <button onClick={() => auth.loginWithTelegram({ id: 1, username: "u" } as any)}>telegram</button>
    </div>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    Object.keys(eventListeners).forEach(k => delete eventListeners[k])
    window.open = mockOpen
  })

  afterAll(() => {
    window.open = originalOpen
    window.addEventListener = originalAddEventListener
  })

  it("restores user from localStorage on mount", async () => {
    const user = { id: 1, username: "alice", email: "a@b.com", avatar_url: null, is_email_verified: true }
    localStorageMock.setItem("access_token", "tok123")
    localStorageMock.setItem("refresh_token", "ref123")

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => user,
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
    expect(screen.getByTestId("user").textContent).toBe("alice")
  })

  it("logs in successfully", async () => {
    const user = { id: 2, username: "bob", email: "b@c.com", avatar_url: null, is_email_verified: true }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "abc", refresh_token: "ref", token_type: "bearer", user }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("login").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
    expect(localStorageMock.setItem).toHaveBeenCalledWith("access_token", "abc")
  })

  it("registers successfully", async () => {
    const user = { id: 3, username: "charlie", email: "c@d.com", avatar_url: null, is_email_verified: true }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "def", refresh_token: "ref", token_type: "bearer", user }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("register").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
  })

  it("logs out", async () => {
    localStorageMock.setItem("access_token", "tok")
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("logout").click()
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("access_token")
    expect(screen.getByTestId("auth").textContent).toBe("no")
  })

  it("refreshes token", async () => {
    localStorageMock.setItem("refresh_token", "ref")
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "new", token_type: "bearer" }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("refresh").click()
    })

    await waitFor(() => expect(localStorageMock.setItem).toHaveBeenCalledWith("access_token", "new"))
  })

  it("handles oauth login via popup", async () => {
    mockOpen.mockReturnValue({})
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ auth_url: "https://accounts.google.com?state=xyz" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "pop", refresh_token: "ref", user: { id: 4, username: "dave", email: "d@e.com", avatar_url: null, is_email_verified: true } }),
      })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("oauth").click()
    })

    await waitFor(() => expect(mockOpen).toHaveBeenCalled())

    await act(async () => {
      eventListeners["message"].forEach(fn =>
        fn({ origin: window.location.origin, data: { type: "OAUTH_SUCCESS", provider: "google", code: "c" } })
      )
    })
  })

  it("handles telegram login", async () => {
    const user = { id: 5, username: "eve", email: "e@f.com", avatar_url: null, is_email_verified: true }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "tel", refresh_token: "ref", token_type: "bearer", user }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await act(async () => {
      screen.getByText("telegram").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
  })

  it("ignores messages from other origins", async () => {
    mockOpen.mockReturnValue({})
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ auth_url: "https://accounts.google.com?state=xyz" }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await act(async () => { screen.getByText("oauth").click() })

    await act(async () => {
      eventListeners["message"].forEach(fn =>
        fn({ origin: "https://evil.com", data: { type: "OAUTH_SUCCESS", provider: "google", code: "c" } })
      )
    })

    expect(screen.getByTestId("auth").textContent).toBe("no")
  })
})
