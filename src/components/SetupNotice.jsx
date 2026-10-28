/** Tampil bila file .env.local belum diisi, supaya tidak muncul layar putih yang membingungkan. */
export default function SetupNotice() {
  return (
    <main className="setup">
      <h1 className="display">Firebase is not <em>set up</em></h1>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values from the Firebase Console
        (Project settings &gt; Your apps &gt; Web app), then restart <code>npm run dev</code>.
      </p>
      <p className="fine">Full steps are in the README under &quot;Setup&quot;.</p>
    </main>
  );
}
