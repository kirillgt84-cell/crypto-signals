import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"

jest.unmock("@/app/context/AuthContext")

import { AuthProvider, useAuth } from "../AuthContext"

const mockOpen = jest.fn()
const originalOpen = window.open

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

// Helper to create a fetch mock that handles multiple calls
function createFetchMock(responses: Array<{ urlMatch: string | RegExp; ok: boolean; json: any }>) {
  return jest.fn((url: string, _opts?: any) => {
    for (const r of responses) {
      const matches = typeof r.urlMatch === "string" ? url.includes(r.urlMatch) : r.urlMatch.test(url)
      if (matches) {
        return Promise.resolve({ ok: r.ok, json: async () => r.json })
      }
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
  })
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(eventListeners).forEach(k => delete eventListeners[k])
    window.open = mockOpen
  })

  afterAll(() => {
    window.open = originalOpen
    window.addEventListener = originalAddEventListener
  })

  it("restores user from /me on mount", async () => {
    const user = { id: 1, username: "alice", email: "a@b.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }

    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: true, json: user },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
    expect(screen.getByTestId("user").textContent).toBe("alice")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me"),
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("logs in successfully", async () => {
    const user = { id: 2, username: "bob", email: "b@c.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/login", ok: true, json: { access_token: "abc", refresh_token: "ref", token_type: "bearer", user } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("login").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("registers successfully", async () => {
    const user = { id: 3, username: "charlie", email: "c@d.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/register", ok: true, json: { access_token: "def", refresh_token: "ref", token_type: "bearer", user } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("register").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
  })

  it("logs out", async () => {
    const user = { id: 1, username: "alice", email: "a@b.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: true, json: user },
      { urlMatch: "/logout", ok: true, json: {} },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))

    await act(async () => {
      screen.getByText("logout").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("no"))
  })

  it("refreshes token", async () => {
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/refresh", ok: true, json: { access_token: "new", token_type: "bearer" } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("refresh").click()
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/refresh"),
      expect.objectContaining({ credentials: "include" })
    ))
  })

  it("handles oauth login via popup", async () => {
    mockOpen.mockReturnValue({})
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/oauth/google", ok: true, json: { auth_url: "https://accounts.google.com?state=xyz" } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("oauth").click()
    })

    await waitFor(() => expect(mockOpen).toHaveBeenCalled())

    await act(async () => {
      eventListeners["message"].forEach(fn =>
        fn({ origin: window.location.origin, data: { type: "OAUTH_SUCCESS", user: { id: 4, username: "dave", email: "d@e.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" } } })
      )
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
    expect(screen.getByTestId("user").textContent).toBe("dave")
  })

  it("handles telegram login", async () => {
    const user = { id: 5, username: "eve", email: "e@f.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/telegram", ok: true, json: { access_token: "tel", refresh_token: "ref", token_type: "bearer", user } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("telegram").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))
  })

  it("ignores messages from other origins", async () => {
    mockOpen.mockReturnValue({})
    const fetchMock = createFetchMock([
      { urlMatch: "/me", ok: false, json: {} },
      { urlMatch: "/oauth/google", ok: true, json: { auth_url: "https://accounts.google.com?state=xyz" } },
    ])
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))
    await act(async () => { screen.getByText("oauth").click() })

    await act(async () => {
      eventListeners["message"].forEach(fn =>
        fn({ origin: "https://evil.com", data: { type: "OAUTH_SUCCESS", user: { id: 6, username: "evil", email: "evil@evil.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" } } })
      )
    })

    expect(screen.getByTestId("auth").textContent).toBe("no")
  })

  it("sends credentials: 'include' on login without Authorization header", async () => {
    const user = { id: 2, username: "bob", email: "b@c.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "abc", refresh_token: "ref", token_type: "bearer", user }),
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("login").click()
    })

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))

    const loginCall = fetchMock.mock.calls.find((call: any) => call[0].includes("/login"))
    expect(loginCall).toBeDefined()
    expect(loginCall[1]).toMatchObject({ credentials: "include" })
    expect(loginCall[1].headers).toBeUndefined()
    expect(loginCall[1].headers?.Authorization).toBeUndefined()
  })

  it("sends credentials: 'include' on init /me check", async () => {
    const user = { id: 1, username: "alice", email: "a@b.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => user,
    })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))

    const meCall = fetchMock.mock.calls.find((call: any) => call[0].includes("/me"))
    expect(meCall).toBeDefined()
    expect(meCall[1]).toMatchObject({ credentials: "include" })
    expect(meCall[1].headers?.Authorization).toBeUndefined()
  })

  it("sends credentials: 'include' on logout", async () => {
    const user = { id: 1, username: "alice", email: "a@b.com", avatar_url: null, is_email_verified: true, subscription_tier: "free" }
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => user })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("auth").textContent).toBe("yes"))

    await act(async () => {
      screen.getByText("logout").click()
    })

    const logoutCall = fetchMock.mock.calls.find((call: any) => call[0].includes("/logout"))
    expect(logoutCall).toBeDefined()
    expect(logoutCall[1]).toMatchObject({ credentials: "include" })
  })

  it("sends credentials: 'include' on refresh token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock as any

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"))

    await act(async () => {
      screen.getByText("refresh").click()
    })

    const refreshCall = fetchMock.mock.calls.find((call: any) => call[0].includes("/refresh"))
    expect(refreshCall).toBeDefined()
    expect(refreshCall[1]).toMatchObject({ credentials: "include", method: "POST" })
    expect(refreshCall[1].headers?.Authorization).toBeUndefined()
  })
})
