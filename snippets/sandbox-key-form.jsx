/*
 * Sandbox registration form.
 *
 * Talks to the Sandbox deployment only. The base URL is a constant rather than a
 * prop so that no page can point this form at Production by passing a different
 * value: Production keys are issued through a reviewed request, never a form.
 *
 * Registration is all this page does. The key itself is issued and displayed by
 * the verification link, once, so no plaintext key ever passes through the docs
 * site and there is no registration token for a reader to keep or paste.
 *
 * Everything lives inside the exported component on purpose. Mintlify evaluates
 * the exported component alone, so module-level bindings are not in scope at
 * render time, and it allows local imports only, so "react" cannot be imported
 * for useState. Hence an uncontrolled form that updates its own nodes.
 */

export const SandboxRegistrationForm = () => {
  const SANDBOX_BASE_URL = "https://web-api.dev.soxai.site";

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

  /* The API answers 400 with a list of validation errors and other statuses with
   * a string, so both shapes reach the reader as one line instead of
   * "[object Object]". */
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

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("[data-sandbox=submit]");
    const message = form.querySelector("[data-sandbox=message]");
    const email = form.querySelector("[data-sandbox=email]").value;
    const role = form.querySelector("[data-sandbox=role]").value;

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    message.textContent = "";

    try {
      const body = await request("/sandbox/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      message.style.color = "inherit";
      message.textContent = `${
        (body && body.message) || "Check your email."
      } Open the link in that email to see your API key. The key is shown once and cannot be retrieved later.`;
    } catch (requestError) {
      message.style.color = "#c0392b";
      message.textContent = requestError.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send my API key";
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
          data-sandbox="email"
          placeholder="developer@example.com"
        />
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <span style={label}>Role</span>
        <select style={field} data-sandbox="role" defaultValue="user">
          <option value="user">user - read one individual's own data</option>
          <option value="orgadmin">orgadmin - read a demo organization</option>
        </select>
        <p style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: "0.4rem" }}>
          The role is fixed for this identity. Register a second address to try
          the other one.
        </p>
      </div>
      <button style={button} type="submit" data-sandbox="submit">
        Send my API key
      </button>
      <p style={{ marginTop: "0.75rem" }} data-sandbox="message"></p>
    </form>
  );
};
