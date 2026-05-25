- [x] Inspect current dashboard routing + service contract
- [x] Update backend/dashboard/routes.py to expose Django endpoint for GET /api/dashboard/summary

- [x] Ensure response shape matches frontend expectation
- [x] Fix DocumentRecord/DocumentVersion model mismatch causing `doc_id` resolution failure



- [ ] (Optional) Wire other dashboard endpoints if dashboard page later requests them
- [ ] Run backend and verify GET /api/dashboard/summary returns 200 + valid JSON (currently blocked by response test command issues)

- [x] Reload frontend dashboard page and confirm data loads



