# TODO - Faculty Dashboard Fix (142 issues)

## Step 1: Fix HTML structure (facultyDashboardNew2.html)
- [ ] Repair malformed notification dropdown markup (remove stray `olumn;overflow:hidden;` etc.)
- [ ] Remove duplicate/invalid inline style lines in top header container
- [ ] Ensure elements referenced by scripts exist (e.g., `facNotifWrap` if used)

## Step 2: Fix JS structure and IDs (public/js/faculty.js)
- [ ] Remove duplicate `showTab()` definition so correct one runs
- [ ] Align JS IDs with HTML IDs: filterEventReg/filterEventAtt/filterEventCert, registrationTableContainer, etc.
- [ ] Ensure attendance table renders with correct columns and correct dropdown filtering

## Step 3: Fix registrations/attendance logic for all rows
- [ ] Ensure `filterRegistrations()` uses correct selected event id and correct tbody rendering
- [ ] Ensure `filterAttendance()` uses correct selected event id and correct attended subset

## Step 4: Fix score saving for all attended students
- [ ] Ensure `saveAllScores()` loops over rendered attended students for selected event
- [ ] Ensure score inputs are found by correct id and score range validations

## Step 5: Fix certificate upload/delete
- [ ] Ensure `filterCertificates()` loads attended students for selected event
- [ ] Ensure uploadCertificate/deleteCertificate correctly updates DOM and in-memory state

## Step 6: Fix report download
- [ ] Ensure `downloadEventReport()` reads the correct columns/status for all registrations

## Step 7: Testing
- [ ] Open facultyDashboardNew2.html
- [ ] Verify each tab works for multiple events (especially those with many registrations)
- [ ] Validate 142 problem cases: registrations list, attendance list, scoring, certificates, report


