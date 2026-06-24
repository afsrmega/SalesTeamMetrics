# GitHub Pages adaptation notes

This ZIP was adapted for the SalesTeamMetrics GitHub Pages deployment.

Changes applied:

- `vite.config.js`: added/ensured `base: './'` for GitHub Pages asset loading.
- `src/main.jsx`: changed `BrowserRouter` to `HashRouter` for GitHub Pages route refresh compatibility.
- Supabase references: replaced the previous project with the current project `wvodcaxnrybfcnenccad`.
- `src/lib/customSupabaseClient.js`: updated to the new Supabase URL and anon public key.
- `src/components/SalesMemberDashboard.jsx`: updated the profile-photo function URL fallback and added frontend protection to prevent deleting the admin account.

After copying this content into `new2`, run:

```bash
cd new2
npm install
npm run build
cd ..
git add new2
git commit -m "Update frontend from Horizons"
git push origin main
```
