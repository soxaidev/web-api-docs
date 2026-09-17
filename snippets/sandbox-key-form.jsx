/*
 * Sandbox API key form.
 *
 * Talks to the Sandbox deployment only. The base URL is a constant rather than a
 * prop so that no page can point this form at Production by passing a different
 * value: Production keys are issued through a reviewed request, never a form.
 */

import { useState } from "react";

export const SANDBOX_BASE_URL = "https://web-api.dev.soxai.site";

const box = {
  border: "1px solid rgba(128,128,128,0.35)",
  borderRadius: "10px",
  padding: "1rem",
  marginTop: "1rem",
};

const field = {
  width: "100%",
  padding: "0.5rem 0.65rem",
  border: "1px solid rgba(128,128,128,0.45)",
  borderRadius: "6px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  boxSizing: "border-box",
};

const button = {
  padding: "0.5rem 1rem",
  border: "1px solid rgba(128,128,128,0.45)",
  borderRadius: "6px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const label = {
  display: "block",
  fontSize: "0.85rem",
  opacity: 0.8,
  marginBottom: "0.25rem",
};

const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.85rem",
  wordBreak: "break-all",
};

/* The API answers 400 with a list of validation errors and other statuses with a
 * string, so both shapes reach the reader as one line instead of "[object Object]". */
const describeError = (status, detail) => {
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item.msg || JSON.stringify(item));
    return `${status}: ${messages.join(", ")}`;
  }
  if (typeof detail === "string" && detail.length > 0) {
    return `${status}: ${detail}`;
  }
  return `${status}: request failed`;
};

const request = async (path, options) => {
  let response;
  try {
    response = await fetch(`${SANDBOX_BASE_URL}${path}`, options);
  } catch (error) {
    throw new Error(
      "Could not reach the Sandbox API. Check your network and try again.",
    );
  }
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      body = null;
    }
  }
  if (!response.ok) {
    throw new Error(describeError(response.status, body && body.detail));
  }
  return body;
};

/* list_for_owner() returns expired keys alongside live ones and marks only the
 * revoked ones, so expiry is derived here from created_at plus expires days. */
const keyStatus = (item) => {
  if (item.revoked_at) {
    return "revoked";
  }
  const created = Date.parse(item.created_at);
  if (Number.isNaN(created) || typeof item.expires !== "number") {
    return "active";
  }
  const expiresAt = created + item.expires * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt ? "expired" : "active";
};

/* The reader arrives here with the whole verification URL in the clipboard more
 * often than with the token alone, so accept either and take the last non-empty
 * segment. A trailing slash and a trailing query or fragment are both tolerated. */
const extractToken = (value) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  const segments = withoutQuery.split("/").filter((segment) => segment.length > 0);
  return segments.length === 0 ? "" : segments[segments.length - 1];
};

export const SandboxRegistrationForm = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const body = await request("/sandbox/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      setStatus((body && body.message) || "Check your email.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form style={box} onSubmit={submit}>
      <div style={{ marginBottom: "0.75rem" }}>
        <span style={label}>Email address</span>
        <input
          style={field}
          type="email"
          required
          value={email}
          placeholder="developer@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <span style={label}>Role</span>
        <select
          style={field}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="user">user - read one individual's own data</option>
          <option value="orgadmin">orgadmin - read a demo organization</option>
        </select>
        <p style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: "0.4rem" }}>
          The role is fixed for this identity. Register a second address to try the
          other one.
        </p>
      </div>
      <button style={button} type="submit" disabled={busy}>
        {busy ? "Sending..." : "Send verification email"}
      </button>
      {status && (
        <p style={{ marginTop: "0.75rem" }}>
          {status} Open the link in that email to see your API key. The key is shown
          once and cannot be retrieved later.
        </p>
      )}
      {error && (
        <p style={{ marginTop: "0.75rem", color: "#c0392b" }}>{error}</p>
      )}
    </form>
  );
};

export const SandboxKeyManager = () => {
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState("");
  const [keys, setKeys] = useState(null);
  const [labelInput, setLabelInput] = useState("");
  const [issuedKey, setIssuedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const authHeaders = (value) => ({ "sandbox-registration-token": value });

  const load = async (value) => {
    const body = await request("/sandbox/api-keys", {
      method: "GET",
      headers: authHeaders(value),
    });
    setKeys((body && body.api_keys) || []);
  };

  const connect = async (event) => {
    event.preventDefault();
    const value = extractToken(tokenInput);
    if (value.length === 0) {
      setError("Paste the verification link or the token it contains.");
      return;
    }
    setBusy(true);
    setError(null);
    setIssuedKey(null);
    setCopied(false);
    try {
      await load(value);
      setToken(value);
    } catch (requestError) {
      setError(requestError.message);
      setToken("");
      setKeys(null);
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = await request("/sandbox/api-keys", {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelInput.trim() || null }),
      });
      setIssuedKey(body && body.api_key);
      setCopied(false);
      setLabelInput("");
      await load(token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  /* Clipboard access can be refused (permission, or a non-secure context), so the
   * key stays on screen and the reader is told to copy it by hand instead. */
  const copyIssuedKey = async () => {
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
    } catch (copyError) {
      setCopied(false);
      setError("Could not copy to the clipboard. Select the key above and copy it manually.");
    }
  };

  const revoke = async (keyId) => {
    setBusy(true);
    setError(null);
    try {
      await request(`/sandbox/api-keys/${keyId}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      await load(token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={box}>
      <form onSubmit={connect}>
        <span style={label}>Verification link or registration token</span>
        <input
          style={field}
          type="text"
          value={tokenInput}
          placeholder={`${SANDBOX_BASE_URL}/sandbox/registrations/verify/...`}
          onChange={(event) => setTokenInput(event.target.value)}
        />
        <p style={{ fontSize: "0.8rem", opacity: 0.75, margin: "0.4rem 0 0.75rem" }}>
          Copy the link from your registration email. It stays valid for 60 minutes
          after the email is sent. Register again to get a new one.
        </p>
        <button style={button} type="submit" disabled={busy}>
          {busy ? "Working..." : "Show my keys"}
        </button>
      </form>

      {error && <p style={{ marginTop: "0.75rem", color: "#c0392b" }}>{error}</p>}

      {keys && (
        <div style={{ marginTop: "1.25rem" }}>
          {keys.length === 0 ? (
            <p>This registration has no keys yet.</p>
          ) : (
            <table style={{ width: "100%", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Key ID</th>
                  <th style={{ textAlign: "left" }}>Label</th>
                  <th style={{ textAlign: "left" }}>Created</th>
                  <th style={{ textAlign: "left" }}>Valid for</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((item) => (
                  <tr key={item.key_id}>
                    <td style={mono}>{item.key_id}</td>
                    <td>{item.label || "-"}</td>
                    <td>{String(item.created_at || "").slice(0, 10)}</td>
                    <td>{item.expires ? `${item.expires} days` : "-"}</td>
                    <td>{keyStatus(item)}</td>
                    <td style={{ textAlign: "right" }}>
                      {keyStatus(item) === "active" && (
                        <button
                          style={button}
                          type="button"
                          disabled={busy}
                          onClick={() => revoke(item.key_id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: "1rem" }}>
            <span style={label}>Label for a new key (optional)</span>
            <input
              style={field}
              type="text"
              value={labelInput}
              placeholder="local-development"
              onChange={(event) => setLabelInput(event.target.value)}
            />
            <button
              style={{ ...button, marginTop: "0.6rem" }}
              type="button"
              disabled={busy}
              onClick={issue}
            >
              {busy ? "Working..." : "Issue a new key"}
            </button>
          </div>
        </div>
      )}

      {issuedKey && (
        <div style={{ ...box, marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            Copy this key now. It is not shown again.
          </p>
          <p style={{ ...mono, marginTop: "0.5rem" }}>{issuedKey}</p>
          <button style={button} type="button" onClick={copyIssuedKey}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
};
