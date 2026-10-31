export default function ForgotPassword() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Reset password</h1>
        <p>
          Password recovery must be configured with a verified email provider
          before production use.
        </p>
        <a href="/login">Back to sign in</a>
      </section>
    </main>
  );
}
